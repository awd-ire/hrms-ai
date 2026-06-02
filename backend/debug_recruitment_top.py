from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

for path in ("/api/recruitment/jobs", "/api/recruitment/candidates"):
    print("GET", path)
    resp = client.get(path)
    print('STATUS:', resp.status_code)
    try:
        print('JSON:', resp.json())
    except Exception:
        print('TEXT:', resp.text)
    print('\n')
