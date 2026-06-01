from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PayrollGenerate(BaseModel):
    payroll_month: str
    payroll_year: int


class PayrollResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    payroll_month: str
    payroll_year: int
    basic_salary: float
    allowances: float
    bonuses: float
    deductions: float
    net_salary: float
    payment_date: Optional[date] = None
    status: str
    created_at: Optional[datetime] = None


class PayrollAnalyticsResponse(BaseModel):
    total_records: int
    total_payout: float
    processed_count: int
    pending_count: int
    by_status: dict
