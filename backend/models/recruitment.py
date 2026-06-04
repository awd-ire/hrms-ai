# Recruitment model stub
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from database import Base


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    requirements = Column(
        Text,
        nullable=False
    )

    employment_type = Column(
        String(50),
        nullable=False
    )

    location = Column(
        String(100),
        nullable=True
    )

    salary_range = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(30),
        default="open"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    department = relationship(
        "Department",
        back_populates="job_postings"
    )

    candidates = relationship(
        "Candidate",
        back_populates="job_posting",
        cascade="all, delete-orphan"
    )


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    job_posting_id = Column(
        Integer,
        ForeignKey("job_postings.id"),
        nullable=False
    )

    full_name = Column(
        String(200),
        nullable=False
    )

    email = Column(
        String(255),
        nullable=False
    )

    phone = Column(
        String(30),
        nullable=True
    )

    resume_path = Column(
        String(500),
        nullable=False
    )

    experience_years = Column(
        Float,
        default=0
    )

    current_company = Column(
        String(200),
        nullable=True
    )

    current_role = Column(
        String(200),
        nullable=True
    )

    ai_score = Column(
        Float,
        default=0
    )

    ai_summary = Column(
        Text,
        nullable=True
    )

    screening_score = Column(
        Float,
        nullable=True
    )

    screening_summary = Column(
        Text,
        nullable=True
    )

    shortlist_decision = Column(
        String(50),
        nullable=True
    )

    interview_score = Column(
        Float,
        nullable=True
    )

    interview_summary = Column(
        Text,
        nullable=True
    )

    final_decision = Column(
        String(50),
        nullable=True
    )

    stage = Column(
        String(50),
        default="applied"
    )

    applied_date = Column(
        Date,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    job_posting = relationship(
        "JobPosting",
        back_populates="candidates"
    )

    interviews = relationship(
        "Interview",
        back_populates="candidate",
        cascade="all, delete-orphan"
    )


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    candidate_id = Column(
        Integer,
        ForeignKey("candidates.id"),
        nullable=False
    )

    interviewer_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=True
    )

    interview_round = Column(
        String(100),
        nullable=False
    )

    scheduled_date = Column(
        Date,
        nullable=False
    )

    feedback = Column(
        Text,
        nullable=True
    )

    transcript = Column(
        Text,
        nullable=True
    )

    score = Column(
        Float,
        nullable=True
    )

    recommendation = Column(
        String(50),
        nullable=True
    )

    status = Column(
        String(30),
        default="scheduled"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    candidate = relationship(
        "Candidate",
        back_populates="interviews"
    )

    interviewer = relationship(
        "Employee"
    )
