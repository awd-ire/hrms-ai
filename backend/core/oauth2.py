from fastapi.security import OAuth2PasswordBearer

# Allow optional token retrieval for endpoints that want to accept anonymous
# access while still supporting authenticated requests when a token is provided.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,
)