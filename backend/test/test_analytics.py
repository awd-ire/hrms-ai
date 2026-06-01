def test_analytics_company_unauthenticated(client):
    resp = client.get("/api/analytics/company")
    assert resp.status_code in (401, 422)


def test_analytics_company_admin(admin_auth_header, client):
    resp = client.get("/api/analytics/company", headers=admin_auth_header)
    assert resp.status_code == 200
