from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_employee
from core.permissions import (
    AdminOrHR,
    AdminOrManagerOrHR,
    AdminOrManager,
    EmployeeOnly,
    is_admin,
)
from database import get_db
from models.user import User
from schemas.attendance import (
    AttendanceAnalyticsResponse,
    AttendanceCorrect,
    AttendanceResponse,
)
from services.attendance_service import AttendanceService
from services.employee_service import EmployeeService

router = APIRouter(
    prefix="/api/attendance",
    tags=["Attendance"]
)


@router.post("/check-in", response_model=AttendanceResponse)
def check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    try:
        return AttendanceService.check_in(db, current_employee.id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/check-out", response_model=AttendanceResponse)
def check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    try:
        return AttendanceService.check_out(db, current_employee.id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/my", response_model=list[AttendanceResponse])
def my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    return AttendanceService.get_by_employee(db, current_employee.id)


@router.get("/team", response_model=list[AttendanceResponse])
def team_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        employees = EmployeeService.list_all(db)
    else:
        employees = EmployeeService.list_team(db, current_employee.id)

    team_ids = [member.id for member in employees]
    return AttendanceService.get_team_attendance(db, team_ids)


@router.get("/analytics", response_model=AttendanceAnalyticsResponse)
def attendance_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        return AttendanceService.get_analytics(db)

    team_ids = [
        member.id
        for member in EmployeeService.list_team(db, current_employee.id)
    ]
    return AttendanceService.get_analytics(db, team_ids)


@router.get("/employee/{employee_id}", response_model=list[AttendanceResponse])
def employee_attendance(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    return AttendanceService.get_by_employee(db, employee_id)


@router.put("/{attendance_id}/correct", response_model=AttendanceResponse)
def correct_attendance(
    attendance_id: int,
    payload: AttendanceCorrect,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    record = AttendanceService.correct(db, attendance_id, payload)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found",
        )
    return record
