def test_ai_status_unauthenticated(client):
    resp = client.get("/api/ai/status")
    assert resp.status_code in (401, 422)


def test_ai_status_admin(admin_auth_header, client):
    resp = client.get("/api/ai/status", headers=admin_auth_header)
    assert resp.status_code == 200


def _create_hr_and_manager(client, admin_auth_header):
    import uuid

    uid = uuid.uuid4().hex[:8]

    # create HR user with unique username/email
    hr_username = f"hr_user_{uid}"
    hr_email = f"hr_{uid}@example.com"
    resp = client.post(
        "/api/auth/register",
        json={"username": hr_username, "email": hr_email, "password": "password", "role": "hr_recruiter"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    hr_login = client.post("/api/auth/login", json={"username": hr_username, "password": "password"})
    assert hr_login.status_code == 200
    hr_token = hr_login.json().get("access_token")
    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    # create manager with unique username/email
    mgr_username = f"mgr_user_{uid}"
    mgr_email = f"mgr_{uid}@example.com"
    resp = client.post(
        "/api/auth/register",
        json={"username": mgr_username, "email": mgr_email, "password": "password", "role": "senior_manager"},
        headers=admin_auth_header,
    )
    assert resp.status_code == 201
    mgr_login = client.post("/api/auth/login", json={"username": mgr_username, "password": "password"})
    assert mgr_login.status_code == 200
    mgr_token = mgr_login.json().get("access_token")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    return hr_headers, mgr_headers


def test_ai_resume_screen_upload_and_existing(admin_auth_header, client, monkeypatch):
    hr_headers, _ = _create_hr_and_manager(client, admin_auth_header)

    # mock AIService.screen_resume_file
    from services import ai_service

    def fake_screen_file(content, filename, job_description=None):
        return {"score": 85.0, "summary": "Good candidate", "resume_path": "/tmp/resume.pdf"}

    monkeypatch.setattr(ai_service.AIService, "screen_resume_file", staticmethod(fake_screen_file))

    files = {"resume": ("resume.pdf", b"PDFDATA", "application/pdf"), "job_description": (None, "desc")}
    resp = client.post("/api/ai/resume/screen", files=files, headers=hr_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("score") == 85.0

    # create a job and candidate via admin
    import uuid
    from datetime import date
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

    # mock screen_existing_resume
    def fake_screen_existing(resume_path, job_description=None):
        return {"score": 90.0, "summary": "Existing candidate", "resume_path": resume_path}

    monkeypatch.setattr(ai_service.AIService, "screen_existing_resume", staticmethod(fake_screen_existing))
    # monkeypatch RecruitmentService.update_candidate_ai_results to no-op
    from services import recruitment_service
    monkeypatch.setattr(recruitment_service.RecruitmentService, "update_candidate_ai_results", staticmethod(lambda db, cid, score, summary: None))

    resp = client.post("/api/ai/resume/screen", data={"candidate_id": str(candidate["id"])}, files={"resume": ("resume.pdf", b"PDFDATA", "application/pdf")}, headers=hr_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("score") == 90.0


def test_ai_rank_and_chats_and_transcribe(admin_auth_header, client, monkeypatch):
    hr_headers, mgr_headers = _create_hr_and_manager(client, admin_auth_header)
    from services import ai_service

    # rank candidates validation
    resp = client.post("/api/ai/resume/rank", json={"candidates": []}, headers=hr_headers)
    assert resp.status_code == 400

    # mock rank_candidates
    def fake_rank(candidates):
        return {"ranked": [{"name": "A", "rank": 1, "score": 95, "reason": "Good"}], "summary": "ok"}

    monkeypatch.setattr(ai_service.AIService, "rank_candidates", staticmethod(fake_rank))
    resp = client.post("/api/ai/resume/rank", json={"candidates": [{"name": "A", "profile": "x"}, {"name": "B", "profile": "y"}]}, headers=hr_headers)
    assert resp.status_code == 200

    # recruitment chat empty message validation
    resp = client.post("/api/ai/chat/recruitment", json={"message": "  "}, headers=hr_headers)
    assert resp.status_code == 400

    def fake_recruitment_chat(message, context=None):
        return {"reply": "Hello", "suggestions": ["s1"]}

    monkeypatch.setattr(ai_service.AIService, "recruitment_chat", staticmethod(fake_recruitment_chat))
    resp = client.post("/api/ai/chat/recruitment", json={"message": "Hi"}, headers=hr_headers)
    assert resp.status_code == 200

    # interview chat
    def fake_interview_chat(message, context=None):
        return {"reply": "Interview reply", "follow_up_questions": ["q1"]}

    monkeypatch.setattr(ai_service.AIService, "interview_chat", staticmethod(fake_interview_chat))
    resp = client.post("/api/ai/chat/interview", json={"message": "Hi"}, headers=mgr_headers)
    assert resp.status_code == 200

    # transcribe voice: mock save_audio_file and AIService.transcribe_voice
    monkeypatch.setattr("routers.ai.save_audio_file", lambda filename, content: "tmp_audio.webm")
    def fake_transcribe(audio_path):
        return {"transcript": "hello world", "language": "en", "audio_path": audio_path}

    monkeypatch.setattr(ai_service.AIService, "transcribe_voice", staticmethod(fake_transcribe))

    files = {"audio": ("rec.webm", b"AUDIODATA", "audio/webm")}
    resp = client.post("/api/ai/voice/transcribe", files=files, headers=hr_headers)
    assert resp.status_code == 200
    assert resp.json().get("transcript") == "hello world"


def test_ai_transcribe_voice_falls_back_on_short_transcript(monkeypatch, tmp_path):
    from services import ai_service

    calls = []
    audio_path = tmp_path / "sample.webm"
    audio_path.write_bytes(b"AUDIO")

    def fake_whisper(audio_path, language=None):
        calls.append(("whisper", language))
        return {"success": True, "transcript": "You You", "language": "en", "model": "small"}

    def fake_ollama(audio_path, language=None):
        calls.append(("ollama", language))
        return {"success": True, "transcript": "This is my answer.", "language": "en", "model": "whisper"}

    monkeypatch.setattr(ai_service.WhisperClient, "transcribe", staticmethod(fake_whisper))
    monkeypatch.setattr(ai_service.OllamaClient, "transcribe", staticmethod(fake_ollama))

    result = ai_service.AIService.transcribe_voice(str(audio_path))

    assert result["transcript"] == "This is my answer."
    assert calls == [("whisper", "en"), ("whisper", None), ("ollama", "en")]
