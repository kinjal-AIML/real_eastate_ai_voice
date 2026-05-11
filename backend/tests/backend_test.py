"""ConstructProcure backend API tests"""
import os, time, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": "manager@demo.com", "password": "Demo@123"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]

@pytest.fixture(scope="session")
def H(token):
    return {"Authorization": f"Bearer {token}"}

# ---- auth ----
def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "x@y.com", "password": "bad"}, timeout=30)
    assert r.status_code == 401

def test_me(H):
    r = requests.get(f"{API}/auth/me", headers=H, timeout=30)
    assert r.status_code == 200
    assert r.json()["email"] == "manager@demo.com"

def test_register_and_login():
    em = f"TEST_{int(time.time())}@demo.com"
    r = requests.post(f"{API}/auth/register", json={"name": "T", "email": em, "password": "Demo@123"}, timeout=30)
    assert r.status_code == 200
    assert "token" in r.json()
    r2 = requests.post(f"{API}/auth/login", json={"email": em, "password": "Demo@123"}, timeout=30)
    assert r2.status_code == 200

# ---- seeded reference data ----
def test_sites(H):
    r = requests.get(f"{API}/sites", headers=H, timeout=30); assert r.status_code == 200
    assert len(r.json()) >= 3

def test_vendors(H):
    r = requests.get(f"{API}/vendors", headers=H, timeout=30); assert r.status_code == 200
    assert len(r.json()) >= 5

def test_materials(H):
    r = requests.get(f"{API}/materials", headers=H, timeout=30); assert r.status_code == 200
    assert len(r.json()) >= 1

def test_inventory(H):
    r = requests.get(f"{API}/inventory", headers=H, timeout=30); assert r.status_code == 200
    assert isinstance(r.json(), list)

# ---- AI extraction (English / Hindi / Gujarati) ----
@pytest.mark.parametrize("text,lang", [
    ("Need 50 bags Ultratech Cement OPC 53 tomorrow for Riverfront Site Surat.", "en"),
    ("कल रिवरफ्रंट साइट सूरत के लिए 50 बैग अल्ट्राटेक सीमेंट चाहिए।", "hi"),
    ("આવતીકાલે રિવરફ્રન્ટ સાઇટ સુરત માટે 50 બેગ અલ્ટ્રાટેક સિમેન્ટ જોઈએ.", "gu"),
])
def test_ai_extract(H, text, lang):
    r = requests.post(f"{API}/ai/extract", headers=H, json={"text": text, "language": lang}, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["site_name", "material", "quantity", "unit", "delivery_date", "priority", "missing_fields"]:
        assert k in d, f"missing {k} in {d}"
    assert d["quantity"] in (50, 50.0) or float(d["quantity"]) == 50.0

# ---- requests workflow ----
@pytest.fixture(scope="session")
def req_id(H):
    payload = {
        "raw_text": "Need 50 bags Ultratech OPC 53 cement tomorrow for Riverfront Site Surat.",
        "extracted": {"site_name": "Riverfront Site Surat", "material": "OPC 53 Cement",
                      "brand": "UltraTech", "quantity": 50, "unit": "bag",
                      "delivery_date": "2026-01-15", "priority": "high", "language": "en", "missing_fields": []},
        "source": "text",
    }
    r = requests.post(f"{API}/requests", headers=H, json=payload, timeout=60)
    assert r.status_code == 200, r.text
    return r.json()["id"]

def test_list_requests(H, req_id):
    r = requests.get(f"{API}/requests", headers=H, timeout=30)
    assert r.status_code == 200
    assert any(x["id"] == req_id for x in r.json())

def test_approve_and_generate_po(H, req_id):
    r = requests.post(f"{API}/requests/{req_id}/approve", headers=H, timeout=30)
    assert r.status_code == 200 and r.json()["status"] == "approved"
    r2 = requests.post(f"{API}/requests/{req_id}/generate-po", headers=H, json={"unit_price": 380}, timeout=30)
    assert r2.status_code == 200, r2.text
    po = r2.json()
    assert po["po_number"].startswith("PO-")
    assert po["total"] == 380 * 50
    pytest.po_id = po["id"]

def test_po_status_transitions(H):
    pid = pytest.po_id
    for s in ["acknowledged", "shipped", "delivered"]:
        r = requests.post(f"{API}/purchase-orders/{pid}/status", headers=H, json={"status": s}, timeout=30)
        assert r.status_code == 200 and r.json()["status"] == s
    # inventory updated
    inv = requests.get(f"{API}/inventory", headers=H, timeout=30).json()
    assert any(i["site_name"] == "Riverfront Site Surat" and i["material"] == "OPC 53 Cement" for i in inv)

def test_reject_request(H):
    payload = {"raw_text": "test", "extracted": {"site_name":"X","material":"Sand","quantity":10,"unit":"cum","delivery_date":"2026-01-20","priority":"low","language":"en","missing_fields":[]}}
    r = requests.post(f"{API}/requests", headers=H, json=payload, timeout=30)
    rid = r.json()["id"]
    r2 = requests.post(f"{API}/requests/{rid}/reject", headers=H, json={"reason": "duplicate"}, timeout=30)
    assert r2.status_code == 200 and r2.json()["status"] == "rejected"

# ---- whatsapp ----
def test_whatsapp_send(H):
    r = requests.post(f"{API}/whatsapp/send", headers=H,
                      json={"text": "Need 20 bags ACC PPC cement tomorrow for Skyline Towers Ahmedabad.",
                            "sender": "TestEng"}, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["request"]["source"] == "whatsapp"
    assert d["bot_reply"]["direction"] == "out"
    msgs = requests.get(f"{API}/whatsapp/messages", headers=H, timeout=30).json()
    assert any(m.get("request_id") == d["request"]["id"] for m in msgs)

# ---- analytics ----
def test_analytics(H):
    r = requests.get(f"{API}/analytics/dashboard", headers=H, timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["kpis", "monthly_spend", "top_materials", "top_vendors"]:
        assert k in d
    for k in ["total_requests", "pending_requests", "open_pos", "low_stock_items", "total_spend"]:
        assert k in d["kpis"]

# ---- purchase orders ----
def test_list_pos(H):
    r = requests.get(f"{API}/purchase-orders", headers=H, timeout=30)
    assert r.status_code == 200 and isinstance(r.json(), list)
