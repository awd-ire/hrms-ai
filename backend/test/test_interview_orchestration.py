import io
from datetime import date


def test_conduct_interview_flow(client, admin_auth_header, monkeypatch):
    # create HR user and get token
    hr_username = "hr_user"
    hr_password = "password"
    resp = client.post(
        "/api/auth/register",
        json={"username": hr_username, "email": "hr@example.com", "password": hr_password, "role": "hr_recruiter"},
    )
    assert resp.status_code == 201

    login = client.post("/api/auth/login", json={"username": hr_username, "password": hr_password})
    assert login.status_code == 200
    hr_token = login.json().get("access_token")
    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    # create department and job via admin
    import uuid
    dept_name = f"Dept_{uuid.uuid4().hex[:6]}"
    dresp = client.post("/api/departments/", json={"name": dept_name, "code": dept_name.lower(), "description": "x"}, headers=admin_auth_header)
    assert dresp.status_code == 201
    department = dresp.json()

    job_payload = {"title": "X", "department_id": department["id"], "description": "x", "requirements": "x", "employment_type": "full-time"}
    jresp = client.post("/api/recruitment/jobs", json=job_payload, headers=admin_auth_header)
    assert jresp.status_code == 201
    job = jresp.json()

    # create candidate via admin (multipart)
    files = {
        "job_posting_id": (None, str(job["id"])),
        "full_name": (None, "C"),
        "email": (None, "c@example.com"),
        "applied_date": (None, date.today().isoformat()),
        "resume": ("resume.pdf", b"PDFDATA", "application/pdf"),
    }
    cresp = client.post("/api/recruitment/candidates", files=files, headers=admin_auth_header)
    assert cresp.status_code == 201
    candidate = cresp.json()

    # monkeypatch save_audio_file to avoid disk writes
    import routers.ai as ai_router

    monkeypatch.setattr(ai_router, "save_audio_file", lambda filename, content: "tmp_audio.webm")

    # mock AIService methods
    from services import ai_service

    monkeypatch.setattr(ai_service.AIService, "transcribe_voice", staticmethod(lambda audio_path: {"transcript": "Candidate responded well.", "language": "en", "audio_path": audio_path}))
    monkeypatch.setattr(ai_service.AIService, "interview_chat", staticmethod(lambda message, context=None: {"reply": "Thanks", "follow_up_questions": []}))
    monkeypatch.setattr(ai_service.AIService, "evaluate_interview", staticmethod(lambda transcript, resume_summary=None: {"score": 88.0, "summary": "Strong technical fit", "recommendation": "advance", "next_stage": "interviewed"}))

    # post to orchestration endpoint as HR
    files = {"audio": ("rec.webm", b"AUDIO", "audio/webm")}
    resp = client.post("/api/ai/interview/conduct", data={"candidate_id": str(candidate["id"])}, files=files, headers=hr_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("transcript") == "Candidate responded well."
    assert data.get("evaluation", {}).get("score") == 88.0

    # verify candidate stage updated
    gresp = client.get(f"/api/recruitment/candidates/{candidate['id']}", headers=admin_auth_header)
    assert gresp.status_code == 200
    updated = gresp.json()
    assert updated.get("stage") == "interviewed"
    assert updated.get("interviews", [{}])[0].get("transcript") == "Candidate responded well."
