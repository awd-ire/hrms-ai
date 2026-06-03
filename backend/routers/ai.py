from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from core.permissions import Authenticated, HROnly, HROrManager
from core.voice_upload import save_audio_file
from database import get_db
from models.recruitment import Interview
from schemas.ai import (
    CandidateRankRequest,
    CandidateRankResponse,
    ChatMessageRequest,
    InterviewChatResponse,
    RecruitmentChatResponse,
    ResumeScreenResponse,
    TranscribeResponse,
)
from services.ai_service import AIService
from services.recruitment_service import RecruitmentService
from schemas.recruitment import InterviewCreate, InterviewFeedbackUpdate

router = APIRouter(
    prefix="/api/ai",
    tags=["AI"]
)


def _raise_ai_error(result: dict) -> None:
    if result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {result.get('error')}",
        )


@router.get("/status")
def ai_status(
    db: Session = Depends(get_db),
    current_user=Depends(Authenticated),
):
    return AIService.get_status(db)


@router.post("/resume/screen", response_model=ResumeScreenResponse)
async def screen_resume(
    resume: Optional[UploadFile] = File(default=None),
    job_description: Optional[str] = Form(default=None),
    candidate_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(HROnly),
):
    try:
        if candidate_id is not None:
            candidate = RecruitmentService.get_candidate(db, candidate_id)
            if not candidate:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Candidate not found",
                )
            result = AIService.screen_existing_resume(
                candidate.resume_path,
                job_description,
            )
        else:
            if resume is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Resume file is required when no candidate is selected",
                )

            content = await resume.read()
            result = AIService.screen_resume_file(
                content,
                resume.filename or "resume.pdf",
                job_description,
            )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    _raise_ai_error(result)

    shortlist_decision = "shortlisted" if result.get("score", 0) >= RecruitmentService.SHORTLIST_THRESHOLD else "rejected"

    if candidate_id is not None:
        RecruitmentService.update_candidate_screening_result(
            db,
            candidate_id,
            result.get("score", 0),
            result.get("summary", ""),
            shortlist_decision,
        )
        result["candidate_id"] = candidate_id
        result["shortlist_decision"] = shortlist_decision
        result["candidate_stage"] = "shortlisted" if shortlist_decision == "shortlisted" else "rejected"
    else:
        result["shortlist_decision"] = shortlist_decision

    return ResumeScreenResponse(**result)


@router.post("/resume/rank", response_model=CandidateRankResponse)
def rank_candidates(
    request: CandidateRankRequest,
    db: Session = Depends(get_db),
    current_user=Depends(HROnly),
):
    if len(request.candidates) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 candidates required for ranking",
        )

    candidates_list = [
        {"name": candidate.name, "profile": candidate.profile}
        for candidate in request.candidates
    ]

    result = AIService.rank_candidates(candidates_list)
    _raise_ai_error(result)
    return CandidateRankResponse(**result)


@router.post("/chat/recruitment", response_model=RecruitmentChatResponse)
def recruitment_chat(
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user=Depends(HROnly),
):
    if not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required",
        )

    result = AIService.recruitment_chat(request.message, request.context)
    _raise_ai_error(result)
    return RecruitmentChatResponse(**result)


@router.post("/chat/interview", response_model=InterviewChatResponse)
def interview_chat(
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user=Depends(HROrManager),
):
    if not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required",
        )

    result = AIService.interview_chat(request.message, request.context)
    _raise_ai_error(result)
    return InterviewChatResponse(**result)


@router.post("/voice/transcribe", response_model=TranscribeResponse)
async def transcribe_voice(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(HROnly),
):
    content = await audio.read()

    try:
        audio_path = save_audio_file(
            audio.filename or "recording.webm",
            content,
        )
        result = AIService.transcribe_voice(audio_path)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not result.get("transcript"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not transcribe audio",
        )

    return TranscribeResponse(**result)



@router.post("/interview/conduct")
async def conduct_interview(
    candidate_id: int = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(HROrManager),
):
    """Orchestrate an automated interview:
    1. save audio
    2. transcribe
    3. run interview_chat for conversational reply
    4. evaluate interview (score, recommendation, next_stage)
    5. update candidate AI results and stage
    """
    content = await audio.read()

    try:
        audio_path = save_audio_file(audio.filename or "recording.webm", content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        transcript_result = AIService.transcribe_voice(audio_path)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    transcript = transcript_result.get("transcript", "")

    candidate = RecruitmentService.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    # attempt to get resume analysis (best-effort)
    try:
        resume_analysis = AIService.screen_existing_resume(candidate.resume_path)
    except Exception:
        resume_analysis = {"score": 0, "summary": "resume analysis unavailable"}

    # conversational interview assistant reply
    interview_chat = AIService.interview_chat(transcript, context={"candidate": {"id": candidate.id, "full_name": candidate.full_name}, "resume_analysis": resume_analysis})

    # evaluation / scoring
    evaluation = AIService.evaluate_interview(transcript, resume_analysis.get("summary") if isinstance(resume_analysis, dict) else None)
    _raise_ai_error(evaluation)

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
                interview_round="ai-conducted",
                scheduled_date=date.today(),
                status="completed",
            ),
        )

    RecruitmentService.update_interview_feedback(
        db,
        interview.id,
        InterviewFeedbackUpdate(
            feedback=evaluation.get("summary", ""),
            score=evaluation.get("score", 0),
            recommendation=evaluation.get("next_stage", "hold"),
            status="completed",
        ),
    )

    return {
        "transcript": transcript,
        "interview_chat": interview_chat,
        "evaluation": evaluation,
    }
