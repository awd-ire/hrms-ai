from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from schemas.recruitment import CandidateResponse, JobPostingResponse, InterviewResponse


class PublicCandidateApplyResponse(BaseModel):
    candidate: CandidateResponse
    interview: Optional[InterviewResponse] = None


class PublicCandidateCheckRequest(BaseModel):
    candidate_id: int
    email: EmailStr


class PublicCandidateStatusResponse(BaseModel):
    candidate: CandidateResponse
    interview: Optional[InterviewResponse] = None
    latest_result: Optional[dict] = None


class PublicCandidateInterviewResponse(BaseModel):
    transcript: str
    interview_chat: dict
    evaluation: dict
    candidate: CandidateResponse
    interview: Optional[InterviewResponse] = None


class PublicJobPostingResponse(JobPostingResponse):
    pass
