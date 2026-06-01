def test_recruitment_unauthenticated(client):
    resp = client.get("/api/recruitment/jobs")
    assert resp.status_code in (401, 422)


def test_recruitment_jobs_admin(admin_auth_header, client):
    resp = client.get("/api/recruitment/jobs", headers=admin_auth_header)
    assert resp.status_code == 200


def test_recruitment_full_flow(admin_auth_header, client):
    import uuid
    from datetime import date

    # create department
    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "recruit test"},
        headers=admin_auth_header,
    )
    assert dresp.status_code == 201
    department = dresp.json()

    # create job posting
    job_payload = {
        "title": "Software Engineer",
        "department_id": department["id"],
        "description": "Do things",
        "requirements": "Python",
        "employment_type": "full-time",
        "location": "Remote",
        "salary_range": "50k-70k",
    }
    resp = client.post("/api/recruitment/jobs", json=job_payload, headers=admin_auth_header)
    assert resp.status_code == 201
    job = resp.json()

    # create candidate via multipart/form-data (resume upload)
    files = {
        "job_posting_id": (None, str(job["id"])),
        "full_name": (None, "Jane Candidate"),
        "email": (None, "jane@example.com"),
        "applied_date": (None, date.today().isoformat()),
        "resume": ("resume.pdf", b"PDFDATA", "application/pdf"),
    }
    cresp = client.post("/api/recruitment/candidates", files=files, headers=admin_auth_header)
    assert cresp.status_code == 201, cresp.text
    candidate = cresp.json()

    # schedule interview
    interview_payload = {
        "candidate_id": candidate["id"],
        "interview_round": "phone",
        "scheduled_date": date.today().isoformat(),
    }
    iresp = client.post("/api/recruitment/interviews", json=interview_payload, headers=admin_auth_header)
    assert iresp.status_code == 201
    interview = iresp.json()

    # update interview feedback
    feedback_payload = {"feedback": "Good", "score": 4.0, "recommendation": "hire", "status": "completed"}
    fresp = client.put(f"/api/recruitment/interviews/{interview['id']}/feedback", json=feedback_payload, headers=admin_auth_header)
    assert fresp.status_code == 200
    updated_interview = fresp.json()
    assert updated_interview.get("feedback") == "Good"

    # update candidate stage
    resp = client.put(f"/api/recruitment/candidates/{candidate['id']}/stage", json={"stage": "interviewed"}, headers=admin_auth_header)
    assert resp.status_code == 200

    # analytics
    resp = client.get("/api/recruitment/analytics", headers=admin_auth_header)
    assert resp.status_code == 200


def test_recruitment_forbidden_for_employee(employee_auth_header, client):
    # employee should not create jobs
    resp = client.post("/api/recruitment/jobs", json={"title": "X", "department_id": 1, "description": "x", "requirements": "x", "employment_type": "x"}, headers=employee_auth_header)
    assert resp.status_code == 403
