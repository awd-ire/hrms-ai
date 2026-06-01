from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import ConfigDict


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    username: str
    email: str
    role: str
    is_active: bool