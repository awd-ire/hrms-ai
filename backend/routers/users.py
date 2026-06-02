from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.permissions import AdminOrManagerOrHR
from database import get_db
from models.employee import Employee
from models.user import User
from schemas.auth import UserResponse

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
