# Payroll model stub
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from database import Base


class Payroll(Base):
    __tablename__ = "payroll"

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

    payroll_month = Column(
        String(20),
        nullable=False
    )

    payroll_year = Column(
        Integer,
        nullable=False
    )

    basic_salary = Column(
        Float,
        nullable=False
    )

    allowances = Column(
        Float,
        default=0
    )

    bonuses = Column(
        Float,
        default=0
    )

    deductions = Column(
        Float,
        default=0
    )

    net_salary = Column(
        Float,
        nullable=False
    )

    payment_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        String(30),
        default="generated"
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
        back_populates="payrolls"
    )