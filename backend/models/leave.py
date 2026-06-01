# Leave model stub
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import ForeignKey

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from database import Base


class Leave(Base):
    __tablename__ = "leaves"

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

    leave_type = Column(
        String(50),
        nullable=False
    )

    start_date = Column(
        Date,
        nullable=False
    )

    end_date = Column(
        Date,
        nullable=False
    )

    total_days = Column(
        Integer,
        nullable=False
    )

    reason = Column(
        Text,
        nullable=False
    )

    status = Column(
        String(30),
        default="pending"
    )

    approved_by = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=True
    )

    rejection_reason = Column(
        Text,
        nullable=True
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
        back_populates="leaves"
    )

    approver = relationship(
        "Employee",
        foreign_keys=[approved_by]
    )