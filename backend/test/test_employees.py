import uuid


def test_employees_unauthenticated(client):
    resp = client.get("/api/employees/")
    assert resp.status_code in (401, 422)


def test_employees_crud_flow(admin_auth_header, client):
    # create a department
    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "Test"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201, resp.text
    department = resp.json()

    # register a user to attach to employee
    uid = uuid.uuid4().hex[:6]
    username = f"empuser_{uid}"
    email = f"{username}@example.com"
    password = "password"
    resp = client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password, "role": "employee"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201, resp.text
    user = resp.json()

    # create employee
    employee_code = f"E{uuid.uuid4().hex[:6]}"
    payload = {
        "employee_code": employee_code,
        "first_name": "Test",
        "last_name": "Employee",
        "email": email,
        "phone": "1234567890",
        "designation": "Developer",
        "hire_date": "2024-01-01",
        "salary": 1000.0,
        "department_id": department["id"],
        "manager_id": None,
        "user_id": user["id"],
    }

    resp = client.post("/api/employees/", json=payload, headers=admin_auth_header)
    assert resp.status_code == 201, resp.text
    employee = resp.json()

    emp_id = employee["id"]

    # get employee
    resp = client.get(f"/api/employees/{emp_id}", headers=admin_auth_header)
    assert resp.status_code == 200
    assert resp.json()["employee_code"] == employee_code

    # update employee
    resp = client.put(
        f"/api/employees/{emp_id}",
        json={"designation": "Senior Developer", "salary": 1500.0},
        headers=admin_auth_header,
    )
    assert resp.status_code == 200, resp.text
    updated = resp.json()
    assert updated["designation"] == "Senior Developer"

    # delete employee
    resp = client.delete(f"/api/employees/{emp_id}", headers=admin_auth_header)
    assert resp.status_code in (200, 204)

