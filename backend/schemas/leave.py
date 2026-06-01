from datetime import date, datetime
from typing import Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    total_days: int = Field(gt=0)
    reason: str


class LeaveReject(BaseModel):
    rejection_reason: str


class LeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    total_days: int
    reason: str
    status: str
    approved_by: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None


class LeaveBalanceResponse(BaseModel):
    employee_id: int
    year: int
    balances: Dict[str, Dict[str, float]]


class LeaveAnalyticsResponse(BaseModel):
    total_requests: int
    pending: int
    approved: int
    rejected: int
    by_type: dict
