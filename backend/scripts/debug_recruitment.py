from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

for path in ("/api/recruitment/jobs", "/api/recruitment/candidates"):
    print("GET", path)
    resp = client.get(path)
    print(resp.status_code)
    try:
        print(resp.json())
    except Exception:
        print(resp.text)
    print('\n')
