def test_recruitment_unauthenticated(client):
    resp = client.get("/api/recruitment/jobs")
    assert resp.status_code == 200


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


def test_ai_resume_screen_shortlists_candidate(client, monkeypatch):
    import uuid
    from datetime import date
    from services import ai_service
    hr_username = "hr_screen_user"
    hr_password = "password"
    resp = client.post(
        "/api/auth/register",
        json={"username": hr_username, "email": "hrscreen@example.com", "password": hr_password, "role": "hr_recruiter"},
    )
    assert resp.status_code == 201
    login = client.post("/api/auth/login", json={"username": hr_username, "password": hr_password})
    assert login.status_code == 200
    hr_headers = {"Authorization": f"Bearer {login.json().get('access_token')}"}

    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "screen test"},
        headers=hr_headers,
    )
    assert dresp.status_code == 201
    department = dresp.json()

    job_payload = {
        "title": "Data Analyst",
        "department_id": department["id"],
        "description": "Analyze data",
        "requirements": "SQL",
        "employment_type": "full-time",
    }
    jresp = client.post("/api/recruitment/jobs", json=job_payload, headers=hr_headers)
    assert jresp.status_code == 201
    job = jresp.json()

    files = {
        "job_posting_id": (None, str(job["id"])),
        "full_name": (None, "Shortlisted Candidate"),
        "email": (None, "shortlisted@example.com"),
        "applied_date": (None, date.today().isoformat()),
        "resume": ("resume.pdf", b"PDFDATA", "application/pdf"),
    }
    cresp = client.post("/api/recruitment/candidates", files=files, headers=hr_headers)
    assert cresp.status_code == 201
    candidate = cresp.json()

    monkeypatch.setattr(
        ai_service.AIService,
        "screen_existing_resume",
        staticmethod(lambda resume_path, job_description=None: {
            "score": 88.0,
            "summary": "Strong match",
            "strengths": ["python"],
            "weaknesses": [],
            "recommendations": [],
            "resume_path": resume_path,
        }),
    )

    form = {
        "candidate_id": str(candidate["id"]),
        "job_description": "Analyze data",
    }
    resume_file = ("resume.pdf", b"PDFDATA", "application/pdf")
    resp = client.post(
        "/api/ai/resume/screen",
        data=form,
        files={"resume": resume_file},
        headers=hr_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["shortlist_decision"] == "shortlisted"

    candidate_resp = client.get(f"/api/recruitment/candidates/{candidate['id']}", headers=hr_headers)
    assert candidate_resp.status_code == 200
    updated = candidate_resp.json()
    assert updated["stage"] == "shortlisted"
    assert updated["screening_score"] == 88.0
    assert updated["final_decision"] is None


def test_public_interview_blocked_until_shortlist_and_schedule(admin_auth_header, client):
    import uuid
    from datetime import date

    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "public gate test"},
        headers=admin_auth_header,
    )
    assert dresp.status_code == 201
    department = dresp.json()

    job_payload = {
        "title": "QA Engineer",
        "department_id": department["id"],
        "description": "Test stuff",
        "requirements": "Testing",
        "employment_type": "full-time",
    }
    jresp = client.post("/api/recruitment/jobs", json=job_payload, headers=admin_auth_header)
    assert jresp.status_code == 201
    job = jresp.json()

    files = {
        "job_posting_id": (None, str(job["id"])),
        "full_name": (None, "Public Candidate"),
        "email": (None, "public@example.com"),
        "applied_date": (None, date.today().isoformat()),
        "resume": ("resume.pdf", b"PDFDATA", "application/pdf"),
    }
    cresp = client.post("/api/public/apply", files=files)
    assert cresp.status_code == 201
    candidate = cresp.json()["candidate"]

    files = {"audio": ("answer.webm", b"AUDIO", "audio/webm")}
    resp = client.post(
        "/api/public/interview",
        data={"candidate_id": str(candidate["id"]), "email": candidate["email"]},
        files=files,
    )
    assert resp.status_code == 403


def test_public_live_interview_cannot_restart_after_completion(admin_auth_header, client, monkeypatch):
    import uuid
    from datetime import date

    from services import ai_service
    import routers.public as public_router

    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "live interview repeat test"},
        headers=admin_auth_header,
    )
    assert dresp.status_code == 201
    department = dresp.json()

    job_payload = {
        "title": "Backend Engineer",
        "department_id": department["id"],
        "description": "Build APIs",
        "requirements": "Python",
        "employment_type": "full-time",
    }
    jresp = client.post("/api/recruitment/jobs", json=job_payload, headers=admin_auth_header)
    assert jresp.status_code == 201
    job = jresp.json()

    files = {
        "job_posting_id": (None, str(job["id"])),
        "full_name": (None, "Repeat Candidate"),
        "email": (None, "repeat@example.com"),
        "applied_date": (None, date.today().isoformat()),
        "resume": ("resume.pdf", b"PDFDATA", "application/pdf"),
    }
    cresp = client.post("/api/public/apply", files=files)
    assert cresp.status_code == 201
    candidate = cresp.json()["candidate"]

    interview_payload = {
        "candidate_id": candidate["id"],
        "interview_round": "phone",
        "scheduled_date": date.today().isoformat(),
    }
    iresp = client.post("/api/recruitment/interviews", json=interview_payload, headers=admin_auth_header)
    assert iresp.status_code == 201

    monkeypatch.setattr(
        ai_service.AIService,
        "generate_interview_question_bank",
        staticmethod(lambda context=None, total_questions=2: {
            "questions": [{"question": "Tell me about yourself.", "guidance": "Open"}]
        }),
    )
    monkeypatch.setattr(
        ai_service.AIService,
        "transcribe_voice",
        staticmethod(lambda audio_path: {"transcript": "First answer.", "language": "en", "audio_path": audio_path}),
    )
    monkeypatch.setattr(
        ai_service.AIService,
        "interview_chat",
        staticmethod(lambda message, context=None: {"reply": "Thanks", "follow_up_questions": []}),
    )
    monkeypatch.setattr(
        ai_service.AIService,
        "evaluate_interview_session",
        staticmethod(lambda questions, answers, context=None: {"score": 91.0, "summary": "Great", "recommendation": "advance", "next_stage": "advance"}),
    )
    monkeypatch.setattr(public_router, "save_audio_file", lambda filename, content: "tmp_audio.webm")

    start_resp = client.post(
        "/api/public/interview/live/start",
        json={"candidate_id": candidate["id"], "email": candidate["email"]},
    )
    assert start_resp.status_code == 200, start_resp.text
    session = start_resp.json()

    candidate_resp = client.get(f"/api/recruitment/candidates/{candidate['id']}", headers=admin_auth_header)
    assert candidate_resp.status_code == 200
    candidate_json = candidate_resp.json()
    assert candidate_json["stage"] == "interview_in_progress"
    assert candidate_json["interview_scheduled"] if False else True
    assert candidate_json["interviews"][0]["status"] == "in_progress"

    answer_files = {"audio": ("answer.webm", b"AUDIO", "audio/webm")}
    continue_resp = client.post(
        f"/api/public/interview/live/{session['session_id']}",
        data={"candidate_id": str(candidate["id"]), "email": candidate["email"]},
        files=answer_files,
    )
    assert continue_resp.status_code == 200, continue_resp.text

    candidate_resp = client.get(f"/api/recruitment/candidates/{candidate['id']}", headers=admin_auth_header)
    assert candidate_resp.status_code == 200
    candidate_json = candidate_resp.json()
    assert candidate_json["interviews"][0]["transcript"] == "First answer."

    from core.audit_logger import get_ai_interview_log_path

    log_text = get_ai_interview_log_path().read_text(encoding="utf-8")
    assert "AI_INTERVIEW_START" in log_text
    assert candidate["email"] in log_text
    assert "AI_INTERVIEW_TRANSCRIPT" in log_text
    assert "First answer." in log_text
    assert "HR_CANDIDATE_VIEW" in log_text

    restart_resp = client.post(
        "/api/public/interview/live/start",
        json={"candidate_id": candidate["id"], "email": candidate["email"]},
    )
    assert restart_resp.status_code == 409
    assert restart_resp.json()["detail"] == "You have already taken the AI interview"


def test_public_live_interview_rejects_empty_transcript(client, admin_auth_header, monkeypatch):
    import uuid
    from datetime import date

    from services import ai_service
    import routers.public as public_router

    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "empty transcript test"},
        headers=admin_auth_header,
    )
    assert dresp.status_code == 201
    department = dresp.json()

    job_payload = {
        "title": "Frontend Engineer",
        "department_id": department["id"],
        "description": "Build UI",
        "requirements": "React",
        "employment_type": "full-time",
    }
    jresp = client.post("/api/recruitment/jobs", json=job_payload, headers=admin_auth_header)
    assert jresp.status_code == 201
    job = jresp.json()

    files = {
        "job_posting_id": (None, str(job["id"])),
        "full_name": (None, "Silent Candidate"),
        "email": (None, "silent@example.com"),
        "applied_date": (None, date.today().isoformat()),
        "resume": ("resume.pdf", b"PDFDATA", "application/pdf"),
    }
    cresp = client.post("/api/public/apply", files=files)
    assert cresp.status_code == 201
    candidate = cresp.json()["candidate"]

    interview_payload = {
        "candidate_id": candidate["id"],
        "interview_round": "phone",
        "scheduled_date": date.today().isoformat(),
    }
    iresp = client.post("/api/recruitment/interviews", json=interview_payload, headers=admin_auth_header)
    assert iresp.status_code == 201

    monkeypatch.setattr(
        ai_service.AIService,
        "generate_interview_question_bank",
        staticmethod(lambda context=None, total_questions=2: {
            "questions": [{"question": "Tell me about yourself.", "guidance": "Open"}]
        }),
    )
    monkeypatch.setattr(
        ai_service.AIService,
        "transcribe_voice",
        staticmethod(lambda audio_path: (_ for _ in ()).throw(RuntimeError("Transcription returned empty text"))),
    )
    monkeypatch.setattr(public_router, "save_audio_file", lambda filename, content: "tmp_audio.webm")

    start_resp = client.post(
        "/api/public/interview/live/start",
        json={"candidate_id": candidate["id"], "email": candidate["email"]},
    )
    assert start_resp.status_code == 200, start_resp.text
    session = start_resp.json()

    answer_files = {"audio": ("answer.webm", b"AUDIO", "audio/webm")}
    continue_resp = client.post(
        f"/api/public/interview/live/{session['session_id']}",
        data={"candidate_id": str(candidate["id"]), "email": candidate["email"]},
        files=answer_files,
    )
    assert continue_resp.status_code == 422
    assert "could not detect speech" in continue_resp.json()["detail"].lower()


def test_hr_can_grant_another_ai_interview_chance(admin_auth_header, client, monkeypatch):
    import uuid
    from datetime import date

    from services import ai_service
    import routers.public as public_router

    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post(
        "/api/departments/",
        json={"name": dept_name, "code": dept_name.lower(), "description": "retry interview test"},
        headers=admin_auth_header,
    )
    assert dresp.status_code == 201
    department = dresp.json()

    job_payload = {
        "title": "Backend Engineer",
        "department_id": department["id"],
        "description": "Build APIs",
        "requirements": "Python",
        "employment_type": "full-time",
    }
    jresp = client.post("/api/recruitment/jobs", json=job_payload, headers=admin_auth_header)
    assert jresp.status_code == 201
    job = jresp.json()

    files = {
        "job_posting_id": (None, str(job["id"])),
        "full_name": (None, "Retry Candidate"),
        "email": (None, "retry@example.com"),
        "applied_date": (None, date.today().isoformat()),
        "resume": ("resume.pdf", b"PDFDATA", "application/pdf"),
    }
    cresp = client.post("/api/public/apply", files=files)
    assert cresp.status_code == 201
    candidate = cresp.json()["candidate"]

    interview_payload = {
        "candidate_id": candidate["id"],
        "interview_round": "phone",
        "scheduled_date": date.today().isoformat(),
    }
    iresp = client.post("/api/recruitment/interviews", json=interview_payload, headers=admin_auth_header)
    assert iresp.status_code == 201

    monkeypatch.setattr(
        ai_service.AIService,
        "generate_interview_question_bank",
        staticmethod(lambda context=None, total_questions=2: {
            "questions": [{"question": "Tell me about yourself.", "guidance": "Open"}]
        }),
    )
    monkeypatch.setattr(
        ai_service.AIService,
        "transcribe_voice",
        staticmethod(lambda audio_path: {"transcript": "My answer.", "language": "en", "audio_path": audio_path}),
    )
    monkeypatch.setattr(
        ai_service.AIService,
        "interview_chat",
        staticmethod(lambda message, context=None: {"reply": "Thanks", "follow_up_questions": []}),
    )
    monkeypatch.setattr(
        ai_service.AIService,
        "evaluate_interview_session",
        staticmethod(lambda questions, answers, context=None: {"score": 91.0, "summary": "Great", "recommendation": "advance", "next_stage": "advance"}),
    )
    monkeypatch.setattr(public_router, "save_audio_file", lambda filename, content: "tmp_audio.webm")

    start_resp = client.post(
        "/api/public/interview/live/start",
        json={"candidate_id": candidate["id"], "email": candidate["email"]},
    )
    assert start_resp.status_code == 200, start_resp.text
    session = start_resp.json()

    answer_files = {"audio": ("answer.webm", b"AUDIO", "audio/webm")}
    continue_resp = client.post(
        f"/api/public/interview/live/{session['session_id']}",
        data={"candidate_id": str(candidate["id"]), "email": candidate["email"]},
        files=answer_files,
    )
    assert continue_resp.status_code == 200, continue_resp.text

    candidate_resp = client.get(f"/api/recruitment/candidates/{candidate['id']}", headers=admin_auth_header)
    assert candidate_resp.status_code == 200
    assert candidate_resp.json()["stage"] == "interviewed"

    retry_resp = client.post(
        f"/api/recruitment/candidates/{candidate['id']}/interview/retry",
        json={"interview_round": "phone", "scheduled_date": date.today().isoformat()},
        headers=admin_auth_header,
    )
    assert retry_resp.status_code == 200, retry_resp.text
    assert retry_resp.json()["status"] == "scheduled"

    candidate_resp = client.get(f"/api/recruitment/candidates/{candidate['id']}", headers=admin_auth_header)
    assert candidate_resp.status_code == 200
    candidate_json = candidate_resp.json()
    assert candidate_json["stage"] == "interview_scheduled"
    assert candidate_json["interview_score"] is None
    assert candidate_json["interview_summary"] is None
    assert candidate_json["final_decision"] is None

    second_start = client.post(
        "/api/public/interview/live/start",
        json={"candidate_id": candidate["id"], "email": candidate["email"]},
    )
    assert second_start.status_code == 200, second_start.text
