import uuid
from datetime import date, timedelta


def test_leave_unauthenticated(client):
    resp = client.get("/api/leave/my")
    assert resp.status_code in (401, 422)


def test_leave_request_approve_reject_and_analytics(admin_auth_header, client):
    # create department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": name, "code": name.lower(), "description": "for leave tests"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    department = resp.json()

    # create manager user and login
    mid = uuid.uuid4().hex[:6]
    musername = f"mgr_{mid}"
    memail = f"{musername}@example.com"
    mpass = "password"
    resp = client.post(
        "/api/auth/register",
        json={"username": musername, "email": memail, "password": mpass, "role": "senior_manager"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    manager_user = resp.json()

    login = client.post("/api/auth/login", json={"username": musername, "password": mpass})
    assert login.status_code == 200
    mtoken = login.json().get("access_token")
    manager_headers = {"Authorization": f"Bearer {mtoken}"}

    # create manager employee profile via admin
    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"M{mid}",
            "first_name": "Team",
            "last_name": "Lead",
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

    # create employee user and login
    eid = uuid.uuid4().hex[:6]
    eusername = f"emp_{eid}"
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

    # create employee profile for this user, assigned to manager
    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"E{eid}",
            "first_name": "Test",
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

    # employee requests a leave
    sd = date.today() + timedelta(days=1)
    ed = sd + timedelta(days=2)
    payload = {
        "leave_type": "annual",
        "start_date": sd.isoformat(),
        "end_date": ed.isoformat(),
        "total_days": 3,
        "reason": "Vacation",
    }

    resp = client.post("/api/leave/request", json=payload, headers=emp_headers)
    assert resp.status_code == 201, resp.text
    leave = resp.json()

    # employee can view their leaves
    resp = client.get("/api/leave/my", headers=emp_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert any(l.get("id") == leave["id"] for l in items)

    # manager sees pending in their team
    resp = client.get("/api/leave/pending", headers=manager_headers)
    assert resp.status_code == 200
    pend = resp.json()
    assert any(l.get("id") == leave["id"] for l in pend)

    # manager approves leave
    lid = leave["id"]
    resp = client.put(f"/api/leave/{lid}/approve", headers=manager_headers)
    assert resp.status_code == 200
    approved = resp.json()
    assert approved.get("status") in ("approved", "APPROVED", "Approved")

    # create another leave to reject
    payload["start_date"] = (sd + timedelta(days=10)).isoformat()
    payload["end_date"] = (ed + timedelta(days=10)).isoformat()
    resp = client.post("/api/leave/request", json=payload, headers=emp_headers)
    assert resp.status_code == 201
    leave2 = resp.json()

    # manager rejects
    resp = client.put(f"/api/leave/{leave2['id']}/reject", json={"rejection_reason": "Not enough balance"}, headers=manager_headers)
    assert resp.status_code == 200
    rejected = resp.json()
    assert rejected.get("rejection_reason") == "Not enough balance"

    # admin analytics
    # ensure admin has an employee profile so dependency resolves
    me = client.get("/api/auth/me", headers=admin_auth_header)
    assert me.status_code == 200
    admin_user = me.json()
    # create admin employee profile if needed
    resp = client.post(
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

    # admin analytics
    resp = client.get("/api/leave/analytics", headers=admin_auth_header)
    assert resp.status_code == 200
    analytics = resp.json()
    assert "total_requests" in analytics


def test_leave_balance_and_access_control(admin_auth_header, client):
    # create department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": name, "code": name.lower(), "description": "balance test"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    department = resp.json()

    # create employee user and profile
    eid = uuid.uuid4().hex[:6]
    eusername = f"empbal_{eid}"
    eemail = f"{eusername}@example.com"
    epass = "password"
    resp = client.post(
        "/api/auth/register",
        json={"username": eusername, "email": eemail, "password": epass, "role": "employee"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    emp_user = resp.json()

    # login
    login = client.post("/api/auth/login", json={"username": eusername, "password": epass})
    assert login.status_code == 200
    etoken = login.json().get("access_token")
    emp_headers = {"Authorization": f"Bearer {etoken}"}

    # create profile via admin
    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"EB{eid}",
            "first_name": "Bal",
            "last_name": "User",
            "email": eemail,
            "phone": "000",
            "designation": "Staff",
            "hire_date": "2024-01-01",
            "salary": 0.0,
            "department_id": department["id"],
            "manager_id": None,
            "user_id": emp_user["id"],
        },
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    employee = resp.json()

    # admin can view balance
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

    resp = client.get(f"/api/leave/balance/{employee['id']}", headers=admin_auth_header)
    assert resp.status_code == 200
    bal = resp.json()
    assert bal.get("employee_id") == employee["id"]

    # self (employee) can view their balance
    resp = client.get(f"/api/leave/balance/{employee['id']}", headers=emp_headers)
    assert resp.status_code == 200

    # another employee cannot view
    other_eid = uuid.uuid4().hex[:6]
    other_user_resp = client.post(
        "/api/auth/register",
        json={"username": f"other_{other_eid}", "email": f"other_{other_eid}@example.com", "password": "password", "role": "employee"},
        headers=admin_auth_header,
    )
    assert other_user_resp.status_code == 201
    other_user = other_user_resp.json()
    other_login = client.post("/api/auth/login", json={"username": f"other_{other_eid}", "password": "password"})
    assert other_login.status_code == 200
    other_token = other_login.json().get("access_token")
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # create employee profile for the other user so request proceeds to permission check
    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"OTH{other_user['id']}",
            "first_name": "Other",
            "last_name": "User",
            "email": other_user["email"],
            "phone": "000",
            "designation": "Staff",
            "hire_date": "2024-01-01",
            "salary": 0.0,
            "department_id": department["id"],
            "manager_id": None,
            "user_id": other_user["id"],
        },
        headers=admin_auth_header,
    )
    assert resp.status_code == 201

    resp = client.get(f"/api/leave/balance/{employee['id']}", headers=other_headers)
    assert resp.status_code == 403


def test_leave_approve_reject_forbidden_for_employee(admin_auth_header, client):
    # create department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": name, "code": name.lower(), "description": "forbidden test"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    department = resp.json()

    # create employee
    eid = uuid.uuid4().hex[:6]
    eusername = f"empf_{eid}"
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

    # create profile via admin
    resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"EF{eid}",
            "first_name": "Forbid",
            "last_name": "User",
            "email": eemail,
            "phone": "000",
            "designation": "Staff",
            "hire_date": "2024-01-01",
            "salary": 0.0,
            "department_id": department["id"],
            "manager_id": None,
            "user_id": emp_user["id"],
        },
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    employee = resp.json()

    # employee requests a leave
    sd = date.today() + timedelta(days=1)
    ed = sd + timedelta(days=1)
    payload = {
        "leave_type": "sick",
        "start_date": sd.isoformat(),
        "end_date": ed.isoformat(),
        "total_days": 2,
        "reason": "Sick",
    }
    resp = client.post("/api/leave/request", json=payload, headers=emp_headers)
    assert resp.status_code == 201
    leave = resp.json()

    # employee trying to approve/reject should be forbidden
    lid = leave["id"]
    resp = client.put(f"/api/leave/{lid}/approve", headers=emp_headers)
    assert resp.status_code == 403
    resp = client.put(f"/api/leave/{lid}/reject", json={"rejection_reason": "No"}, headers=emp_headers)
    assert resp.status_code == 403


def test_leave_validation_errors(admin_auth_header, client):
    # create department and employee
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": name, "code": name.lower(), "description": "validation test"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    department = resp.json()

    eid = uuid.uuid4().hex[:6]
    eusername = f"empval_{eid}"
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
            "employee_code": f"EV{eid}",
            "first_name": "Val",
            "last_name": "User",
            "email": eemail,
            "phone": "000",
            "designation": "Staff",
            "hire_date": "2024-01-01",
            "salary": 0.0,
            "department_id": department["id"],
            "manager_id": None,
            "user_id": emp_user["id"],
        },
        headers=admin_auth_header,
    )

    # invalid total_days (<=0) should be rejected by validation
    sd = date.today() + timedelta(days=1)
    ed = sd
    bad_payload = {
        "leave_type": "annual",
        "start_date": sd.isoformat(),
        "end_date": ed.isoformat(),
        "total_days": 0,
        "reason": "Invalid",
    }
    resp = client.post("/api/leave/request", json=bad_payload, headers=emp_headers)
    assert resp.status_code in (400, 422)

    # end_date before start_date
    bad_payload["start_date"] = (sd + timedelta(days=5)).isoformat()
    bad_payload["end_date"] = sd.isoformat()
    bad_payload["total_days"] = 1
    resp = client.post("/api/leave/request", json=bad_payload, headers=emp_headers)
    assert resp.status_code in (400, 422)
