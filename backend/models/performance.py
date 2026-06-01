# Performance model stub
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


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    reviewer_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    review_period = Column(
        String(100),
        nullable=False
    )

    review_date = Column(
        Date,
        nullable=False
    )

    rating = Column(
        Float,
        nullable=False
    )

    strengths = Column(
        Text,
        nullable=True
    )

    improvements = Column(
        Text,
        nullable=True
    )

    goals = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(30),
        default="draft"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    employee = relationship(
        "Employee",
        foreign_keys=[employee_id],
        back_populates="performance_reviews"
    )

    reviewer = relationship(
        "Employee",
        foreign_keys=[reviewer_id]
    )