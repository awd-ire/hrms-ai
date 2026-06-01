from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.attendance import Attendance
from models.department import Department
from models.employee import Employee
from models.leave import Leave
from models.payroll import Payroll
from models.performance import PerformanceReview
from models.user import User

from schemas.department import DepartmentCreate, DepartmentUpdate
from schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeService:

    @staticmethod
    def _employee_query(db: Session):
        return (
            db.query(Employee)
            .options(
                joinedload(Employee.department),
                joinedload(Employee.user),
                joinedload(Employee.manager),
            )
        )

    @staticmethod
    def list_all(db: Session) -> List[Employee]:
        return (
            EmployeeService._employee_query(db)
            .filter(Employee.is_active.is_(True))
            .order_by(Employee.last_name, Employee.first_name)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, employee_id: int) -> Optional[Employee]:
        return (
            EmployeeService._employee_query(db)
            .filter(Employee.id == employee_id)
            .first()
        )

    @staticmethod
    def get_by_user_id(db: Session, user_id: int) -> Optional[Employee]:
        return (
            EmployeeService._employee_query(db)
            .filter(Employee.user_id == user_id)
            .first()
        )

    @staticmethod
    def list_team(db: Session, manager_id: int) -> List[Employee]:
        return (
            EmployeeService._employee_query(db)
            .filter(
                Employee.manager_id == manager_id,
                Employee.is_active.is_(True),
            )
            .order_by(Employee.last_name, Employee.first_name)
            .all()
        )

    @staticmethod
    def create(db: Session, payload: EmployeeCreate) -> Employee:
        user = db.query(User).filter(User.id == payload.user_id).first()
        if not user:
            raise ValueError("User not found")

        existing = (
            db.query(Employee)
            .filter(Employee.user_id == payload.user_id)
            .first()
        )
        if existing:
            raise ValueError("Employee profile already exists for this user")

        department = (
            db.query(Department)
            .filter(Department.id == payload.department_id)
            .first()
        )
        if not department:
            raise ValueError("Department not found")

        if payload.manager_id:
            manager = EmployeeService.get_by_id(db, payload.manager_id)
            if not manager:
                raise ValueError("Manager not found")

        employee = Employee(**payload.model_dump())
        db.add(employee)
        db.commit()
        db.refresh(employee)
        return EmployeeService.get_by_id(db, employee.id)

    @staticmethod
    def update(
        db: Session,
        employee_id: int,
        payload: EmployeeUpdate,
    ) -> Optional[Employee]:
        employee = EmployeeService.get_by_id(db, employee_id)
        if not employee:
            return None

        updates = payload.model_dump(exclude_unset=True)
        if "department_id" in updates:
            department = (
                db.query(Department)
                .filter(Department.id == updates["department_id"])
                .first()
            )
            if not department:
                raise ValueError("Department not found")

        if updates.get("manager_id"):
            manager = EmployeeService.get_by_id(db, updates["manager_id"])
            if not manager:
                raise ValueError("Manager not found")

        for field, value in updates.items():
            setattr(employee, field, value)

        db.commit()
        db.refresh(employee)
        return EmployeeService.get_by_id(db, employee_id)

    @staticmethod
    def delete(db: Session, employee_id: int) -> bool:
        employee = EmployeeService.get_by_id(db, employee_id)
        if not employee:
            return False

        employee.is_active = False
        employee.status = "inactive"
        db.commit()
        return True

    @staticmethod
    def get_summary(db: Session, employee_id: int) -> Optional[Dict[str, Any]]:
        employee = EmployeeService.get_by_id(db, employee_id)
        if not employee:
            return None

        attendance_records = (
            db.query(func.count(Attendance.id))
            .filter(Attendance.employee_id == employee_id)
            .scalar()
        )

        pending_leaves = (
            db.query(func.count(Leave.id))
            .filter(
                Leave.employee_id == employee_id,
                Leave.status == "pending",
            )
            .scalar()
        )

        approved_leaves = (
            db.query(func.count(Leave.id))
            .filter(
                Leave.employee_id == employee_id,
                Leave.status == "approved",
            )
            .scalar()
        )

        latest_payroll = (
            db.query(Payroll)
            .filter(Payroll.employee_id == employee_id)
            .order_by(Payroll.payroll_year.desc(), Payroll.payroll_month.desc())
            .first()
        )

        average_rating = (
            db.query(func.avg(PerformanceReview.rating))
            .filter(PerformanceReview.employee_id == employee_id)
            .scalar()
        )

        return {
            "employee": employee,
            "attendance_records": attendance_records or 0,
            "pending_leaves": pending_leaves or 0,
            "approved_leaves": approved_leaves or 0,
            "latest_payroll": latest_payroll,
            "average_rating": float(average_rating) if average_rating else None,
        }


class DepartmentService:

    @staticmethod
    def list_all(db: Session) -> List[Department]:
        return (
            db.query(Department)
            .order_by(Department.name)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, department_id: int) -> Optional[Department]:
        return (
            db.query(Department)
            .filter(Department.id == department_id)
            .first()
        )

    @staticmethod
    def create(db: Session, payload: DepartmentCreate) -> Department:
        existing = (
            db.query(Department)
            .filter(
                (Department.name == payload.name)
                | (Department.code == payload.code)
            )
            .first()
        )
        if existing:
            raise ValueError("Department name or code already exists")

        department = Department(**payload.model_dump())
        db.add(department)
        db.commit()
        db.refresh(department)
        return department

    @staticmethod
    def update(
        db: Session,
        department_id: int,
        payload: DepartmentUpdate,
    ) -> Optional[Department]:
        department = DepartmentService.get_by_id(db, department_id)
        if not department:
            return None

        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(department, field, value)

        db.commit()
        db.refresh(department)
        return department

    @staticmethod
    def delete(db: Session, department_id: int) -> bool:
        department = DepartmentService.get_by_id(db, department_id)
        if not department:
            return False

        employee_count = (
            db.query(func.count(Employee.id))
            .filter(Employee.department_id == department_id)
            .scalar()
        )
        if employee_count:
            raise ValueError("Cannot delete department with assigned employees")

        db.delete(department)
        db.commit()
        return True
