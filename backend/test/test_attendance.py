def test_attendance_unauthenticated(client):
    resp = client.get("/api/attendance/my")
    assert resp.status_code in (401, 422)


import pytest


def test_attendance_team_admin(admin_auth_header, client):
    # ensure the admin user has an Employee profile so dependencies succeed
    me = client.get("/api/auth/me", headers=admin_auth_header)
    assert me.status_code == 200
    user = me.json()

    # create a department
    dept = client.post(
        "/api/departments/",
        json={"name": "TeamDept", "code": "teamdept", "description": "test"},
        headers=admin_auth_header,
    )
    assert dept.status_code == 201
    department = dept.json()

    # create employee record for current user
    payload = {
        "employee_code": f"E{user['id']}",
        "first_name": "Admin",
        "last_name": "User",
        "email": user["email"],
        "phone": "000",
        "designation": "Admin",
        "hire_date": "2024-01-01",
        "salary": 0.0,
        "department_id": department["id"],
        "manager_id": None,
        "user_id": user["id"],
    }

    resp = client.post("/api/employees/", json=payload, headers=admin_auth_header)
    assert resp.status_code == 201

    # now call team endpoint
    resp = client.get("/api/attendance/team", headers=admin_auth_header)
    assert resp.status_code == 200


def test_employee_check_in_out_and_my(employee_auth_header, admin_auth_header, client):
    # ensure employee has profile
    me = client.get("/api/auth/me", headers=employee_auth_header)
    assert me.status_code == 200
    user = me.json()

    # create dept and employee profile
    dept = client.post(
        "/api/departments/",
        json={"name": "EmpDept", "code": "empdept", "description": "test"},
        headers=admin_auth_header,
    )
    # department creation may require admin; if forbidden, create via admin flow in other tests
    if dept.status_code not in (200, 201):
        # create via registration and admin in previous tests; attempt a fallback name lookup
        dept = client.get("/api/departments/", headers=employee_auth_header)
        items = dept.json() if dept.status_code == 200 else []
        department_id = items[0]["id"] if items else None
    else:
        department_id = dept.json()["id"]

    if department_id is None:
        pytest.skip("No department available for employee creation")

    payload = {
        "employee_code": f"E{user['id']}",
        "first_name": "Emp",
        "last_name": "User",
        "email": user["email"],
        "phone": "000",
        "designation": "Staff",
        "hire_date": "2024-01-01",
        "salary": 0.0,
        "department_id": department_id,
        "manager_id": None,
        "user_id": user["id"],
    }

    # create employee profile using admin privileges
    resp = client.post("/api/employees/", json=payload, headers=admin_auth_header)
    assert resp.status_code == 201

    # check-in
    resp = client.post("/api/attendance/check-in", headers=employee_auth_header)
    assert resp.status_code == 200
    record = resp.json()
    assert "id" in record

    # my attendance should include this
    resp = client.get("/api/attendance/my", headers=employee_auth_header)
    assert resp.status_code == 200
    items = resp.json()
    assert any(r.get("id") == record["id"] for r in items)

    # check-out
    resp = client.post("/api/attendance/check-out", headers=employee_auth_header)
    assert resp.status_code == 200


def test_attendance_admin_analytics_and_correct(admin_auth_header, client):
    # create a new employee user
    import uuid

    uid = uuid.uuid4().hex[:6]
    username = f"att_emp_{uid}"
    email = f"{username}@example.com"
    password = "password"

    resp = client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password, "role": "employee"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    user = resp.json()

    # login to get employee token
    login = client.post("/api/auth/login", json={"username": username, "password": password})
    assert login.status_code == 200
    token = login.json().get("access_token")
    emp_headers = {"Authorization": f"Bearer {token}"}

    # create department via admin
    dept = client.post(
        "/api/departments/",
        json={"name": f"Dept_{uid}", "code": f"dept_{uid}", "description": "test"},
        headers=admin_auth_header,
    )
    assert dept.status_code == 201
    department = dept.json()

    # create employee profile for the new user
    payload = {
        "employee_code": f"E{uid}",
        "first_name": "New",
        "last_name": "Employee",
        "email": email,
        "phone": "000",
        "designation": "Staff",
        "hire_date": "2024-01-01",
        "salary": 0.0,
        "department_id": department["id"],
        "manager_id": None,
        "user_id": user["id"],
    }
    resp = client.post("/api/employees/", json=payload, headers=admin_auth_header)
    assert resp.status_code == 201
    employee = resp.json()

    # employee does check-in/out
    resp = client.post("/api/attendance/check-in", headers=emp_headers)
    assert resp.status_code == 200
    resp = client.post("/api/attendance/check-out", headers=emp_headers)
    assert resp.status_code == 200

    # admin analytics
    # ensure admin has an employee profile so dependency resolves
    me = client.get("/api/auth/me", headers=admin_auth_header)
    assert me.status_code == 200
    admin_user = me.json()
    client.post(
        "/api/employees/",
        json={
            "employee_code": f"ADM{admin_user['id']}",
            "first_name": "Admin",
            "last_name": "User",
            "email": admin_user["email"],
            "phone": "000",
            "designation": "Admin",
            "hire_date": "2024-01-01",
            "salary": 0.0,
            "department_id": department["id"],
            "manager_id": None,
            "user_id": admin_user["id"],
        },
        headers=admin_auth_header,
    )

    resp = client.get("/api/attendance/analytics", headers=admin_auth_header)
    assert resp.status_code == 200
    analytics = resp.json()
    assert "total_records" in analytics

    # get employee attendance
    resp = client.get(f"/api/attendance/employee/{employee['id']}", headers=admin_auth_header)
    assert resp.status_code == 200
    records = resp.json()
    assert isinstance(records, list) and len(records) >= 1

    att_id = records[0]["id"]

    # correct attendance
    payload = {"check_in": "08:00:00", "check_out": "17:00:00", "remarks": "Adjusted"}
    resp = client.put(f"/api/attendance/{att_id}/correct", json=payload, headers=admin_auth_header)
    assert resp.status_code == 200
    corrected = resp.json()
    assert corrected.get("remarks") == "Adjusted"
