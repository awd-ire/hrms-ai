from datetime import date, datetime, time, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.attendance import Attendance

from schemas.attendance import AttendanceCorrect


class AttendanceService:

    @staticmethod
    def _attendance_query(db: Session):
        return (
            db.query(Attendance)
            .options(joinedload(Attendance.employee))
        )

    @staticmethod
    def _calc_total_hours(check_in: time, check_out: time) -> str:
        start = datetime.combine(date.today(), check_in)
        end = datetime.combine(date.today(), check_out)
        if end < start:
            return "0.0"
        hours = (end - start).total_seconds() / 3600
        return f"{hours:.1f}"

    @staticmethod
    def get_by_employee(
        db: Session,
        employee_id: int,
    ) -> List[Attendance]:
        return (
            AttendanceService._attendance_query(db)
            .filter(Attendance.employee_id == employee_id)
            .order_by(Attendance.attendance_date.desc())
            .all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        attendance_id: int,
    ) -> Optional[Attendance]:
        return (
            AttendanceService._attendance_query(db)
            .filter(Attendance.id == attendance_id)
            .first()
        )

    @staticmethod
    def get_by_employee_and_date(
        db: Session,
        employee_id: int,
        attendance_date: date,
    ) -> Optional[Attendance]:
        return (
            AttendanceService._attendance_query(db)
            .filter(
                Attendance.employee_id == employee_id,
                Attendance.attendance_date == attendance_date,
            )
            .first()
        )

    @staticmethod
    def get_team_attendance(
        db: Session,
        employee_ids: List[int],
    ) -> List[Attendance]:
        if not employee_ids:
            return []

        return (
            AttendanceService._attendance_query(db)
            .filter(Attendance.employee_id.in_(employee_ids))
            .order_by(
                Attendance.attendance_date.desc(),
                Attendance.employee_id,
            )
            .all()
        )

    @staticmethod
    def check_in(db: Session, employee_id: int) -> Attendance:
        today = date.today()
        now = datetime.now(timezone.utc).time().replace(tzinfo=None)

        record = AttendanceService.get_by_employee_and_date(
            db, employee_id, today
        )
        if record and record.check_in:
            raise ValueError("Already checked in for today")

        if record:
            record.check_in = now
            record.status = "present"
        else:
            record = Attendance(
                employee_id=employee_id,
                attendance_date=today,
                check_in=now,
                status="present",
            )
            db.add(record)

        db.commit()
        db.refresh(record)
        return AttendanceService.get_by_id(db, record.id)

    @staticmethod
    def check_out(db: Session, employee_id: int) -> Attendance:
        today = date.today()
        now = datetime.now(timezone.utc).time().replace(tzinfo=None)

        record = AttendanceService.get_by_employee_and_date(
            db, employee_id, today
        )
        if not record or not record.check_in:
            raise ValueError("Must check in before checking out")
        if record.check_out:
            raise ValueError("Already checked out for today")

        record.check_out = now
        record.total_hours = AttendanceService._calc_total_hours(
            record.check_in,
            now,
        )
        db.commit()
        db.refresh(record)
        return AttendanceService.get_by_id(db, record.id)

    @staticmethod
    def correct(
        db: Session,
        attendance_id: int,
        payload: AttendanceCorrect,
    ) -> Optional[Attendance]:
        record = AttendanceService.get_by_id(db, attendance_id)
        if not record:
            return None

        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(record, field, value)

        if record.check_in and record.check_out:
            record.total_hours = AttendanceService._calc_total_hours(
                record.check_in,
                record.check_out,
            )

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_analytics(
        db: Session,
        employee_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        query = db.query(Attendance)
        if employee_ids is not None:
            if not employee_ids:
                return {
                    "total_records": 0,
                    "present_count": 0,
                    "absent_count": 0,
                    "late_count": 0,
                    "by_status": {},
                }
            query = query.filter(Attendance.employee_id.in_(employee_ids))

        total_records = query.count()
        by_status = dict(
            query.with_entities(
                Attendance.status,
                func.count(Attendance.id),
            )
            .group_by(Attendance.status)
            .all()
        )

        return {
            "total_records": total_records,
            "present_count": by_status.get("present", 0),
            "absent_count": by_status.get("absent", 0),
            "late_count": by_status.get("late", 0),
            "by_status": by_status,
        }
