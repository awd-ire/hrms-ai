# Attendance model stub
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Time
from sqlalchemy import String
from sqlalchemy import ForeignKey

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from database import Base


class Attendance(Base):
    __tablename__ = "attendance"

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

    attendance_date = Column(
        Date,
        nullable=False
    )

    check_in = Column(
        Time,
        nullable=True
    )

    check_out = Column(
        Time,
        nullable=True
    )

    total_hours = Column(
        String(20),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="present"
    )

    remarks = Column(
        String(255),
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
        back_populates="attendances"
    )