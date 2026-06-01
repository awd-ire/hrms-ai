import uuid
from datetime import date


def test_permission_denied_admin_only(admin_auth_header, employee_auth_header, client):
    # employee cannot create department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    resp = client.post("/api/departments/", json={"name": name}, headers=employee_auth_header)
    assert resp.status_code in (401, 403)

    # employee cannot create job posting
    job = {"department_id": 1, "title": "J", "description": "x", "requirements": "x", "employment_type": "ft"}
    resp = client.post("/api/recruitment/jobs", json=job, headers=employee_auth_header)
    assert resp.status_code in (401, 403)

    # employee cannot delete employee
    resp = client.delete("/api/employees/1", headers=employee_auth_header)
    assert resp.status_code in (401, 403)


def test_validation_errors_and_bad_inputs(admin_auth_header, client):
    # missing fields for department -> 422
    resp = client.post("/api/departments/", json={"name": ""}, headers=admin_auth_header)
    assert resp.status_code == 422

    # missing title for job posting -> 422
    resp = client.post("/api/recruitment/jobs", json={"department_id": 1}, headers=admin_auth_header)
    assert resp.status_code == 422

    # bad register payload -> 422
    resp = client.post("/api/auth/register", json={"username": "x"})
    assert resp.status_code == 422

    # invalid date format when creating employee
    uid = uuid.uuid4().hex[:6]
    # create a user to attach
    r = client.post("/api/auth/register", json={"username": f"u_{uid}", "email": f"u_{uid}@example.com", "password": "password", "role": "employee"}, headers=admin_auth_header)
    assert r.status_code == 201
    user = r.json()

    bad_emp = {
        "employee_code": f"E_{uid}",
        "first_name": "Bad",
        "last_name": "Date",
        "email": user.get("email"),
        "phone": "1",
        "designation": "Dev",
        "hire_date": "not-a-date",
        "salary": 100,
        "department_id": 1,
        "manager_id": None,
        "user_id": user.get("id"),
    }
    resp = client.post("/api/employees/", json=bad_emp, headers=admin_auth_header)
    assert resp.status_code == 422


def test_duplicate_and_not_found_cases(admin_auth_header, client):
    # create unique department
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    payload = {"name": name, "code": name.lower(), "description": "dup test"}
    r = client.post("/api/departments/", json=payload, headers=admin_auth_header)
    assert r.status_code == 201

    # duplicate creation -> 400/409
    r2 = client.post("/api/departments/", json=payload, headers=admin_auth_header)
    assert r2.status_code in (400, 409)

    # get non-existent employee -> 404
    r = client.get("/api/employees/9999999", headers=admin_auth_header)
    assert r.status_code == 404

    # delete non-existent job posting -> 404
    r = client.delete("/api/recruitment/jobs/9999999", headers=admin_auth_header)
    assert r.status_code == 404


def test_unauthenticated_access(client):
    # analytics requires auth
    r = client.get("/api/analytics/company")
    assert r.status_code in (401, 422)

    # attendance check-in requires employee auth
    r = client.post("/api/attendance/check-in")
    assert r.status_code in (401, 422)
