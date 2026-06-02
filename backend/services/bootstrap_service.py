from __future__ import annotations

from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from core.resume_upload import UPLOAD_DIR, ensure_upload_dir
from models.attendance import Attendance
from models.department import Department
from models.employee import Employee
from models.leave import Leave
from models.performance import PerformanceReview
from models.payroll import Payroll
from models.recruitment import Candidate, Interview, JobPosting
from models.user import User


def _first_pdf_resume_path() -> str:
    ensure_upload_dir()
    pdf_files = sorted(UPLOAD_DIR.glob("*.pdf"))

    if pdf_files:
        return f"uploads/resumes/{pdf_files[0].name}"

    fallback = UPLOAD_DIR / "seed_resume.txt"
    if not fallback.exists():
        fallback.write_text(
            "Seed candidate resume\n"
            "Python | FastAPI | React | HRMS\n"
            "This file is created automatically as demo data.",
            encoding="utf-8",
        )
    return f"uploads/resumes/{fallback.name}"


def _get_user(db: Session, role: str, username: Optional[str] = None) -> Optional[User]:
    query = db.query(User).filter(User.role == role, User.is_active.is_(True))
    if username:
        query = query.filter(User.username == username)
    return query.order_by(User.id).first()


def _get_or_create_department(db: Session, name: str, code: str, description: str):
    department = (
        db.query(Department)
        .filter((Department.name == name) | (Department.code == code))
        .first()
    )
    if department:
        return department

    department = Department(name=name, code=code, description=description)
    db.add(department)
    db.flush()
    return department


def _get_or_create_employee(
    db: Session,
    *,
    user: User,
    employee_code: str,
    first_name: str,
    last_name: str,
    email: str,
    designation: str,
    hire_date: date,
    salary: float,
    department_id: int,
    status: str = "active",
    manager_id: Optional[int] = None,
):
    employee = (
        db.query(Employee)
        .filter(
            (Employee.user_id == user.id)
            | (Employee.employee_code == employee_code)
            | (Employee.email == email)
        )
        .first()
    )
    if employee:
        return employee

    employee = Employee(
        user_id=user.id,
        employee_code=employee_code,
        first_name=first_name,
        last_name=last_name,
        email=email,
        designation=designation,
        hire_date=hire_date,
        salary=salary,
        department_id=department_id,
        manager_id=manager_id,
        status=status,
        is_active=True,
    )
    db.add(employee)
    db.flush()
    return employee


def _get_or_create_job(
    db: Session,
    *,
    title: str,
    department_id: int,
    description: str,
    requirements: str,
    employment_type: str,
    location: Optional[str] = None,
    salary_range: Optional[str] = None,
    status: str = "open",
):
    job = db.query(JobPosting).filter(JobPosting.title == title).first()
    if job:
        return job

    job = JobPosting(
        title=title,
        department_id=department_id,
        description=description,
        requirements=requirements,
        employment_type=employment_type,
        location=location,
        salary_range=salary_range,
        status=status,
    )
    db.add(job)
    db.flush()
    return job


def _get_or_create_candidate(
    db: Session,
    *,
    job_posting_id: int,
    full_name: str,
    email: str,
    applied_date: date,
    resume_path: str,
    phone: Optional[str] = None,
    experience_years: float = 0,
    current_company: Optional[str] = None,
    current_role: Optional[str] = None,
    ai_score: float = 0,
    ai_summary: Optional[str] = None,
    stage: str = "applied",
):
    candidate = (
        db.query(Candidate)
        .filter(
            (Candidate.email == email)
            | ((Candidate.job_posting_id == job_posting_id) & (Candidate.full_name == full_name))
        )
        .first()
    )
    if candidate:
        return candidate

    candidate = Candidate(
        job_posting_id=job_posting_id,
        full_name=full_name,
        email=email,
        phone=phone,
        resume_path=resume_path,
        experience_years=experience_years,
        current_company=current_company,
        current_role=current_role,
        ai_score=ai_score,
        ai_summary=ai_summary,
        stage=stage,
        applied_date=applied_date,
    )
    db.add(candidate)
    db.flush()
    return candidate


def _get_or_create_interview(
    db: Session,
    *,
    candidate_id: int,
    interviewer_id: Optional[int],
    interview_round: str,
    scheduled_date: date,
    status: str = "scheduled",
    feedback: Optional[str] = None,
    score: Optional[float] = None,
    recommendation: Optional[str] = None,
):
    interview = (
        db.query(Interview)
        .filter(
            Interview.candidate_id == candidate_id,
            Interview.interview_round == interview_round,
        )
        .first()
    )
    if interview:
        return interview

    interview = Interview(
        candidate_id=candidate_id,
        interviewer_id=interviewer_id,
        interview_round=interview_round,
        scheduled_date=scheduled_date,
        status=status,
        feedback=feedback,
        score=score,
        recommendation=recommendation,
    )
    db.add(interview)
    db.flush()
    return interview


def _get_or_create_attendance(
    db: Session,
    *,
    employee_id: int,
    attendance_date: date,
    check_in: Optional[time],
    check_out: Optional[time],
    total_hours: str,
    status: str,
    remarks: Optional[str] = None,
):
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.attendance_date == attendance_date,
        )
        .first()
    )
    if attendance:
        return attendance

    attendance = Attendance(
        employee_id=employee_id,
        attendance_date=attendance_date,
        check_in=check_in,
        check_out=check_out,
        total_hours=total_hours,
        status=status,
        remarks=remarks,
    )
    db.add(attendance)
    db.flush()
    return attendance


def _get_or_create_leave(
    db: Session,
    *,
    employee_id: int,
    leave_type: str,
    start_date: date,
    end_date: date,
    total_days: int,
    reason: str,
    status: str,
    approved_by: Optional[int] = None,
    rejection_reason: Optional[str] = None,
):
    leave = (
        db.query(Leave)
        .filter(
            Leave.employee_id == employee_id,
            Leave.leave_type == leave_type,
            Leave.start_date == start_date,
        )
        .first()
    )
    if leave:
        return leave

    leave = Leave(
        employee_id=employee_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        total_days=total_days,
        reason=reason,
        status=status,
        approved_by=approved_by,
        rejection_reason=rejection_reason,
    )
    db.add(leave)
    db.flush()
    return leave


def _get_or_create_payroll(
    db: Session,
    *,
    employee_id: int,
    payroll_month: str,
    payroll_year: int,
    basic_salary: float,
    allowances: float,
    bonuses: float,
    deductions: float,
    net_salary: float,
    payment_date: Optional[date],
    status: str,
):
    payroll = (
        db.query(Payroll)
        .filter(
            Payroll.employee_id == employee_id,
            Payroll.payroll_month == payroll_month,
            Payroll.payroll_year == payroll_year,
        )
        .first()
    )
    if payroll:
        return payroll

    payroll = Payroll(
        employee_id=employee_id,
        payroll_month=payroll_month,
        payroll_year=payroll_year,
        basic_salary=basic_salary,
        allowances=allowances,
        bonuses=bonuses,
        deductions=deductions,
        net_salary=net_salary,
        payment_date=payment_date,
        status=status,
    )
    db.add(payroll)
    db.flush()
    return payroll


def _get_or_create_review(
    db: Session,
    *,
    employee_id: int,
    reviewer_id: int,
    review_period: str,
    review_date: date,
    rating: float,
    strengths: str,
    improvements: str,
    goals: str,
    status: str,
):
    review = (
        db.query(PerformanceReview)
        .filter(
            PerformanceReview.employee_id == employee_id,
            PerformanceReview.review_period == review_period,
        )
        .first()
    )
    if review:
        return review

    review = PerformanceReview(
        employee_id=employee_id,
        reviewer_id=reviewer_id,
        review_period=review_period,
        review_date=review_date,
        rating=rating,
        strengths=strengths,
        improvements=improvements,
        goals=goals,
        status=status,
    )
    db.add(review)
    db.flush()
    return review


def bootstrap_demo_data(db: Session) -> bool:
    if db.query(User).count() == 0:
        return False

    if db.query(Department).count() > 0:
        return False

    today = date.today()
    previous_month = today.replace(day=1) - timedelta(days=1)
    current_month_name = previous_month.strftime("%B").lower()

    engineering = _get_or_create_department(
        db,
        name="Engineering",
        code="ENG",
        description="Product and platform engineering",
    )
    human_resources = _get_or_create_department(
        db,
        name="Human Resources",
        code="HR",
        description="Recruitment, employee lifecycle and policy management",
    )
    finance = _get_or_create_department(
        db,
        name="Finance",
        code="FIN",
        description="Payroll, budgeting and compliance",
    )
    operations = _get_or_create_department(
        db,
        name="Operations",
        code="OPS",
        description="Business operations and support",
    )

    employee_user = _get_user(db, "employee", username="mini") or _get_user(db, "employee")
    support_employee_user = _get_user(db, "employee", username="tester_py") or employee_user
    hr_user = _get_user(db, "hr_recruiter", username="hr") or _get_user(db, "hr_recruiter")
    manager_user = _get_user(db, "senior_manager", username="manager") or _get_user(db, "senior_manager")
    admin_user = _get_user(db, "admin", username="dilip") or _get_user(db, "admin")

    employees = []
    if employee_user:
        employees.append(
            _get_or_create_employee(
                db,
                user=employee_user,
                employee_code="EMP-001",
                first_name="Mini",
                last_name="Kumar",
                email=employee_user.email,
                designation="Software Engineer",
                hire_date=today.replace(year=today.year - 2),
                salary=55000,
                department_id=engineering.id,
            )
        )

    if support_employee_user and support_employee_user.id != getattr(employee_user, "id", None):
        employees.append(
            _get_or_create_employee(
                db,
                user=support_employee_user,
                employee_code="EMP-002",
                first_name="Tester",
                last_name="Python",
                email=support_employee_user.email,
                designation="QA Analyst",
                hire_date=today.replace(year=today.year - 1),
                salary=50000,
                department_id=engineering.id,
            )
        )

    if hr_user:
        employees.append(
            _get_or_create_employee(
                db,
                user=hr_user,
                employee_code="EMP-003",
                first_name="HR",
                last_name="Lead",
                email=hr_user.email,
                designation="HR Recruiter",
                hire_date=today.replace(year=today.year - 3),
                salary=60000,
                department_id=human_resources.id,
            )
        )

    if manager_user:
        employees.append(
            _get_or_create_employee(
                db,
                user=manager_user,
                employee_code="EMP-004",
                first_name="Manager",
                last_name="Lead",
                email=manager_user.email,
                designation="Senior Manager",
                hire_date=today.replace(year=today.year - 4),
                salary=85000,
                department_id=operations.id,
            )
        )

    if admin_user:
        employees.append(
            _get_or_create_employee(
                db,
                user=admin_user,
                employee_code="EMP-005",
                first_name="System",
                last_name="Admin",
                email=admin_user.email,
                designation="System Administrator",
                hire_date=today.replace(year=today.year - 2),
                salary=90000,
                department_id=finance.id,
            )
        )

    db.flush()

    manager_employee = next((emp for emp in employees if emp and emp.user_id == getattr(manager_user, "id", None)), None)
    employee_a = next((emp for emp in employees if emp and emp.user_id == getattr(employee_user, "id", None)), None)
    employee_b = next((emp for emp in employees if emp and emp.user_id == getattr(support_employee_user, "id", None)), None)
    hr_employee = next((emp for emp in employees if emp and emp.user_id == getattr(hr_user, "id", None)), None)
    admin_employee = next((emp for emp in employees if emp and emp.user_id == getattr(admin_user, "id", None)), None)

    if manager_employee:
        if employee_a and employee_a.manager_id is None:
            employee_a.manager_id = manager_employee.id
        if employee_b and employee_b.manager_id is None:
            employee_b.manager_id = manager_employee.id
        if hr_employee and hr_employee.manager_id is None:
            hr_employee.manager_id = manager_employee.id

    job_a = _get_or_create_job(
        db,
        title="Backend Developer",
        department_id=engineering.id,
        description="Build and maintain backend services for the HRMS platform.",
        requirements="FastAPI, SQLAlchemy, PostgreSQL, REST APIs",
        employment_type="full-time",
        location="Remote",
        salary_range="55000-75000",
        status="open",
    )
    job_b = _get_or_create_job(
        db,
        title="HR Coordinator",
        department_id=human_resources.id,
        description="Support onboarding, employee records and recruitment operations.",
        requirements="HR operations, communication, MS Office, coordination",
        employment_type="full-time",
        location="Hybrid",
        salary_range="40000-52000",
        status="open",
    )
    _get_or_create_job(
        db,
        title="Payroll Specialist",
        department_id=finance.id,
        description="Handle payroll processing, salary validation and payouts.",
        requirements="Payroll systems, Excel, compliance, attention to detail",
        employment_type="contract",
        location="Onsite",
        salary_range="45000-60000",
        status="closed",
    )

    resume_path = _first_pdf_resume_path()
    candidate_a = _get_or_create_candidate(
        db,
        job_posting_id=job_a.id,
        full_name="Jane Candidate",
        email="jane.candidate@example.com",
        phone="9999999999",
        resume_path=resume_path,
        experience_years=4,
        current_company="Acme Corp",
        current_role="Software Engineer",
        ai_score=86,
        ai_summary="Strong backend profile with good API and database experience.",
        stage="screening",
        applied_date=today - timedelta(days=12),
    )
    candidate_b = _get_or_create_candidate(
        db,
        job_posting_id=job_b.id,
        full_name="Rahul HR",
        email="rahul.hr@example.com",
        phone="8888888888",
        resume_path=resume_path,
        experience_years=6,
        current_company="People First",
        current_role="HR Generalist",
        ai_score=79,
        ai_summary="Solid HR coordination background with employee lifecycle exposure.",
        stage="interview",
        applied_date=today - timedelta(days=9),
    )

    if manager_employee:
        _get_or_create_interview(
            db,
            candidate_id=candidate_a.id,
            interviewer_id=manager_employee.id,
            interview_round="initial",
            scheduled_date=today - timedelta(days=5),
            status="completed",
            feedback="Good technical depth and clear communication.",
            score=4.2,
            recommendation="advance",
        )

    if employee_a:
        _get_or_create_attendance(
            db,
            employee_id=employee_a.id,
            attendance_date=today - timedelta(days=2),
            check_in=time(9, 5),
            check_out=time(18, 0),
            total_hours="8:55",
            status="present",
            remarks="On time",
        )
        _get_or_create_attendance(
            db,
            employee_id=employee_a.id,
            attendance_date=today - timedelta(days=1),
            check_in=time(9, 20),
            check_out=time(18, 15),
            total_hours="8:55",
            status="late",
            remarks="Traffic delay",
        )

        _get_or_create_leave(
            db,
            employee_id=employee_a.id,
            leave_type="annual",
            start_date=today - timedelta(days=20),
            end_date=today - timedelta(days=18),
            total_days=3,
            reason="Family event",
            status="approved",
            approved_by=getattr(manager_employee, "id", None),
        )

        _get_or_create_payroll(
            db,
            employee_id=employee_a.id,
            payroll_month=current_month_name,
            payroll_year=previous_month.year,
            basic_salary=55000,
            allowances=5500,
            bonuses=1000,
            deductions=2750,
            net_salary=58750,
            payment_date=previous_month.replace(day=min(previous_month.day, 28)),
            status="processed",
        )

        _get_or_create_review(
            db,
            employee_id=employee_a.id,
            reviewer_id=getattr(manager_employee, "id", employee_a.id),
            review_period=f"Q{((today.month - 1) // 3) + 1} {today.year}",
            review_date=today - timedelta(days=7),
            rating=4.3,
            strengths="Reliable delivery, strong API design, and clear communication.",
            improvements="Document endpoints a bit more thoroughly.",
            goals="Lead one feature end to end and mentor junior engineers.",
            status="published",
        )

    if employee_b:
        _get_or_create_attendance(
            db,
            employee_id=employee_b.id,
            attendance_date=today - timedelta(days=2),
            check_in=time(8, 55),
            check_out=time(17, 45),
            total_hours="8:50",
            status="present",
            remarks="Regular shift",
        )
        _get_or_create_leave(
            db,
            employee_id=employee_b.id,
            leave_type="sick",
            start_date=today - timedelta(days=12),
            end_date=today - timedelta(days=11),
            total_days=2,
            reason="Medical rest",
            status="pending",
        )
        _get_or_create_payroll(
            db,
            employee_id=employee_b.id,
            payroll_month=current_month_name,
            payroll_year=previous_month.year,
            basic_salary=50000,
            allowances=5000,
            bonuses=500,
            deductions=2500,
            net_salary=53000,
            payment_date=previous_month.replace(day=min(previous_month.day, 28)),
            status="generated",
        )
        _get_or_create_review(
            db,
            employee_id=employee_b.id,
            reviewer_id=getattr(manager_employee, "id", employee_b.id),
            review_period=f"Q{((today.month - 1) // 3) + 1} {today.year}",
            review_date=today - timedelta(days=10),
            rating=4.0,
            strengths="Consistent QA coverage and good defect tracking.",
            improvements="Increase automation coverage for regression paths.",
            goals="Build an automated smoke suite for the release pipeline.",
            status="draft",
        )

    db.commit()
    return True
