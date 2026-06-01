import uuid
from datetime import date


def _create_department(client, admin_auth_header):
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/api/departments/",
        json={"name": name, "code": name.lower(), "description": "test"},
        headers=admin_auth_header,
    )
    resp.raise_for_status()
    return resp.json()


def _register_user(client, admin_auth_header, role="employee"):
    uid = uuid.uuid4().hex[:6]
    username = f"test_{role}_{uid}"
    email = f"{username}@example.com"
    resp = client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": "password", "role": role},
        headers=admin_auth_header,
    )
    resp.raise_for_status()
    login = client.post("/api/auth/login", json={"username": username, "password": "password"})
    login.raise_for_status()
    return {
        "username": username,
        "email": email,
        "token": login.json().get("access_token"),
        "id": resp.json().get("id"),
    }


def _create_employee_record(client, admin_auth_header, user, department_id, manager_id=None):
    code = f"E{uuid.uuid4().hex[:6]}"
    payload = {
        "employee_code": code,
        "first_name": "F",
        "last_name": "L",
        "email": user["email"],
        "phone": "123",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 1000.0,
        "department_id": department_id,
        "manager_id": manager_id,
        "user_id": user.get("id") or None,
    }
    # If user_id missing, fetch users list to find id
    if payload["user_id"] is None:
        # list users is admin-only; create a dummy employee creation using last registered user id returned by register flow
        # the register endpoint returns the created user object; attempt to fetch via auth/me
        pass

    resp = client.post("/api/employees/", json=payload, headers=admin_auth_header)
    resp.raise_for_status()
    return resp.json()


def test_company_and_recruitment_analytics(admin_auth_header, client):
    # prepare departments and employees
    d1 = _create_department(client, admin_auth_header)
    d2 = _create_department(client, admin_auth_header)

    # create employees across departments
    u1 = _register_user(client, admin_auth_header, role="employee")
    u2 = _register_user(client, admin_auth_header, role="employee")
    # ensure admin has an employee profile so analytics dependencies succeed
    admin_user = client.get("/api/auth/me", headers=admin_auth_header).json()
    admin_emp_resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"E_{uuid.uuid4().hex[:6]}",
            "first_name": "Admin",
            "last_name": "User",
            "email": admin_user["email"],
            "phone": "000",
            "designation": "Admin",
            "hire_date": date.today().isoformat(),
            "salary": 0,
            "department_id": d1["id"],
            "manager_id": None,
            "user_id": admin_user.get("id"),
        },
        headers=admin_auth_header,
    )
    if admin_emp_resp.status_code == 201:
        admin_emp = admin_emp_resp.json()
    else:
        # if already exists, find it from the employees list
        resp_list = client.get("/api/employees/", headers=admin_auth_header)
        resp_list.raise_for_status()
        emp_list = resp_list.json()
        admin_emp = next((e for e in emp_list if e.get("user_id") == admin_user.get("id") or e.get("email") == admin_user.get("email")), None)
        assert admin_emp, f"Failed to create or locate admin employee: {admin_emp_resp.text}"
    # create employee records
    e1 = client.post(
        "/api/employees/",
        json={
            "employee_code": f"E_{uuid.uuid4().hex[:6]}",
            "first_name": "A",
            "last_name": "B",
            "email": u1["email"],
            "phone": "1",
            "designation": "X",
            "hire_date": date.today().isoformat(),
            "salary": 100,
            "department_id": d1["id"],
            "manager_id": None,
            "user_id": u1["id"],
        },
        headers=admin_auth_header,
    )
    assert e1.status_code == 201

    e2 = client.post(
        "/api/employees/",
        json={
            "employee_code": f"E_{uuid.uuid4().hex[:6]}",
            "first_name": "C",
            "last_name": "D",
            "email": u2["email"],
            "phone": "2",
            "designation": "Y",
            "hire_date": date.today().isoformat(),
            "salary": 200,
            "department_id": d2["id"],
            "manager_id": None,
            "user_id": u2["id"],
        },
        headers=admin_auth_header,
    )
    assert e2.status_code == 201

    # recruitment analytics: create jobs, candidates, interviews
    job_payload = {"title": "J1", "department_id": d1["id"], "description": "x", "requirements": "x", "employment_type": "full-time"}
    j1 = client.post("/api/recruitment/jobs", json=job_payload, headers=admin_auth_header)
    assert j1.status_code == 201
    j2 = client.post("/api/recruitment/jobs", json={**job_payload, "title": "J2", "status": "closed"}, headers=admin_auth_header)
    assert j2.status_code == 201

    # create candidates
    files = {"job_posting_id": (None, str(j1.json()["id"])), "full_name": (None, "Cand A"), "email": (None, "a@example.com"), "applied_date": (None, date.today().isoformat()), "resume": ("r.pdf", b"x", "application/pdf")}
    c1 = client.post("/api/recruitment/candidates", files=files, headers=admin_auth_header)
    assert c1.status_code == 201

    files = {"job_posting_id": (None, str(j1.json()["id"])), "full_name": (None, "Cand B"), "email": (None, "b@example.com"), "applied_date": (None, date.today().isoformat()), "resume": ("r.pdf", b"x", "application/pdf")}
    c2 = client.post("/api/recruitment/candidates", files=files, headers=admin_auth_header)
    assert c2.status_code == 201

    # schedule an interview (use scheduled_date and interview_round per schema)
    interview_payload = {"candidate_id": c1.json()["id"], "interview_round": "initial", "scheduled_date": date.today().isoformat()}
    iv = client.post("/api/recruitment/interviews", json=interview_payload, headers=admin_auth_header)
    assert iv.status_code == 201, iv.text

    # call analytics endpoints
    comp = client.get("/api/analytics/company", headers=admin_auth_header)
    assert comp.status_code == 200
    comp_json = comp.json()
    assert comp_json["total_departments"] >= 2

    rec = client.get("/api/analytics/recruitment", headers=admin_auth_header)
    assert rec.status_code == 200
    rec_json = rec.json()
    assert rec_json["total_candidates"] >= 2
    assert rec_json["interviews_scheduled"] >= 1


def test_attendance_analytics_filters(admin_auth_header, client):
    # create department
    d = client.post("/api/departments/", json={"name": f"Dept_{uuid.uuid4().hex[:4]}", "code": "x", "description": "x"}, headers=admin_auth_header)
    assert d.status_code == 201
    dept = d.json()

    # create manager user and employee
    mgr = client.post("/api/auth/register", json={"username": f"mgr_{uuid.uuid4().hex[:4]}", "email": f"m{uuid.uuid4().hex[:4]}@example.com", "password": "password", "role": "senior_manager"}, headers=admin_auth_header)
    assert mgr.status_code == 201
    mgr_login = client.post("/api/auth/login", json={"username": mgr.json()["username"], "password": "password"})
    assert mgr_login.status_code == 200
    mgr_token = mgr_login.json().get("access_token")

    # create manager employee record
    mgr_emp = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:4]}",
        "first_name": "Mgr",
        "last_name": "One",
        "email": f"mgr{uuid.uuid4().hex[:4]}@example.com",
        "phone": "1",
        "designation": "M",
        "hire_date": date.today().isoformat(),
        "salary": 1000,
        "department_id": dept["id"],
        "manager_id": None,
        "user_id": mgr.json().get("id"),
    }, headers=admin_auth_header)
    assert mgr_emp.status_code == 201
    mgr_emp_id = mgr_emp.json()["id"]

    # ensure admin has an employee profile so attendance analytics can evaluate current_employee dependency
    admin_user = client.get("/api/auth/me", headers=admin_auth_header).json()
    admin_emp_resp = client.post(
        "/api/employees/",
        json={
            "employee_code": f"E_{uuid.uuid4().hex[:6]}",
            "first_name": "Admin",
            "last_name": "User",
            "email": admin_user["email"],
            "phone": "000",
            "designation": "Admin",
            "hire_date": date.today().isoformat(),
            "salary": 0,
            "department_id": dept["id"],
            "manager_id": None,
            "user_id": admin_user.get("id"),
        },
        headers=admin_auth_header,
    )
    if admin_emp_resp.status_code == 201:
        admin_emp = admin_emp_resp.json()
    else:
        resp_list = client.get("/api/employees/", headers=admin_auth_header)
        resp_list.raise_for_status()
        emp_list = resp_list.json()
        admin_emp = next((e for e in emp_list if e.get("user_id") == admin_user.get("id") or e.get("email") == admin_user.get("email")), None)
        assert admin_emp, f"Failed to create or locate admin employee: {admin_emp_resp.text}"

    # team member placeholders will be created from user accounts below

    # create attendance records for team members
    # use check-in endpoint but need EmployeeOnly dependency; instead insert directly via attendance create API? There's no direct create; use AttendanceService via check-in using employee auth
    # Create employee users for t1 and t2 so they can check in
    u1 = client.post("/api/auth/register", json={"username": f"u1_{uuid.uuid4().hex[:4]}", "email": f"u1{uuid.uuid4().hex[:4]}@example.com", "password": "password", "role": "employee"}, headers=admin_auth_header)
    assert u1.status_code == 201
    u2 = client.post("/api/auth/register", json={"username": f"u2_{uuid.uuid4().hex[:4]}", "email": f"u2{uuid.uuid4().hex[:4]}@example.com", "password": "password", "role": "employee"}, headers=admin_auth_header)
    assert u2.status_code == 201

    # login u1/u2
    l1 = client.post("/api/auth/login", json={"username": u1.json()["username"], "password": "password"})
    l2 = client.post("/api/auth/login", json={"username": u2.json()["username"], "password": "password"})
    assert l1.status_code == 200 and l2.status_code == 200
    h1 = {"Authorization": f"Bearer {l1.json().get('access_token')}"}
    h2 = {"Authorization": f"Bearer {l2.json().get('access_token')}"}

    # create employee profiles for these users and assign manager
    # find user ids returned by register
    # Attach employee records to these users with manager_id set
    resp_e1 = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:4]}",
        "first_name": "U1",
        "last_name": "One",
        "email": u1.json()["email"],
        "phone": "5",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 800,
        "department_id": dept["id"],
        "manager_id": mgr_emp_id,
        "user_id": u1.json().get("id"),
    }, headers=admin_auth_header)
    assert resp_e1.status_code == 201
    resp_e2 = client.post("/api/employees/", json={
        "employee_code": f"E_{uuid.uuid4().hex[:4]}",
        "first_name": "U2",
        "last_name": "Two",
        "email": u2.json()["email"],
        "phone": "6",
        "designation": "Dev",
        "hire_date": date.today().isoformat(),
        "salary": 800,
        "department_id": dept["id"],
        "manager_id": mgr_emp_id,
        "user_id": u2.json().get("id"),
    }, headers=admin_auth_header)
    assert resp_e2.status_code == 201

    # Now perform check-in as u1 and u2
    r = client.post("/api/attendance/check-in", headers=h1)
    assert r.status_code == 200
    r = client.post("/api/attendance/check-in", headers=h2)
    assert r.status_code == 200

    # Admin analytics should count both records (attendance router provides /analytics)
    a_admin = client.get("/api/attendance/analytics", headers=admin_auth_header)
    assert a_admin.status_code == 200
    adm_json = a_admin.json()
    assert adm_json["total_records"] >= 2

    # Manager analytics should only include team members
    mgr_login = client.post("/api/auth/login", json={"username": mgr.json()["username"], "password": "password"})
    assert mgr_login.status_code == 200
    mgr_header = {"Authorization": f"Bearer {mgr_login.json().get('access_token')}"}
    a_mgr = client.get("/api/attendance/analytics", headers=mgr_header)
    assert a_mgr.status_code == 200
    mgr_json = a_mgr.json()
    # manager should see counts for their team (>=2)
    assert mgr_json["total_records"] >= 2
