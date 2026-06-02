from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_employee
from core.permissions import (
    AdminOrHR,
    AdminOrManagerOrHR,
    AdminOrManager,
    is_admin,
)
from database import get_db
from models.user import User
from schemas.attendance import AttendanceAnalyticsResponse
from schemas.dashboard import CompanyAnalyticsResponse
from schemas.recruitment import RecruitmentAnalyticsResponse
from services.analytics_service import AnalyticsService
from services.employee_service import EmployeeService

router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"]
)


@router.get("/company", response_model=CompanyAnalyticsResponse)
def company_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    return AnalyticsService.company_analytics(db)


@router.get("/recruitment", response_model=RecruitmentAnalyticsResponse)
def recruitment_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    return AnalyticsService.recruitment_analytics(db)


@router.get("/attendance", response_model=AttendanceAnalyticsResponse)
def attendance_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        return AnalyticsService.attendance_analytics(db)

    team_ids = [
        member.id
        for member in EmployeeService.list_team(db, current_employee.id)
    ]
    return AnalyticsService.attendance_analytics(db, team_ids)
