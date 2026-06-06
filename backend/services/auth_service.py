# Auth service stub
from sqlalchemy.orm import Session

from models.user import User

from schemas.auth import UserRegister
from schemas.auth import UserLogin

from core.security import hash_password
from core.security import verify_password
from core.security import create_access_token


VALID_ROLES = [
    "admin",
    "senior_manager",
    "hr_recruiter",
    "employee",
    "candidate"
]

ROLE_CREATION_RULES = {
    "admin": ["admin", "senior_manager", "hr_recruiter", "employee"],
    "senior_manager": ["hr_recruiter", "employee"],
    "hr_recruiter": ["employee"],
}


class AuthService:

    @staticmethod
    def register_user(
        db: Session,
        payload: UserRegister,
        allowed_roles: list[str] | None = None,
    ):

        existing_username = (
            db.query(User)
            .filter(User.username == payload.username)
            .first()
        )

        if existing_username:
            raise ValueError(
                "Username already exists"
            )

        existing_email = (
            db.query(User)
            .filter(User.email == payload.email)
            .first()
        )

        if existing_email:
            raise ValueError(
                "Email already exists"
            )

        permitted_roles = allowed_roles or VALID_ROLES

        if payload.role not in VALID_ROLES:
            raise ValueError(
                "Invalid role"
            )

        if payload.role not in permitted_roles:
            raise ValueError(
                "Role not allowed"
            )

        user = User(
            username=payload.username,
            email=payload.email,
            hashed_password=hash_password(
                payload.password
            ),
            role=payload.role,
            is_active=True
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def authenticate_user(
        db: Session,
        payload: UserLogin
    ):

        user = (
            db.query(User)
            .filter(User.username == payload.username)
            .first()
        )

        if not user:
            return None

        if not verify_password(
            payload.password,
            user.hashed_password
        ):
            return None

        if not user.is_active:
            return None

        return user

    @staticmethod
    def generate_token(
        user: User
    ):

        token = create_access_token(
            {
                "sub": str(user.id),
                "username": user.username,
                "role": user.role
            }
        )

        return {
            "access_token": token,
            "token_type": "bearer"
        }
