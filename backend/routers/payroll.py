from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_employee
from core.permissions import (
    AdminOnly,
    AdminOrHR,
    AdminOrManagerOrHR,
    EmployeeOnly,
    EmployeeOrAdmin,
    is_admin,
)
from database import get_db
from models.user import User
from schemas.payroll import (
    PayrollAnalyticsResponse,
    PayrollGenerate,
    PayrollResponse,
)
from services.payroll_service import PayrollService

router = APIRouter(
    prefix="/api/payroll",
    tags=["Payroll"]
)


@router.get("/my", response_model=list[PayrollResponse])
def my_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    return PayrollService.get_by_employee(db, current_employee.id)


@router.get("/employee/{employee_id}", response_model=list[PayrollResponse])
def employee_payroll(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    return PayrollService.get_by_employee(db, employee_id)


@router.post("/generate", response_model=list[PayrollResponse])
def generate_payroll(
    payload: PayrollGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    try:
        return PayrollService.generate(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.put("/{payroll_id}/process", response_model=PayrollResponse)
def process_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    try:
        payroll = PayrollService.process(db, payroll_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not payroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll record not found",
        )
    return payroll


@router.get("/analytics", response_model=PayrollAnalyticsResponse)
def payroll_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrManagerOrHR),
):
    return PayrollService.get_analytics(db)


@router.get("/{payroll_id}/payslip", response_model=PayrollResponse)
def get_payslip(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(EmployeeOrAdmin),
    current_employee=Depends(get_current_employee),
):
    if is_admin(current_user):
        payroll = PayrollService.get_by_id(db, payroll_id)
    else:
        payroll = PayrollService.get_payslip(
            db,
            payroll_id,
            current_employee.id,
        )

    if not payroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payslip not found",
        )
    return payroll
