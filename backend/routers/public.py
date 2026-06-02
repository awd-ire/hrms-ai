from datetime import date
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from core.dependencies import get_optional_current_user
from core.voice_upload import save_audio_file
from database import get_db
from models.recruitment import Interview
from schemas.public import (
    PublicCandidateApplyResponse,
    PublicCandidateInterviewResponse,
    PublicCandidateStatusResponse,
    PublicJobPostingResponse,
)
from schemas.ai import LiveInterviewStartRequest, LiveInterviewStartResponse, LiveInterviewTurnResponse
from schemas.recruitment import CandidateCreate, CandidateStageUpdate, InterviewCreate
from services.ai_service import AIService
from services.recruitment_service import RecruitmentService

router = APIRouter(
    prefix="/api/public",
    tags=["Public Candidate Portal"],
)

LIVE_INTERVIEW_SESSIONS: dict[str, dict] = {}


def _check_candidate_access(candidate, email: str) -> None:
    if not candidate or candidate.email.lower() != email.lower():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )


def _build_candidate_context(candidate, db: Session) -> dict:
    latest_interview = (
        db.query(Interview)
        .filter(Interview.candidate_id == candidate.id)
        .order_by(Interview.created_at.desc(), Interview.id.desc())
        .first()
    )
    resume_analysis = {}
    if candidate.resume_path:
        try:
            resume_analysis = AIService.screen_existing_resume(candidate.resume_path)
        except Exception:
            resume_analysis = {}
    return {
        "candidate": {
            "id": candidate.id,
            "full_name": candidate.full_name,
            "email": candidate.email,
            "experience_years": candidate.experience_years,
            "current_company": candidate.current_company,
            "current_role": candidate.current_role,
            "stage": candidate.stage,
        },
        "resume_analysis": resume_analysis,
        "latest_interview": {
            "id": latest_interview.id if latest_interview else None,
            "round": latest_interview.interview_round if latest_interview else None,
            "status": latest_interview.status if latest_interview else None,
        },
    }


@router.get("/jobs", response_model=list[PublicJobPostingResponse])
def list_public_jobs(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    return [
        job
        for job in RecruitmentService.list_job_postings(db)
        if job.status == "open"
    ]


@router.post("/apply", response_model=PublicCandidateApplyResponse, status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_posting_id: int = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(default=None),
    experience_years: float = Form(default=0),
    current_company: str | None = Form(default=None),
    current_role: str | None = Form(default=None),
    applied_date: date = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = await resume.read()

    try:
        resume_path = RecruitmentService.save_resume_file(
            resume.filename or "resume.pdf",
            content,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    payload = CandidateCreate(
        job_posting_id=job_posting_id,
        full_name=full_name,
        email=email,
        phone=phone,
        resume_path=resume_path,
        experience_years=experience_years,
        current_company=current_company,
        current_role=current_role,
        applied_date=applied_date,
    )

    try:
        candidate = RecruitmentService.create_candidate(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return PublicCandidateApplyResponse(candidate=candidate, interview=None)


@router.get("/candidates/{candidate_id}", response_model=PublicCandidateStatusResponse)
def view_candidate_status(
    candidate_id: int,
    email: str,
    db: Session = Depends(get_db),
):
    candidate = RecruitmentService.get_candidate(db, candidate_id)
    _check_candidate_access(candidate, email)

    latest_interview = (
        db.query(Interview)
        .filter(Interview.candidate_id == candidate_id)
        .order_by(Interview.created_at.desc(), Interview.id.desc())
        .first()
    )

    latest_result = None
    if candidate.ai_score is not None or candidate.ai_summary:
        latest_result = {
            "ai_score": candidate.ai_score,
            "ai_summary": candidate.ai_summary,
            "stage": candidate.stage,
        }

    return PublicCandidateStatusResponse(
        candidate=candidate,
        interview=latest_interview,
        latest_result=latest_result,
    )


@router.post("/interview", response_model=PublicCandidateInterviewResponse)
async def conduct_public_interview(
    candidate_id: int = Form(...),
    email: str = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    candidate = RecruitmentService.get_candidate(db, candidate_id)
    _check_candidate_access(candidate, email)

    content = await audio.read()
    try:
        audio_path = save_audio_file(audio.filename or "recording.webm", content)
        transcript_result = AIService.transcribe_voice(audio_path)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    transcript = transcript_result.get("transcript", "")
    resume_analysis = AIService.screen_existing_resume(candidate.resume_path)
    interview_chat = AIService.interview_chat(
        transcript,
        context={
            "candidate": {"id": candidate.id, "full_name": candidate.full_name},
            "resume_analysis": resume_analysis,
        },
    )
    evaluation = AIService.evaluate_interview(
        transcript,
        resume_analysis.get("summary") if isinstance(resume_analysis, dict) else None,
    )

    RecruitmentService.update_candidate_ai_results(
        db,
        candidate_id,
        evaluation.get("score", 0),
        evaluation.get("summary", ""),
    )

    next_stage = evaluation.get("next_stage")
    if next_stage:
        try:
            RecruitmentService.update_candidate_stage(
                db,
                candidate_id,
                CandidateStageUpdate(stage=next_stage),
            )
        except Exception:
            pass

    interview = (
        db.query(Interview)
        .filter(Interview.candidate_id == candidate_id)
        .order_by(Interview.created_at.desc(), Interview.id.desc())
        .first()
    )

    if not interview:
        interview = RecruitmentService.create_interview(
            db,
            InterviewCreate(
                candidate_id=candidate_id,
                interviewer_id=None,
                interview_round="public-ai",
                scheduled_date=date.today(),
                status="completed",
            ),
        )

    return PublicCandidateInterviewResponse(
        transcript=transcript,
        interview_chat=interview_chat,
        evaluation=evaluation,
        candidate=candidate,
        interview=interview,
    )


@router.post("/interview/live/start", response_model=LiveInterviewStartResponse)
def start_live_interview(
    payload: LiveInterviewStartRequest,
    db: Session = Depends(get_db),
):
    candidate = RecruitmentService.get_candidate(db, payload.candidate_id)
    _check_candidate_access(candidate, payload.email)

    session_id = str(uuid4())
    context = _build_candidate_context(candidate, db)
    first_question = AIService.generate_interview_question(
        {
            **context,
            "turn": 1,
            "instruction": "Ask the opening interview question.",
        }
    )

    LIVE_INTERVIEW_SESSIONS[session_id] = {
        "candidate_id": candidate.id,
        "email": candidate.email,
        "round_number": 1,
        "conversation": [
            {"role": "assistant", "content": first_question.get("question", "")}
        ],
        "context": context,
    }

    return LiveInterviewStartResponse(
        session_id=session_id,
        candidate_id=candidate.id,
        question=first_question.get("question", ""),
        round_number=1,
        transcript=None,
        conversation=LIVE_INTERVIEW_SESSIONS[session_id]["conversation"],
    )


@router.post("/interview/live/{session_id}", response_model=LiveInterviewTurnResponse)
async def continue_live_interview(
    session_id: str,
    candidate_id: int = Form(...),
    email: str = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    session = LIVE_INTERVIEW_SESSIONS.get(session_id)
    candidate = RecruitmentService.get_candidate(db, candidate_id)
    _check_candidate_access(candidate, email)
    if not session or session.get("candidate_id") != candidate_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

    content = await audio.read()
    try:
        audio_path = save_audio_file(audio.filename or "recording.webm", content)
        transcript_result = AIService.transcribe_voice(audio_path)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    transcript = transcript_result.get("transcript", "")
    session["conversation"].append({"role": "candidate", "content": transcript})
    session["round_number"] += 1

    turn_context = {
        **session["context"],
        "round_number": session["round_number"],
        "conversation": session["conversation"],
        "instruction": "Generate a single follow-up interview question and short guidance.",
    }
    interview_chat = AIService.interview_chat(transcript, context=turn_context)
    evaluation = AIService.evaluate_interview_turn(transcript, context=turn_context)
    if not isinstance(evaluation, dict):
        evaluation = {"score": 0, "summary": "Evaluation unavailable", "recommendation": "", "next_stage": "hold", "completed": False}

    next_question_payload = AIService.generate_interview_question(
        {
            **turn_context,
            "last_answer": transcript,
            "evaluation": evaluation,
            "instruction": "Ask the next interview question unless the interview should end.",
        }
    )

    completed = bool(evaluation.get("completed")) or session["round_number"] >= 5
    if completed:
        next_question = None
    else:
        next_question = next_question_payload.get("question", "")
        session["conversation"].append({"role": "assistant", "content": next_question})

    RecruitmentService.update_candidate_ai_results(
        db,
        candidate_id,
        evaluation.get("score", 0),
        evaluation.get("summary", ""),
    )

    next_stage = evaluation.get("next_stage")
    if next_stage:
        try:
            RecruitmentService.update_candidate_stage(
                db,
                candidate_id,
                CandidateStageUpdate(stage=next_stage),
            )
        except Exception:
            pass

    interview = (
        db.query(Interview)
        .filter(Interview.candidate_id == candidate_id)
        .order_by(Interview.created_at.desc(), Interview.id.desc())
        .first()
    )
    if not interview:
        interview = RecruitmentService.create_interview(
            db,
            InterviewCreate(
                candidate_id=candidate_id,
                interviewer_id=None,
                interview_round="live-ai",
                scheduled_date=date.today(),
                status="completed" if completed else "in_progress",
            ),
        )

    if completed:
        session["completed"] = True

    return LiveInterviewTurnResponse(
        session_id=session_id,
        candidate_id=candidate_id,
        question=next_question,
        round_number=session["round_number"],
        transcript=transcript,
        reply=interview_chat.get("reply", ""),
        follow_up_questions=interview_chat.get("follow_up_questions", []),
        evaluation=evaluation,
        completed=completed,
        conversation=session["conversation"],
    )
