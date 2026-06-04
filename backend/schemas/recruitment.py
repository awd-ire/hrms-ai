from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class JobPostingCreate(BaseModel):
    title: str
    department_id: int
    description: str
    requirements: str
    employment_type: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: str = "open"


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    department_id: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[str] = None


class JobPostingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    department_id: int
    description: str
    requirements: str
    employment_type: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None


class CandidateCreate(BaseModel):
    job_posting_id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    resume_path: str
    experience_years: float = 0
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    applied_date: date


class CandidateStageUpdate(BaseModel):
    stage: str


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    interviewer_id: Optional[int] = None
    interview_round: str
    scheduled_date: date
    feedback: Optional[str] = None
    transcript: Optional[str] = None
    score: Optional[float] = None
    recommendation: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None


class CandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_posting_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    resume_path: str
    experience_years: float
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    ai_score: float
    ai_summary: Optional[str] = None
    screening_score: Optional[float] = None
    screening_summary: Optional[str] = None
    shortlist_decision: Optional[str] = None
    interview_score: Optional[float] = None
    interview_summary: Optional[str] = None
    final_decision: Optional[str] = None
    stage: str
    applied_date: date
    created_at: Optional[datetime] = None
    interviews: list[InterviewResponse] = Field(default_factory=list)


class InterviewCreate(BaseModel):
    candidate_id: int
    interviewer_id: Optional[int] = None
    interview_round: str
    scheduled_date: date
    status: str = "scheduled"


class InterviewFeedbackUpdate(BaseModel):
    feedback: str
    transcript: Optional[str] = None
    score: float
    recommendation: str
    status: str = "completed"


class InterviewRetryRequest(BaseModel):
    interview_round: Optional[str] = None
    scheduled_date: Optional[date] = None


class RecruitmentAnalyticsResponse(BaseModel):
    open_jobs: int
    total_candidates: int
    candidates_by_stage: dict
    interviews_scheduled: int
