import uuid


def test_departments_unauthenticated(client):
    resp = client.get("/api/departments/")
    assert resp.status_code in (401, 422)


def test_departments_crud(admin_auth_header, client):
    name = f"Dept_{uuid.uuid4().hex[:6]}"
    payload = {"name": name, "code": name.lower(), "description": "Created by test"}

    # create
    resp = client.post("/api/departments/", json=payload, headers=admin_auth_header)
    assert resp.status_code == 201, resp.text
    dept = resp.json()

    dept_id = dept["id"]

    # duplicate should error (400/409)
    resp = client.post("/api/departments/", json=payload, headers=admin_auth_header)
    assert resp.status_code in (400, 409)

    # list and ensure created department is present
    resp = client.get("/api/departments/", headers=admin_auth_header)
    assert resp.status_code == 200
    items = resp.json()
    assert any(d.get("id") == dept_id for d in items)

    # update
    resp = client.put(f"/api/departments/{dept_id}", json={"description": "Updated"}, headers=admin_auth_header)
    assert resp.status_code == 200
    assert resp.json().get("description") == "Updated"

    # delete
    resp = client.delete(f"/api/departments/{dept_id}", headers=admin_auth_header)
    assert resp.status_code in (200, 204)

