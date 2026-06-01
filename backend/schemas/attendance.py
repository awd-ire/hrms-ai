from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    attendance_date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    total_hours: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


class AttendanceCorrect(BaseModel):
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    total_hours: Optional[str] = None


class AttendanceAnalyticsResponse(BaseModel):
    total_records: int
    present_count: int
    absent_count: int
    late_count: int
    by_status: dict
