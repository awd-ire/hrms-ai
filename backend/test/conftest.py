import sys
import pathlib
import uuid

import pytest
from fastapi.testclient import TestClient

# ensure backend package root is on sys.path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

# setup a fresh in-memory SQLite DB for tests BEFORE importing the app
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from database import Base
import database
from core.security import create_access_token
from core.security import hash_password
from models.user import User

# import models so they register with Base.metadata
import models

# create a new in-memory engine and bind SessionLocal to it
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
database.engine = engine
database.SessionLocal.configure(bind=engine)
_CURRENT_TEST_SESSION = None

# create all tables now so the app sees the schema on startup
Base.metadata.create_all(bind=engine)

from main import app
import config


@pytest.fixture()
def client():
    global _CURRENT_TEST_SESSION

    # create a SAVEPOINT-like transactional scope per test
    connection = engine.connect()
    transaction = connection.begin()
    session = database.SessionLocal(bind=connection)
    _CURRENT_TEST_SESSION = session

    def override_get_db():
        try:
            yield session
        finally:
            session.close()

    # override the app dependency to use the test session
    from database import get_db as _get_db
    app.dependency_overrides[_get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    # rollback transaction and cleanup
    transaction.rollback()
    connection.close()
    _CURRENT_TEST_SESSION = None
    app.dependency_overrides.pop(_get_db, None)


@pytest.fixture(autouse=True)
def enable_registration():
    # ensure registration allowed during tests
    try:
        original = config.settings.DEBUG
        config.settings.DEBUG = True
    except Exception:
        original = None
    yield
    if original is not None:
        config.settings.DEBUG = original


def _create_user_and_token(client, role: str = "admin"):
    session = _CURRENT_TEST_SESSION or database.SessionLocal()
    uid = uuid.uuid4().hex[:6]
    username = f"test_{role}_{uid}"
    email = f"{username}@example.com"
    passwd = "password"

    try:
        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(passwd),
            role=role,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        token = create_access_token(
            {
                "sub": str(user.id),
                "username": user.username,
                "role": user.role,
            }
        )
    finally:
        if session is not _CURRENT_TEST_SESSION:
            session.close()

    return {"username": username, "token": token}


@pytest.fixture()
def admin_auth_header(client):
    u = _create_user_and_token(client, role="admin")
    return {"Authorization": f"Bearer {u['token']}"}


@pytest.fixture()
def employee_auth_header(client):
    u = _create_user_and_token(client, role="employee")
    return {"Authorization": f"Bearer {u['token']}"}
