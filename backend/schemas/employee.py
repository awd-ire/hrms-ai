from datetime import date
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class EmployeeBase(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    designation: str
    hire_date: date
    salary: float = 0
    department_id: int
    manager_id: Optional[int] = None


class EmployeeCreate(EmployeeBase):
    user_id: int


class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = None
    user_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    hire_date: Optional[date] = None
    salary: Optional[float] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    status: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str
    is_active: bool
    profile_image: Optional[str] = None


class EmployeeSummaryResponse(BaseModel):
    employee: EmployeeResponse
    attendance_records: int
    pending_leaves: int
    approved_leaves: int
    latest_payroll: Optional[Dict[str, Any]] = None
    average_rating: Optional[float] = None
