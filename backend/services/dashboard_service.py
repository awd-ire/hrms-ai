from typing import Any, Dict

from sqlalchemy.orm import Session

from models.department import Department
from models.employee import Employee
from models.leave import Leave
from models.payroll import Payroll
from models.recruitment import JobPosting

from services.attendance_service import AttendanceService
from services.employee_service import EmployeeService
from services.leave_service import LeaveService
from services.payroll_service import PayrollService
from services.performance_service import PerformanceService
from services.recruitment_service import RecruitmentService


class DashboardService:

    @staticmethod
    def admin_dashboard(db: Session) -> Dict[str, Any]:
        return {
            "role": "admin",
            "stats": {
                "employees": db.query(Employee).count(),
                "departments": db.query(Department).count(),
                "pending_leaves": (
                    db.query(Leave).filter(Leave.status == "pending").count()
                ),
                "open_jobs": (
                    db.query(JobPosting)
                    .filter(JobPosting.status == "open")
                    .count()
                ),
                "payroll_records": db.query(Payroll).count(),
            },
        }

    @staticmethod
    def manager_dashboard(
        db: Session,
        manager_employee_id: int,
    ) -> Dict[str, Any]:
        team = EmployeeService.list_team(db, manager_employee_id)
        team_ids = [member.id for member in team]

        return {
            "role": "senior_manager",
            "stats": {
                "team_size": len(team),
                "pending_approvals": len(
                    LeaveService.get_pending_for_team(db, team_ids)
                ),
                "attendance_analytics": AttendanceService.get_analytics(
                    db, team_ids
                ),
                "performance_analytics": PerformanceService.get_analytics(
                    db, team_ids
                ),
            },
        }

    @staticmethod
    def hr_dashboard(db: Session) -> Dict[str, Any]:
        return {
            "role": "hr_recruiter",
            "stats": {
                "recruitment": RecruitmentService.get_analytics(db),
                "pending_leaves": (
                    db.query(Leave).filter(Leave.status == "pending").count()
                ),
                "employees": (
                    db.query(Employee)
                    .filter(Employee.is_active.is_(True))
                    .count()
                ),
            },
        }

    @staticmethod
    def employee_dashboard(
        db: Session,
        employee_id: int,
    ) -> Dict[str, Any]:
        summary = EmployeeService.get_summary(db, employee_id)

        return {
            "role": "employee",
            "stats": {
                "attendance_records": summary["attendance_records"],
                "pending_leaves": summary["pending_leaves"],
                "approved_leaves": summary["approved_leaves"],
                "leave_balance": LeaveService.get_balance(db, employee_id),
                "recent_payroll_count": len(
                    PayrollService.get_by_employee(db, employee_id)
                ),
            },
        }

