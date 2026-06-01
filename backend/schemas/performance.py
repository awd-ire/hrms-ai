from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PerformanceReviewCreate(BaseModel):
    employee_id: int
    review_period: str
    review_date: date
    rating: float = Field(ge=1, le=5)
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    goals: Optional[str] = None
    status: str = "draft"


class PerformanceReviewUpdate(BaseModel):
    review_period: Optional[str] = None
    review_date: Optional[date] = None
    rating: Optional[float] = Field(default=None, ge=1, le=5)
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    goals: Optional[str] = None
    status: Optional[str] = None


class PerformanceReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    reviewer_id: int
    review_period: str
    review_date: date
    rating: float
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    goals: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None


class PerformanceAnalyticsResponse(BaseModel):
    total_reviews: int
    average_rating: float
    by_status: dict
