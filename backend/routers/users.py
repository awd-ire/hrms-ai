from fastapi import APIRouter, Depends
from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from core.permissions import AdminOrManagerOrHR
from core.permissions import ROLE_ADMIN
from core.permissions import ROLE_HR
from core.permissions import ROLE_MANAGER
from database import get_db
from models.employee import Employee
from models.user import User
from schemas.auth import UserRegister
from schemas.auth import UserResponse
from services.auth_service import AuthService

ROLE_CREATION_RULES = {
    ROLE_ADMIN: ["admin", "senior_manager", "hr_recruiter", "employee"],
    ROLE_MANAGER: ["hr_recruiter", "employee"],
    ROLE_HR: ["employee"],
}

router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
)


@router.get("/employee-candidates", response_model=list[UserResponse])
def list_employee_candidates(
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    assigned_user_ids = (
        db.query(Employee.user_id)
        .filter(Employee.user_id.isnot(None))
        .subquery()
    )

    return (
        db.query(User)
        .filter(User.role == "employee")
        .filter(User.is_active.is_(True))
        .filter(~User.id.in_(assigned_user_ids))
        .order_by(User.username)
        .all()
    )


@router.post("/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_account(
    payload: UserRegister,
    db: Session = Depends(get_db),
    current_user=Depends(AdminOrManagerOrHR),
):
    allowed_roles = ROLE_CREATION_RULES.get(current_user.role, ["employee"])

    try:
        return AuthService.register_user(
            db=db,
            payload=payload,
            allowed_roles=allowed_roles,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = status.HTTP_400_BAD_REQUEST
        if detail == "Role not allowed":
            status_code = status.HTTP_403_FORBIDDEN
        raise HTTPException(status_code=status_code, detail=detail)
