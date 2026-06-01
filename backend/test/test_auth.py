import uuid
import pytest


def test_register_and_login(client):
    uid = uuid.uuid4().hex[:6]
    username = f"tester_py_{uid}"
    email = f"{username}@example.com"
    password = "password"
    role = "employee"

    # Register
    resp = client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": password,
        "role": role
    })
    assert resp.status_code == 201, resp.text
    user = resp.json()
    assert user["username"] == username
    assert user["email"] == email
    assert "id" in user

    # Login
    resp = client.post("/api/auth/login", json={
        "username": username,
        "password": password
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()
    assert "access_token" in token
    assert token.get("token_type") == "bearer"


def test_me_refresh_logout(client):
    uid = uuid.uuid4().hex[:6]
    username = f"tester_me_{uid}"
    email = f"{username}@example.com"
    password = "password"
    role = "employee"

    # Register
    resp = client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": password,
        "role": role,
    })
    assert resp.status_code == 201, resp.text

    # Login
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # explicit /me
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    me = resp.json()
    assert me["username"] == username

    # refresh
    resp = client.post("/api/auth/refresh", headers=headers)
    assert resp.status_code == 200
    assert "access_token" in resp.json() or "token_type" in resp.json()

    # logout
    resp = client.post("/api/auth/logout", headers=headers)
    assert resp.status_code == 200
    assert resp.json().get("message")