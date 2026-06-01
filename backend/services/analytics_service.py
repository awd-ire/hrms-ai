from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.department import Department
from models.employee import Employee

from services.attendance_service import AttendanceService
from services.recruitment_service import RecruitmentService


class AnalyticsService:

    @staticmethod
    def company_analytics(db: Session) -> Dict[str, Any]:
        total_employees = db.query(Employee).count()
        active_employees = (
            db.query(Employee)
            .filter(Employee.is_active.is_(True))
            .count()
        )
        employees_by_department = dict(
            db.query(Department.name, func.count(Employee.id))
            .join(Employee, Employee.department_id == Department.id)
            .group_by(Department.name)
            .all()
        )
        employees_by_status = dict(
            db.query(Employee.status, func.count(Employee.id))
            .group_by(Employee.status)
            .all()
        )

        return {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "total_departments": db.query(Department).count(),
            "employees_by_department": employees_by_department,
            "employees_by_status": employees_by_status,
        }

    @staticmethod
    def recruitment_analytics(db: Session) -> Dict[str, Any]:
        return RecruitmentService.get_analytics(db)

    @staticmethod
    def attendance_analytics(
        db: Session,
        employee_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        return AttendanceService.get_analytics(db, employee_ids)
