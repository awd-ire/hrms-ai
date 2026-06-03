from typing import List, Optional

from pydantic import BaseModel, Field


class ResumeScreenResponse(BaseModel):
    score: float
    summary: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    resume_path: str
    candidate_id: Optional[int] = None
    shortlist_decision: Optional[str] = None
    candidate_stage: Optional[str] = None


class CandidateRankItem(BaseModel):
    name: str
    profile: str


class CandidateRankRequest(BaseModel):
    candidates: List[CandidateRankItem]


class CandidateRankResponse(BaseModel):
    ranked: list
    summary: str


class ChatMessageRequest(BaseModel):
    message: str
    context: Optional[dict] = None


class RecruitmentChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = Field(default_factory=list)


class InterviewChatResponse(BaseModel):
    reply: str
    follow_up_questions: List[str] = Field(default_factory=list)


class TranscribeResponse(BaseModel):
    transcript: str
    language: Optional[str] = None
    audio_path: str


class LiveInterviewStartRequest(BaseModel):
    candidate_id: int
    email: str


class LiveInterviewStartResponse(BaseModel):
    session_id: str
    candidate_id: int
    question: str
    round_number: int
    total_questions: int
    transcript: Optional[str] = None
    conversation: list = Field(default_factory=list)


class LiveInterviewTurnResponse(BaseModel):
    session_id: str
    candidate_id: int
    question: Optional[str] = None
    round_number: int
    total_questions: int
    transcript: str
    reply: str
    follow_up_questions: List[str] = Field(default_factory=list)
    evaluation: Optional[dict] = None
    completed: bool = False
    conversation: list = Field(default_factory=list)
