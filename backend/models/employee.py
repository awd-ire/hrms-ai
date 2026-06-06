# Employee model stub
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import Boolean

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    employee_code = Column(
        String(30),
        unique=True,
        nullable=False
    )

    first_name = Column(
        String(100),
        nullable=False
    )

    last_name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False
    )

    phone = Column(
        String(20),
        nullable=True
    )

    designation = Column(
        String(150),
        nullable=False
    )

    hire_date = Column(
        Date,
        nullable=False
    )

    salary = Column(
        Float,
        nullable=False,
        default=0
    )

    status = Column(
        String(50),
        default="active"
    )

    profile_image = Column(
        String(500),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=True
    )

    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False
    )

    manager_id = Column(
        Integer,
        ForeignKey("employees.id"),
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

    user = relationship(
        "User",
        back_populates="employee"
    )

    department = relationship(
        "Department",
        back_populates="employees"
    )

    manager = relationship(
        "Employee",
        remote_side=[id],
        back_populates="subordinates"
    )

    subordinates = relationship(
        "Employee",
        back_populates="manager"
    )

    attendances = relationship(
    "Attendance",
    back_populates="employee"
    )

    leaves = relationship(
    "Leave",
    back_populates="employee",
    foreign_keys="Leave.employee_id"
    )

    payrolls = relationship(
    "Payroll",
    back_populates="employee"
    )

    performance_reviews = relationship(
    "PerformanceReview",
    back_populates="employee",
    foreign_keys="PerformanceReview.employee_id"
    )
