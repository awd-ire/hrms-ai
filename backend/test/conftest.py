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

# create all tables now so the app sees the schema on startup
Base.metadata.create_all(bind=engine)

from main import app
import config


@pytest.fixture()
def client():
    # create a SAVEPOINT-like transactional scope per test
    connection = engine.connect()
    transaction = connection.begin()
    session = database.SessionLocal(bind=connection)

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
    uid = uuid.uuid4().hex[:6]
    username = f"test_{role}_{uid}"
    email = f"{username}@example.com"
    passwd = "password"

    resp = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": passwd,
            "role": role,
        },
    )
    resp.raise_for_status()

    login = client.post(
        "/api/auth/login",
        json={"username": username, "password": passwd},
    )
    login.raise_for_status()
    token = login.json().get("access_token")
    return {"username": username, "token": token}


@pytest.fixture()
def admin_auth_header(client):
    u = _create_user_and_token(client, role="admin")
    return {"Authorization": f"Bearer {u['token']}"}


@pytest.fixture()
def employee_auth_header(client):
    u = _create_user_and_token(client, role="employee")
    return {"Authorization": f"Bearer {u['token']}"}
