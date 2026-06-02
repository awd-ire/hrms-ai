from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_employee
from core.permissions import (
    AdminOnly,
    AdminOrHR,
    AdminOrManager,
    AdminOrManagerOrHR,
    Authenticated,
    assert_can_access_employee_record,
    is_admin,
)
from database import get_db
from models.user import User
from schemas.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeSummaryResponse,
    EmployeeUpdate,
)
from services.employee_service import EmployeeService

router = APIRouter(
    prefix="/api/employees",
    tags=["Employees"]
)


@router.get("/", response_model=list[EmployeeResponse])
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    return EmployeeService.list_all(db)


@router.get("/my-team", response_model=list[EmployeeResponse])
def my_team(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        return EmployeeService.list_all(db)
    return EmployeeService.list_team(db, current_employee.id)


@router.post(
    "/",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    try:
        return EmployeeService.create(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/{employee_id}/summary", response_model=EmployeeSummaryResponse)
def get_employee_summary(
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

    summary = EmployeeService.get_summary(db, employee_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    latest_payroll = summary["latest_payroll"]
    return EmployeeSummaryResponse(
        employee=summary["employee"],
        attendance_records=summary["attendance_records"],
        pending_leaves=summary["pending_leaves"],
        approved_leaves=summary["approved_leaves"],
        latest_payroll=(
            {
                "id": latest_payroll.id,
                "payroll_month": latest_payroll.payroll_month,
                "payroll_year": latest_payroll.payroll_year,
                "net_salary": latest_payroll.net_salary,
                "status": latest_payroll.status,
            }
            if latest_payroll
            else None
        ),
        average_rating=summary["average_rating"],
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(Authenticated),
):
    employee = EmployeeService.get_by_id(db, employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    try:
        employee = EmployeeService.update(db, employee_id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    if not EmployeeService.delete(db, employee_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
