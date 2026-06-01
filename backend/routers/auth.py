from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from sqlalchemy.orm import Session

from config import settings

from database import get_db

from schemas.auth import UserRegister
from schemas.auth import UserLogin
from schemas.auth import UserResponse
from schemas.auth import TokenResponse

from services.auth_service import AuthService

from core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db)
):

    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled outside development mode",
        )

    try:

        user = AuthService.register_user(
            db=db,
            payload=payload
        )

        return user

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db)
):

    user = AuthService.authenticate_user(
        db=db,
        payload=payload
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    return AuthService.generate_token(
        user
    )


@router.get(
    "/me",
    response_model=UserResponse
)
def current_user(
    user=Depends(get_current_user)
):
    return user


@router.post("/logout")
def logout():
    return {
        "message": "Logout successful. Remove token on client side."
    }


@router.post("/refresh")
def refresh_token(
    user=Depends(get_current_user)
):

    token = AuthService.generate_token(
        user
    )

    return token