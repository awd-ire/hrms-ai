def test_dashboard_admin_unauthenticated(client):
    resp = client.get("/api/dashboard/admin")
    assert resp.status_code in (401, 422)


def test_dashboard_admin_ok(admin_auth_header, client):
    resp = client.get("/api/dashboard/admin", headers=admin_auth_header)
    assert resp.status_code == 200
