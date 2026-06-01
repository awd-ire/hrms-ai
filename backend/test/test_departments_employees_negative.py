import uuid
from datetime import date


def test_department_permission_and_validation(admin_auth_header, employee_auth_header, client):
    # employee cannot create department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    payload = {"name": name, "code": name.lower(), "description": "nope"}
    resp = client.post("/api/departments/", json=payload, headers=employee_auth_header)
    assert resp.status_code in (403, 401)

    # missing fields -> 422
    resp = client.post("/api/departments/", json={"name": ""}, headers=admin_auth_header)
    assert resp.status_code == 422

    # create department then attempt delete while employees exist
    resp = client.post("/api/departments/", json=payload, headers=admin_auth_header)
    assert resp.status_code == 201
    dept = resp.json()

    # create user and employee assigned to this department
    uid = uuid.uuid4().hex[:6]
    username = f"emp_{uid}"
    email = f"{username}@example.com"
    r = client.post("/api/auth/register", json={"username": username, "email": email, "password": "password", "role": "employee"}, headers=admin_auth_header)
    assert r.status_code == 201
    user = r.json()

    emp_payload = {
        "employee_code": f"E_{uuid.uuid4().hex[:6]}",
        "first_name": "X",
        "last_name": "Y",
        "email": email,
        "phone": "1",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 100,
        "department_id": dept["id"],
        "manager_id": None,
        "user_id": user.get("id"),
    }
    er = client.post("/api/employees/", json=emp_payload, headers=admin_auth_header)
    assert er.status_code == 201

    # deleting department with assigned employee should fail
    dr = client.delete(f"/api/departments/{dept['id']}", headers=admin_auth_header)
    assert dr.status_code in (400, 422)


def test_employee_permission_and_invalid_inputs(admin_auth_header, employee_auth_header, client):
    # employee cannot create another employee (AdminOnly)
    uid = uuid.uuid4().hex[:6]
    resp = client.post("/api/employees/", json={
        "employee_code": f"E_{uid}",
        "first_name": "No",
        "last_name": "Perm",
        "email": f"nop{uid}@example.com",
        "phone": "1",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 100,
        "department_id": 1,
        "manager_id": None,
        "user_id": 99999,
    }, headers=employee_auth_header)
    assert resp.status_code in (403, 401)

    # admin creating employee with invalid user id
    invalid = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:6]}",
        "first_name": "Bad",
        "last_name": "User",
        "email": "bad@example.com",
        "phone": "1",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 100,
        "department_id": 1,
        "manager_id": None,
        "user_id": 999999,
    }, headers=admin_auth_header)
    assert invalid.status_code == 400

    # admin creating employee with invalid department
    # first create a user to attach
    uid2 = uuid.uuid4().hex[:6]
    r = client.post("/api/auth/register", json={"username": f"u_{uid2}", "email": f"u_{uid2}@example.com", "password": "password", "role": "employee"}, headers=admin_auth_header)
    assert r.status_code == 201
    user = r.json()

    invalid_dept = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:6]}",
        "first_name": "Bad",
        "last_name": "Dept",
        "email": user.get("email"),
        "phone": "1",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 100,
        "department_id": 999999,
        "manager_id": None,
        "user_id": user.get("id"),
    }, headers=admin_auth_header)
    assert invalid_dept.status_code == 400

    # creating employee with non-existent manager id
    # create a valid department
    dresp = client.post("/api/departments/", json={"name": f"Dept_{uuid.uuid4().hex[:6]}", "code": uuid.uuid4().hex[:6], "description": "x"}, headers=admin_auth_header)
    assert dresp.status_code == 201
    dept = dresp.json()

    invalid_mgr = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:6]}",
        "first_name": "Bad",
        "last_name": "Mgr",
        "email": f"mgrbad{uuid.uuid4().hex[:4]}@example.com",
        "phone": "1",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 100,
        "department_id": dept["id"],
        "manager_id": 9999999,
        "user_id": user.get("id"),
    }, headers=admin_auth_header)
    assert invalid_mgr.status_code == 400

    # update employee with invalid department
    # create a valid employee properly
    good = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:6]}",
        "first_name": "G",
        "last_name": "Good",
        "email": f"good{uuid.uuid4().hex[:4]}@example.com",
        "phone": "1",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 100,
        "department_id": dept["id"],
        "manager_id": None,
        "user_id": user.get("id"),
    }, headers=admin_auth_header)
    assert good.status_code == 201
    emp = good.json()

    upr = client.put(f"/api/employees/{emp['id']}", json={"department_id": 99999999}, headers=admin_auth_header)
    assert upr.status_code == 400

    # deleting non-existent employee
    dr = client.delete("/api/employees/9999999", headers=admin_auth_header)
    assert dr.status_code in (404, 400)

    # non-admin cannot delete employee
    # create another employee to attempt deletion
    # register a fresh user so we can create a second employee profile
    uid3 = uuid.uuid4().hex[:6]
    r3 = client.post("/api/auth/register", json={"username": f"u3_{uid3}", "email": f"u3_{uid3}@example.com", "password": "password", "role": "employee"}, headers=admin_auth_header)
    assert r3.status_code == 201
    new_user = r3.json()

    other = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:6]}",
        "first_name": "O",
        "last_name": "Other",
        "email": f"other{uuid.uuid4().hex[:4]}@example.com",
        "phone": "1",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 100,
        "department_id": dept["id"],
        "manager_id": None,
        "user_id": new_user.get("id"),
    }, headers=admin_auth_header)
    assert other.status_code == 201

    odr = client.delete(f"/api/employees/{other.json()['id']}", headers=employee_auth_header)
    assert odr.status_code in (403, 401)
