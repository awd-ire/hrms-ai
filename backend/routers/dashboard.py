from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_employee
from core.permissions import AdminOnly, EmployeeOnly, HROnly, ManagerOnly
from database import get_db
from schemas.dashboard import DashboardResponse
from services.dashboard_service import DashboardService

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get("/admin", response_model=DashboardResponse)
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(AdminOnly),
):
    return DashboardService.admin_dashboard(db)


@router.get("/manager", response_model=DashboardResponse)
def manager_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(ManagerOnly),
    current_employee=Depends(get_current_employee),
):
    return DashboardService.manager_dashboard(db, current_employee.id)


@router.get("/hr", response_model=DashboardResponse)
def hr_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(HROnly),
):
    return DashboardService.hr_dashboard(db)


@router.get("/employee", response_model=DashboardResponse)
def employee_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(EmployeeOnly),
    current_employee=Depends(get_current_employee),
):
    return DashboardService.employee_dashboard(db, current_employee.id)
