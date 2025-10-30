import httpx, time, json, os
from tenacity import retry, stop_after_delay, wait_fixed

BASE = "http://localhost:8000"

@retry(stop=stop_after_delay(15), wait=wait_fixed(1))
def wait_up():
    try:
        r = httpx.get(f"{BASE}/health", timeout=2.0)
        if r.status_code != 200:
            raise RuntimeError("health not 200")
    except Exception:
        raise

def test_01_health():
    wait_up()

def test_02_create_user_valid():
    r = httpx.post(f"{BASE}/api/users", json={"name":"Alice","email":"alice@example.com"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("id") is not None
    assert data["name"] == "Alice"
    assert "@" in data["email"]

def test_03_create_user_invalid_email():
    r = httpx.post(f"{BASE}/api/users", json={"name":"Bob","email":"not-an-email"})
    assert r.status_code in (400,422), r.text

def test_04_list_users():
    r = httpx.get(f"{BASE}/api/users")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert any(u.get("name")=="Alice" for u in data)

def test_05_create_task_missing_user():
    r = httpx.post(f"{BASE}/api/tasks", json={"title":"T1","assignedTo":999})
    assert r.status_code in (400,404,422), r.text

def test_06_create_task_valid():
    users = httpx.get(f"{BASE}/api/users").json()
    alice_id = next(u["id"] for u in users if u["name"]=="Alice")
    r = httpx.post(f"{BASE}/api/tasks", json={"title":"First","assignedTo":alice_id})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("id") is not None
    assert d["assignedTo"] == alice_id

def test_07_list_tasks():
    r = httpx.get(f"{BASE}/api/tasks")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert any(t.get("title")=="First" for t in data)

def test_08_stats():
    r = httpx.get(f"{BASE}/api/stats")
    assert r.status_code == 200
    d = r.json()
    assert "users" in d and "tasks" in d
