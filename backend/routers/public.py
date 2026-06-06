from datetime import date
from uuid import uuid4
from typing import Optional
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from core.dependencies import get_optional_current_user
from core.audit_logger import log_ai_interview_event
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
from schemas.recruitment import (
    CandidateCreate,
    CandidateStageUpdate,
    InterviewCreate,
    InterviewFeedbackUpdate,
)
from services.ai_service import AIService
from services.recruitment_service import RecruitmentService

router = APIRouter(
    prefix="/api/public",
    tags=["Public Candidate Portal"],
)

logger = logging.getLogger(__name__)

LIVE_INTERVIEW_SESSIONS: dict[str, dict] = {}


def _normalize_transcript_text(text: str) -> str:
    return " ".join(str(text or "").split()).strip()


def _sanitize_live_transcript(transcript: str, question: str | None = None) -> str:
    normalized = _normalize_transcript_text(transcript)
    if not normalized:
        return ""

    if question:
        normalized_question = _normalize_transcript_text(question)
        if normalized_question:
            lower_transcript = normalized.lower()
            lower_question = normalized_question.lower()

            if lower_transcript.startswith(lower_question):
                normalized = _normalize_transcript_text(
                    normalized[len(normalized_question):]
                )
            elif lower_question in lower_transcript:
                start = lower_transcript.find(lower_question)
                end = start + len(normalized_question)
                normalized = _normalize_transcript_text(
                    f"{normalized[:start]} {normalized[end:]}"
                )

    words = normalized.split()
    if len(words) >= 3 and len(set(word.lower() for word in words[-3:])) == 1:
        normalized = " ".join(words[:-2]).strip()

    return normalized


def _check_candidate_access(candidate, email: str) -> None:
    if not candidate or candidate.email.lower() != email.lower():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )


def _ensure_interview_ready(candidate, db: Session):
    latest_interview = (
        db.query(Interview)
        .filter(Interview.candidate_id == candidate.id)
        .order_by(Interview.created_at.desc(), Interview.id.desc())
        .first()
    )

    allowed_stages = {"shortlisted", "interview_scheduled", "interview_in_progress", "interviewed", "hired"}
    allowed_statuses = {"scheduled", "in_progress", "completed"}

    if (
        candidate.stage not in allowed_stages
        or latest_interview is None
        or latest_interview.status not in allowed_statuses
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Interview access is available only after HR shortlist and scheduling",
        )

    return latest_interview


def _ensure_live_interview_not_taken(candidate, latest_interview) -> None:
    already_completed = (
        candidate.stage in {"interviewed", "hired"}
        or latest_interview.status == "completed"
        or candidate.interview_score is not None
        or candidate.interview_summary is not None
        or candidate.final_decision is not None
    )

    if already_completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already taken the AI interview",
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
        "job_posting": {
            "id": candidate.job_posting.id if candidate.job_posting else candidate.job_posting_id,
            "title": candidate.job_posting.title if candidate.job_posting else None,
            "description": candidate.job_posting.description if candidate.job_posting else None,
            "requirements": candidate.job_posting.requirements if candidate.job_posting else None,
            "employment_type": candidate.job_posting.employment_type if candidate.job_posting else None,
            "location": candidate.job_posting.location if candidate.job_posting else None,
            "salary_range": candidate.job_posting.salary_range if candidate.job_posting else None,
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
    if any(
        value is not None
        for value in (
            candidate.screening_score,
            candidate.screening_summary,
            candidate.shortlist_decision,
            candidate.interview_score,
            candidate.interview_summary,
            candidate.final_decision,
            candidate.ai_summary,
        )
    ):
        latest_result = {
            "screening_score": candidate.screening_score,
            "screening_summary": candidate.screening_summary,
            "shortlist_decision": candidate.shortlist_decision,
            "interview_score": candidate.interview_score,
            "interview_summary": candidate.interview_summary,
            "final_decision": candidate.final_decision,
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
    interview = _ensure_interview_ready(candidate, db)

    content = await audio.read()
    try:
        audio_path = save_audio_file(audio.filename or "recording.webm", content)
        transcript_result = AIService.transcribe_voice(audio_path)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        if "empty text" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="We could not detect speech in your recording. Please record again and speak a little louder.",
            ) from exc
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

    interview = RecruitmentService.update_interview_feedback(
        db,
        interview.id,
        InterviewFeedbackUpdate(
            feedback=evaluation.get("summary", ""),
            transcript=transcript,
            score=evaluation.get("score", 0),
            recommendation=evaluation.get("next_stage", "hold"),
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
    latest_interview = _ensure_interview_ready(candidate, db)
    _ensure_live_interview_not_taken(candidate, latest_interview)
    RecruitmentService.mark_interview_in_progress(db, candidate.id)

    session_id = str(uuid4())
    context = _build_candidate_context(candidate, db)
    question_bank = AIService.generate_interview_question_bank(
        {
            **context,
            "turn": 1,
            "instruction": "Build a role-specific interview question bank.",
        }
    )
    questions = question_bank.get("questions") or []
    if not questions:
        questions = AIService._fallback_interview_questions(context, AIService.INTERVIEW_QUESTION_COUNT)
    else:
        fallback_questions = AIService._fallback_interview_questions(context, AIService.INTERVIEW_QUESTION_COUNT)
        normalized_questions = []
        for index in range(min(len(questions), AIService.INTERVIEW_QUESTION_COUNT)):
            model_question = questions[index] if index < len(questions) and isinstance(questions[index], dict) else {}
            fallback_question = fallback_questions[index] if index < len(fallback_questions) else {}
            normalized_questions.append(
                {
                    "question": str(
                        model_question.get("question")
                        or fallback_question.get("question")
                        or "Tell me about yourself."
                    ),
                    "guidance": str(
                        model_question.get("guidance")
                        or fallback_question.get("guidance")
                        or ""
                    ),
                }
            )
        questions = normalized_questions

    first_question = questions[0] if questions else {"question": "Tell me about yourself.", "guidance": ""}
    total_questions = len(questions) if questions else 1

    LIVE_INTERVIEW_SESSIONS[session_id] = {
        "candidate_id": candidate.id,
        "email": candidate.email,
        "round_number": 1,
        "total_questions": total_questions,
        "questions": questions,
        "question_index": 0,
        "answers": [],
        "conversation": [
            {"role": "assistant", "content": first_question.get("question", "")}
        ],
        "context": context,
    }

    log_ai_interview_event(
        "AI_INTERVIEW_START",
        session_id=session_id,
        candidate_id=candidate.id,
        email=candidate.email,
        total_questions=total_questions,
        source="public_live_interview_start",
    )

    logger.info(
        "Live interview started session_id=%s candidate_id=%s total_questions=%s first_question=%s",
        session_id,
        candidate.id,
        total_questions,
        first_question.get("question", ""),
    )

    return LiveInterviewStartResponse(
        session_id=session_id,
        candidate_id=candidate.id,
        question=first_question.get("question", ""),
        round_number=1,
        total_questions=total_questions,
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
    interview = _ensure_interview_ready(candidate, db)
    if not session or session.get("candidate_id") != candidate_id:
        logger.warning(
            "Live interview session missing or mismatched session_id=%s candidate_id=%s has_session=%s",
            session_id,
            candidate_id,
            bool(session),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

    content = await audio.read()
    try:
        audio_path = save_audio_file(audio.filename or "recording.webm", content)
        transcript_result = AIService.transcribe_voice(audio_path)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        if "empty text" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="We could not detect speech in your recording. Please record again and speak a little louder.",
            ) from exc
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    transcript = transcript_result.get("transcript", "")
    current_question = ""
    questions = session.get("questions", [])
    current_index = session.get("question_index", 0)
    if 0 <= current_index < len(questions):
        current_question = questions[current_index].get("question", "")

    sanitized_transcript = _sanitize_live_transcript(transcript, current_question)

    if not sanitized_transcript:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="We could not detect speech clearly in your recording. Please record again and speak a little louder.",
        )

    log_ai_interview_event(
        "AI_INTERVIEW_TRANSCRIPT",
        session_id=session_id,
        candidate_id=candidate_id,
        transcript=sanitized_transcript,
        transcript_chars=len(sanitized_transcript),
        question_index=session.get("question_index"),
        round_number=session.get("round_number"),
    )

    if sanitized_transcript:
        interview.transcript = (
            f"{interview.transcript}\n\n{sanitized_transcript}" if interview.transcript else sanitized_transcript
        )
        db.commit()
        db.refresh(interview)
        log_ai_interview_event(
            "AI_INTERVIEW_TRANSCRIPT_SAVED",
            session_id=session_id,
            candidate_id=candidate_id,
            interview_id=interview.id,
            transcript_chars=len(interview.transcript or ""),
        )

    logger.info(
        "Live interview turn received session_id=%s candidate_id=%s audio_path=%s transcript_chars=%s pre_question_index=%s pre_round_number=%s total_questions=%s",
        session_id,
        candidate_id,
        audio_path,
        len(sanitized_transcript),
        session.get("question_index"),
        session.get("round_number"),
        len(questions),
    )
    if sanitized_transcript:
        session["answers"].append(sanitized_transcript)
        session["conversation"].append({"role": "candidate", "content": sanitized_transcript})
    session["question_index"] += 1
    session["round_number"] += 1

    completed = session["question_index"] >= len(questions) or session["round_number"] > 5
    logger.info(
        "Live interview turn state session_id=%s candidate_id=%s question_index=%s round_number=%s total_questions=%s completed=%s",
        session_id,
        candidate_id,
        session["question_index"],
        session["round_number"],
        len(questions),
        completed,
    )
    interview_chat = AIService.interview_chat(
        transcript,
        context={
            **session["context"],
            "round_number": session["round_number"],
            "question_index": session["question_index"],
            "conversation": session["conversation"],
            "instruction": "Respond to the candidate answer with concise coaching.",
        },
    )

    if completed:
        evaluation = AIService.evaluate_interview_session(
            questions,
            session["answers"],
            context={
                **session["context"],
                "conversation": session["conversation"],
                "instruction": "Evaluate the full interview session and score the candidate.",
            },
        )
        if not isinstance(evaluation, dict):
            evaluation = {
                "score": 0,
                "summary": "Evaluation unavailable",
                "recommendation": "",
                "next_stage": "hold",
            }

        next_question = None
        session["completed"] = True
        logger.info(
            "Live interview completed session_id=%s candidate_id=%s question_count=%s answer_count=%s",
            session_id,
            candidate_id,
            len(questions),
            len(session["answers"]),
        )

        RecruitmentService.update_interview_feedback(
            db,
            interview.id,
            InterviewFeedbackUpdate(
                feedback=evaluation.get("summary", ""),
                transcript="\n\n".join(session["answers"]),
                score=evaluation.get("score", 0),
                recommendation="pending_hr_review",
                status="completed",
            ),
        )
        log_ai_interview_event(
            "AI_INTERVIEW_COMPLETED",
            session_id=session_id,
            candidate_id=candidate_id,
            interview_id=interview.id,
            transcript_chars=len("\n\n".join(session["answers"])),
            answer_count=len(session["answers"]),
        )
    else:
        evaluation = None
        next_question_payload = questions[session["question_index"]]
        next_question = next_question_payload.get("question", "")
        session["conversation"].append({"role": "assistant", "content": next_question})
        logger.info(
            "Live interview next question session_id=%s candidate_id=%s next_question_index=%s next_question=%s",
            session_id,
            candidate_id,
            session["question_index"],
            next_question,
        )

    return LiveInterviewTurnResponse(
        session_id=session_id,
        candidate_id=candidate_id,
        question=next_question,
        round_number=session["round_number"],
        total_questions=session.get("total_questions", len(questions) if questions else 1),
        transcript=sanitized_transcript,
        reply=AIService._coerce_text(interview_chat.get("reply", "")),
        follow_up_questions=interview_chat.get("follow_up_questions", []),
        evaluation=evaluation,
        completed=completed,
        conversation=session["conversation"],
    )
