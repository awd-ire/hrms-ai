def test_payroll_unauthenticated(client):
    resp = client.get("/api/payroll/my")
    assert resp.status_code in (401, 422)


def test_payroll_analytics_admin(admin_auth_header, client):
    resp = client.get("/api/payroll/analytics", headers=admin_auth_header)
    assert resp.status_code == 200


def test_payroll_generate_process_payslip(admin_auth_header, client):
    import uuid

    # create department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": name, "code": name.lower(), "description": "payroll test"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    department = resp.json()

    # create employee user and profile
    eid = uuid.uuid4().hex[:6]
    eusername = f"pay_{eid}"
    eemail = f"{eusername}@example.com"
    epass = "password"
    resp = client.post(
        "/api/auth/register",
        json={"username": eusername, "email": eemail, "password": epass, "role": "employee"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    emp_user = resp.json()

    # create employee profile (with salary)
    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"P{eid}",
            "first_name": "Pay",
            "last_name": "User",
            "email": eemail,
            "phone": "000",
            "designation": "Staff",
            "hire_date": "2024-01-01",
            "salary": 2000.0,
            "department_id": department["id"],
            "manager_id": None,
            "user_id": emp_user["id"],
        },
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    employee = resp.json()

    # generate payroll (admin)
    payload = {"payroll_month": "January", "payroll_year": 2024}
    resp = client.post("/api/payroll/generate", json=payload, headers=admin_auth_header)
    assert resp.status_code == 200
    created = resp.json()
    assert isinstance(created, list) and len(created) >= 1
    # find payroll for our employee
    pr = next((p for p in created if p.get("employee_id") == employee["id"]), None)
    assert pr is not None
    payroll_id = pr["id"]
    assert pr["status"] == "generated"

    # process payroll (admin)
    resp = client.put(f"/api/payroll/{payroll_id}/process", headers=admin_auth_header)
    assert resp.status_code == 200
    processed = resp.json()
    assert processed.get("status") == "processed"

    # analytics
    resp = client.get("/api/payroll/analytics", headers=admin_auth_header)
    assert resp.status_code == 200
    analytics = resp.json()
    assert "total_records" in analytics

    # employee can access their payslip via login
    login = client.post("/api/auth/login", json={"username": eusername, "password": epass})
    assert login.status_code == 200
    etoken = login.json().get("access_token")
    emp_headers = {"Authorization": f"Bearer {etoken}"}

    # employee /my
    resp = client.get("/api/payroll/my", headers=emp_headers)
    assert resp.status_code == 200
    my_list = resp.json()
    assert any(p.get("id") == payroll_id for p in my_list)

    # employee payslip
    resp = client.get(f"/api/payroll/{payroll_id}/payslip", headers=emp_headers)
    assert resp.status_code == 200


def test_payroll_generate_forbidden_for_employee(employee_auth_header, client):
    payload = {"payroll_month": "February", "payroll_year": 2024}
    resp = client.post("/api/payroll/generate", json=payload, headers=employee_auth_header)
    assert resp.status_code == 403
