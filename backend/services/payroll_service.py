from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.employee import Employee
from models.payroll import Payroll

from schemas.payroll import PayrollGenerate


class PayrollService:

    @staticmethod
    def _payroll_query(db: Session):
        return (
            db.query(Payroll)
            .options(joinedload(Payroll.employee))
        )

    @staticmethod
    def get_by_id(db: Session, payroll_id: int) -> Optional[Payroll]:
        return (
            PayrollService._payroll_query(db)
            .filter(Payroll.id == payroll_id)
            .first()
        )

    @staticmethod
    def get_by_employee(db: Session, employee_id: int) -> List[Payroll]:
        return (
            PayrollService._payroll_query(db)
            .filter(Payroll.employee_id == employee_id)
            .order_by(
                Payroll.payroll_year.desc(),
                Payroll.payroll_month.desc(),
            )
            .all()
        )

    @staticmethod
    def get_payslip(
        db: Session,
        payroll_id: int,
        employee_id: int,
    ) -> Optional[Payroll]:
        return (
            PayrollService._payroll_query(db)
            .filter(
                Payroll.id == payroll_id,
                Payroll.employee_id == employee_id,
            )
            .first()
        )

    @staticmethod
    def generate(db: Session, payload: PayrollGenerate) -> List[Payroll]:
        existing = (
            db.query(Payroll)
            .filter(
                Payroll.payroll_month == payload.payroll_month,
                Payroll.payroll_year == payload.payroll_year,
            )
            .count()
        )
        if existing:
            raise ValueError(
                "Payroll already generated for this month and year"
            )

        employees = (
            db.query(Employee)
            .filter(Employee.is_active.is_(True))
            .all()
        )

        created = []
        for employee in employees:
            basic = employee.salary
            allowances = basic * 0.1
            bonuses = 0.0
            deductions = basic * 0.05
            net = basic + allowances + bonuses - deductions

            payroll = Payroll(
                employee_id=employee.id,
                payroll_month=payload.payroll_month,
                payroll_year=payload.payroll_year,
                basic_salary=basic,
                allowances=allowances,
                bonuses=bonuses,
                deductions=deductions,
                net_salary=net,
                status="generated",
            )
            db.add(payroll)
            created.append(payroll)

        db.commit()
        return (
            PayrollService._payroll_query(db)
            .filter(
                Payroll.payroll_month == payload.payroll_month,
                Payroll.payroll_year == payload.payroll_year,
            )
            .all()
        )

    @staticmethod
    def process(db: Session, payroll_id: int) -> Optional[Payroll]:
        payroll = PayrollService.get_by_id(db, payroll_id)
        if not payroll:
            return None
        if payroll.status == "processed":
            raise ValueError("Payroll already processed")

        payroll.status = "processed"
        payroll.payment_date = date.today()
        db.commit()
        db.refresh(payroll)
        return payroll

    @staticmethod
    def get_analytics(db: Session) -> Dict[str, Any]:
        total_records = db.query(Payroll).count()
        total_payout = (
            db.query(func.sum(Payroll.net_salary)).scalar() or 0
        )
        by_status = dict(
            db.query(Payroll.status, func.count(Payroll.id))
            .group_by(Payroll.status)
            .all()
        )

        return {
            "total_records": total_records,
            "total_payout": float(total_payout),
            "processed_count": by_status.get("processed", 0),
            "pending_count": by_status.get("generated", 0),
            "by_status": by_status,
        }
