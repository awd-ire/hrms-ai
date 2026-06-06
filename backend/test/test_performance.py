def test_performance_unauthenticated(client):
    resp = client.get("/api/performance/my")
    assert resp.status_code in (401, 422)


def test_performance_team_admin(admin_auth_header, client):
    # ensure admin has an employee profile so dependency resolves
    import uuid

    me = client.get("/api/auth/me", headers=admin_auth_header)
    assert me.status_code == 200
    admin_user = me.json()

    # create a department for the admin profile
    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "for admin profile"},
        headers=admin_auth_header,
    )
    assert dresp.status_code == 201
    department = dresp.json()

    # create admin employee profile (idempotent if exists)
    eres = client.post(
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
    assert eres.status_code in (200, 201)

    resp = client.get("/api/performance/team", headers=admin_auth_header)
    assert resp.status_code == 200


def test_performance_create_and_flow(admin_auth_header, client):
    import uuid
    from datetime import date

    # create department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": name, "code": name.lower(), "description": "perf test"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    department = resp.json()

    # create manager
    mid = uuid.uuid4().hex[:6]
    musername = f"mgrp_{mid}"
    memail = f"{musername}@example.com"
    mpass = "password"
    resp = client.post(
        "/api/users/create",
        json={"username": musername, "email": memail, "password": mpass, "role": "senior_manager"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    manager_user = resp.json()

    login = client.post("/api/auth/login", json={"username": musername, "password": mpass})
    assert login.status_code == 200
    mtoken = login.json().get("access_token")
    manager_headers = {"Authorization": f"Bearer {mtoken}"}

    # create manager employee profile
    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"M{mid}",
            "first_name": "Perf",
            "last_name": "Manager",
            "email": memail,
            "phone": "000",
            "designation": "Manager",
            "hire_date": "2024-01-01",
            "salary": 0.0,
            "department_id": department["id"],
            "manager_id": None,
            "user_id": manager_user["id"],
        },
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    manager_emp = resp.json()

    # create employee
    eid = uuid.uuid4().hex[:6]
    eusername = f"perfe_{eid}"
    eemail = f"{eusername}@example.com"
    epass = "password"
    resp = client.post(
        "/api/auth/register",
        json={"username": eusername, "email": eemail, "password": epass, "role": "employee"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    emp_user = resp.json()

    login = client.post("/api/auth/login", json={"username": eusername, "password": epass})
    assert login.status_code == 200
    etoken = login.json().get("access_token")
    emp_headers = {"Authorization": f"Bearer {etoken}"}

    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"E{eid}",
            "first_name": "Perf",
            "last_name": "Employee",
            "email": eemail,
            "phone": "000",
            "designation": "Staff",
            "hire_date": "2024-01-01",
            "salary": 0.0,
            "department_id": department["id"],
            "manager_id": manager_emp["id"],
            "user_id": emp_user["id"],
        },
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    employee = resp.json()

    # manager creates performance review for employee
    payload = {
        "employee_id": employee["id"],
        "review_period": "Q1 2024",
        "review_date": date.today().isoformat(),
        "rating": 4.5,
        "strengths": "Good",
        "improvements": "None",
        "goals": "Keep going",
        "status": "submitted",
    }
    resp = client.post("/api/performance/review", json=payload, headers=manager_headers)
    assert resp.status_code == 201
    review = resp.json()

    # employee can view /my
    resp = client.get("/api/performance/my", headers=emp_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert any(r.get("id") == review["id"] for r in items)

    # manager /team
    resp = client.get("/api/performance/team", headers=manager_headers)
    assert resp.status_code == 200
    team_items = resp.json()
    assert any(r.get("id") == review["id"] for r in team_items)

    # manager updates review (e.g., change status to approved)
    resp = client.put(f"/api/performance/{review['id']}", json={"status": "approved"}, headers=manager_headers)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated.get("status") == "approved"

    # ensure admin has an employee profile for analytics dependency
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

    # analytics
    resp = client.get("/api/performance/analytics", headers=admin_auth_header)
    assert resp.status_code == 200
    analytics = resp.json()
    assert "total_reviews" in analytics


def test_performance_create_forbidden_for_employee(employee_auth_header, client):
    # employee trying to create review should be forbidden
    resp = client.post("/api/performance/review", json={"employee_id": 1, "review_period": "Q1", "review_date": "2024-01-01", "rating": 3}, headers=employee_auth_header)
    assert resp.status_code == 403
