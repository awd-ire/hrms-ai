from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from core.permissions import (
    HROrAdmin,
    AdminOrManagerOrHR,
    InterviewerRoles,
)
from core.dependencies import get_optional_current_user
from core.resume_upload import resolve_resume_path
from database import get_db
from schemas.recruitment import (
    CandidateCreate,
    CandidateResponse,
    CandidateStageUpdate,
    InterviewCreate,
    InterviewFeedbackUpdate,
    InterviewRetryRequest,
    InterviewResponse,
    JobPostingCreate,
    JobPostingResponse,
    JobPostingUpdate,
    RecruitmentAnalyticsResponse,
)
from services.recruitment_service import RecruitmentService

router = APIRouter(
    prefix="/api/recruitment",
    tags=["Recruitment"]
)


@router.get("/jobs", response_model=list[JobPostingResponse])
def list_job_postings(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    return RecruitmentService.list_job_postings(db)


@router.post(
    "/jobs",
    response_model=JobPostingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job_posting(
    payload: JobPostingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    return RecruitmentService.create_job_posting(db, payload)


@router.put("/jobs/{job_id}", response_model=JobPostingResponse)
def update_job_posting(
    job_id: int,
    payload: JobPostingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    job = RecruitmentService.update_job_posting(db, job_id, payload)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found",
        )
    return job


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_posting(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    if not RecruitmentService.delete_job_posting(db, job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found",
        )


@router.get("/candidates", response_model=list[CandidateResponse])
def list_candidates(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    return RecruitmentService.list_candidates(db)


@router.post(
    "/candidates",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_candidate(
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
    current_user=Depends(AdminOrManagerOrHR),
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
        return RecruitmentService.create_candidate(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    candidate = RecruitmentService.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )
    return candidate


@router.get("/candidates/{candidate_id}/resume")
def download_candidate_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(HROrAdmin),
):
    candidate = RecruitmentService.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    try:
        file_path = resolve_resume_path(candidate.resume_path)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found",
        )

    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type="application/octet-stream",
    )


@router.put(
    "/candidates/{candidate_id}/stage",
    response_model=CandidateResponse,
)
def update_candidate_stage(
    candidate_id: int,
    payload: CandidateStageUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(HROrAdmin),
):
    candidate = RecruitmentService.update_candidate_stage(
        db,
        candidate_id,
        payload,
    )
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )
    return candidate


@router.post(
    "/interviews",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user=Depends(HROrAdmin),
):
    try:
        return RecruitmentService.create_interview(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.put(
    "/interviews/{interview_id}/feedback",
    response_model=InterviewResponse,
)
def update_interview_feedback(
    interview_id: int,
    payload: InterviewFeedbackUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(InterviewerRoles),
):
    interview = RecruitmentService.update_interview_feedback(
        db,
        interview_id,
        payload,
    )
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    return interview


@router.post(
    "/candidates/{candidate_id}/interview/retry",
    response_model=InterviewResponse,
)
def retry_candidate_interview(
    candidate_id: int,
    payload: InterviewRetryRequest | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(HROrAdmin),
):
    interview = RecruitmentService.reopen_candidate_interview(
        db,
        candidate_id,
        payload,
    )
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )
    return interview


@router.get("/analytics", response_model=RecruitmentAnalyticsResponse)
def recruitment_analytics(
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    return RecruitmentService.get_analytics(db)
