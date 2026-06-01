from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.leave import Leave

from schemas.leave import LeaveRequestCreate


LEAVE_ALLOWANCES = {
    "annual": 20,
    "sick": 10,
    "casual": 5,
}


class LeaveService:

    @staticmethod
    def _leave_query(db: Session):
        return (
            db.query(Leave)
            .options(
                joinedload(Leave.employee),
                joinedload(Leave.approver),
            )
        )

    @staticmethod
    def get_by_id(db: Session, leave_id: int) -> Optional[Leave]:
        return (
            LeaveService._leave_query(db)
            .filter(Leave.id == leave_id)
            .first()
        )

    @staticmethod
    def get_by_employee(db: Session, employee_id: int) -> List[Leave]:
        return (
            LeaveService._leave_query(db)
            .filter(Leave.employee_id == employee_id)
            .order_by(Leave.start_date.desc())
            .all()
        )

    @staticmethod
    def get_pending(db: Session) -> List[Leave]:
        return (
            LeaveService._leave_query(db)
            .filter(Leave.status == "pending")
            .order_by(Leave.created_at.asc())
            .all()
        )

    @staticmethod
    def get_pending_for_team(
        db: Session,
        employee_ids: List[int],
    ) -> List[Leave]:
        if not employee_ids:
            return []

        return (
            LeaveService._leave_query(db)
            .filter(
                Leave.employee_id.in_(employee_ids),
                Leave.status == "pending",
            )
            .order_by(Leave.created_at.asc())
            .all()
        )

    @staticmethod
    def create_request(
        db: Session,
        employee_id: int,
        payload: LeaveRequestCreate,
    ) -> Leave:
        if payload.end_date < payload.start_date:
            raise ValueError("End date must be on or after start date")

        leave = Leave(
            employee_id=employee_id,
            **payload.model_dump(),
            status="pending",
        )
        db.add(leave)
        db.commit()
        db.refresh(leave)
        return LeaveService.get_by_id(db, leave.id)

    @staticmethod
    def approve(
        db: Session,
        leave_id: int,
        approver_employee_id: int,
    ) -> Optional[Leave]:
        leave = LeaveService.get_by_id(db, leave_id)
        if not leave:
            return None
        if leave.status != "pending":
            raise ValueError("Only pending leave requests can be approved")

        leave.status = "approved"
        leave.approved_by = approver_employee_id
        leave.rejection_reason = None
        db.commit()
        db.refresh(leave)
        return leave

    @staticmethod
    def reject(
        db: Session,
        leave_id: int,
        approver_employee_id: int,
        rejection_reason: str,
    ) -> Optional[Leave]:
        leave = LeaveService.get_by_id(db, leave_id)
        if not leave:
            return None
        if leave.status != "pending":
            raise ValueError("Only pending leave requests can be rejected")

        leave.status = "rejected"
        leave.approved_by = approver_employee_id
        leave.rejection_reason = rejection_reason
        db.commit()
        db.refresh(leave)
        return leave

    @staticmethod
    def get_balance(
        db: Session,
        employee_id: int,
        year: Optional[int] = None,
    ) -> Dict[str, Any]:
        year = year or date.today().year

        used_by_type = dict(
            db.query(Leave.leave_type, func.sum(Leave.total_days))
            .filter(
                Leave.employee_id == employee_id,
                Leave.status == "approved",
                func.strftime("%Y", Leave.start_date) == str(year),
            )
            .group_by(Leave.leave_type)
            .all()
        )

        balances = {}
        for leave_type, allowance in LEAVE_ALLOWANCES.items():
            used = float(used_by_type.get(leave_type, 0) or 0)
            balances[leave_type] = {
                "allowance": allowance,
                "used": used,
                "remaining": max(allowance - used, 0),
            }

        return {
            "employee_id": employee_id,
            "year": year,
            "balances": balances,
        }

    @staticmethod
    def get_analytics(
        db: Session,
        employee_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        if employee_ids is not None and not employee_ids:
            return {
                "total_requests": 0,
                "pending": 0,
                "approved": 0,
                "rejected": 0,
                "by_type": {},
            }

        def base_query():
            query = db.query(Leave)
            if employee_ids is not None:
                query = query.filter(Leave.employee_id.in_(employee_ids))
            return query

        total_requests = base_query().count()
        pending = (
            base_query()
            .filter(Leave.status == "pending")
            .count()
        )
        approved = (
            base_query()
            .filter(Leave.status == "approved")
            .count()
        )
        rejected = (
            base_query()
            .filter(Leave.status == "rejected")
            .count()
        )
        by_type = dict(
            base_query()
            .with_entities(Leave.leave_type, func.count(Leave.id))
            .group_by(Leave.leave_type)
            .all()
        )

        return {
            "total_requests": total_requests,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "by_type": by_type,
        }
