from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_employee
from core.permissions import (
    AdminOrManager,
    Authenticated,
    EmployeeOnly,
    ManagerOrAdmin,
    ManagerOrHR,
    assert_can_access_employee_record,
    is_admin,
    is_hr,
)
from database import get_db
from models.user import User
from schemas.leave import (
    LeaveAnalyticsResponse,
    LeaveBalanceResponse,
    LeaveReject,
    LeaveRequestCreate,
    LeaveResponse,
)
from services.employee_service import EmployeeService
from services.leave_service import LeaveService

router = APIRouter(
    prefix="/api/leave",
    tags=["Leave"]
)


@router.post(
    "/request",
    response_model=LeaveResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_leave(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    try:
        return LeaveService.create_request(db, current_employee.id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/my", response_model=list[LeaveResponse])
def my_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    return LeaveService.get_by_employee(db, current_employee.id)


@router.get("/balance/{employee_id}", response_model=LeaveBalanceResponse)
def leave_balance(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(Authenticated),
    current_employee=Depends(get_current_employee),
):
    assert_can_access_employee_record(
        db,
        current_user,
        current_employee,
        employee_id,
    )
    return LeaveService.get_balance(db, employee_id)


@router.get("/pending", response_model=list[LeaveResponse])
def pending_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(ManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    if is_hr(current_user):
        return LeaveService.get_pending(db)

    team_ids = [
        member.id
        for member in EmployeeService.list_team(db, current_employee.id)
    ]
    return LeaveService.get_pending_for_team(db, team_ids)


@router.put("/{leave_id}/approve", response_model=LeaveResponse)
def approve_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(ManagerOrAdmin),
    current_employee=Depends(get_current_employee),
):
    try:
        leave = LeaveService.approve(db, leave_id, current_employee.id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found",
        )
    return leave


@router.put("/{leave_id}/reject", response_model=LeaveResponse)
def reject_leave(
    leave_id: int,
    payload: LeaveReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(ManagerOrAdmin),
    current_employee=Depends(get_current_employee),
):
    try:
        leave = LeaveService.reject(
            db,
            leave_id,
            current_employee.id,
            payload.rejection_reason,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found",
        )
    return leave


@router.get("/analytics", response_model=LeaveAnalyticsResponse)
def leave_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManager),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        return LeaveService.get_analytics(db)

    team_ids = [
        member.id
        for member in EmployeeService.list_team(db, current_employee.id)
    ]
    return LeaveService.get_analytics(db, team_ids)
