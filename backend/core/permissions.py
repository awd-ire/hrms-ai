from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from models.employee import Employee
from models.user import User


ROLE_ADMIN = "admin"
ROLE_MANAGER = "senior_manager"
ROLE_HR = "hr_recruiter"
ROLE_EMPLOYEE = "employee"

ALL_ROLES = [ROLE_ADMIN, ROLE_MANAGER, ROLE_HR, ROLE_EMPLOYEE]
PRIVILEGED_EMPLOYEE_ROLES = [ROLE_ADMIN, ROLE_MANAGER, ROLE_HR]


class RoleChecker:

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user


Authenticated = RoleChecker(ALL_ROLES)
AdminOnly = RoleChecker([ROLE_ADMIN])
ManagerOnly = RoleChecker([ROLE_MANAGER])
HROnly = RoleChecker([ROLE_HR])
EmployeeOnly = RoleChecker([ROLE_EMPLOYEE])

AdminOrManager = RoleChecker([ROLE_ADMIN, ROLE_MANAGER])
AdminOrHR = RoleChecker([ROLE_ADMIN, ROLE_HR])
AdminOrManagerOrHR = RoleChecker(
    [ROLE_ADMIN, ROLE_MANAGER, ROLE_HR]
)
ManagerOrHR = RoleChecker([ROLE_MANAGER, ROLE_HR])
HROrAdmin = RoleChecker([ROLE_HR, ROLE_ADMIN])
ManagerOrAdmin = RoleChecker([ROLE_MANAGER, ROLE_ADMIN])
EmployeeOrAdmin = RoleChecker([ROLE_EMPLOYEE, ROLE_ADMIN])
HROrManager = RoleChecker([ROLE_HR, ROLE_MANAGER])
InterviewerRoles = RoleChecker(
    [ROLE_ADMIN, ROLE_MANAGER, ROLE_HR]
)


def is_admin(user: User) -> bool:
    return user.role == ROLE_ADMIN


def is_manager(user: User) -> bool:
    return user.role == ROLE_MANAGER


def is_hr(user: User) -> bool:
    return user.role == ROLE_HR


def is_employee(user: User) -> bool:
    return user.role == ROLE_EMPLOYEE


def assert_can_access_employee_record(
    db: Session,
    current_user: User,
    current_employee: Employee,
    target_employee_id: int,
) -> None:
    """Allow self, admin/HR, or a manager viewing a direct report."""
    if current_user.role in PRIVILEGED_EMPLOYEE_ROLES:
        return

    if current_employee.id == target_employee_id:
        return

    if is_manager(current_user):
        from services.employee_service import EmployeeService

        team_ids = [
            member.id
            for member in EmployeeService.list_team(db, current_employee.id)
        ]
        if target_employee_id in team_ids:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions",
    )
