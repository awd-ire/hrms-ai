from typing import Any, Dict

from pydantic import BaseModel


class DashboardResponse(BaseModel):
    role: str
    stats: Dict[str, Any]


class CompanyAnalyticsResponse(BaseModel):
    total_employees: int
    active_employees: int
    total_departments: int
    employees_by_department: dict
    employees_by_status: dict
