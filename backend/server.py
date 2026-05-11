"""
ConstructProcure - AI Procurement & Inventory Automation Platform
Backend: FastAPI + MongoDB + OpenAI (GPT + Whisper)
"""
import os
import uuid
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("procure")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change")
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 24 * 7

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="ConstructProcure API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# =============== MODELS ===============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id() -> str:
    return str(uuid.uuid4())


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "engineer"  # engineer | manager | admin


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Site(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    location: str
    manager: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class Vendor(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    categories: List[str] = []
    contact: str = ""
    email: str = ""
    rating: float = 4.0
    lead_time_days: int = 2
    on_time_delivery: float = 95.0
    created_at: str = Field(default_factory=now_iso)


class Material(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    brand: str = ""
    unit: str = "bag"
    category: str = "general"
    unit_price: float = 0.0


class ProcurementRequest(BaseModel):
    id: str = Field(default_factory=gen_id)
    raw_text: str
    language: str = "en"
    site_name: Optional[str] = None
    employee_name: Optional[str] = None
    material: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    delivery_date: Optional[str] = None
    priority: Optional[str] = "normal"  # urgent | high | normal | low
    status: str = "pending"  # pending | approved | rejected | po_generated | delivered
    missing_fields: List[str] = []
    source: str = "voice"  # voice | text | whatsapp
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=gen_id)
    po_number: str
    request_id: str
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    material: str
    brand: Optional[str] = ""
    quantity: float
    unit: str
    unit_price: float = 0.0
    total: float = 0.0
    site_name: Optional[str] = None
    delivery_date: Optional[str] = None
    status: str = "issued"  # issued | acknowledged | shipped | delivered
    created_at: str = Field(default_factory=now_iso)


class InventoryItem(BaseModel):
    id: str = Field(default_factory=gen_id)
    site_name: str
    material: str
    brand: str = ""
    unit: str = "bag"
    quantity: float = 0
    reorder_level: float = 20


class WhatsAppMessage(BaseModel):
    id: str = Field(default_factory=gen_id)
    sender: str
    text: str
    direction: str = "in"  # in | out
    created_at: str = Field(default_factory=now_iso)
    request_id: Optional[str] = None


class ExtractInput(BaseModel):
    text: str
    language: Optional[str] = "auto"


class RejectInput(BaseModel):
    reason: Optional[str] = ""


class GeneratePOInput(BaseModel):
    vendor_id: Optional[str] = None
    unit_price: Optional[float] = None


# =============== AUTH HELPERS ===============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(uid: str, email: str, role: str) -> str:
    payload = {
        "uid": uid,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["uid"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# =============== AI HELPERS ===============
EXTRACTION_SYSTEM = """You are an AI assistant for a construction procurement platform.
Extract structured procurement request data from natural language messages in English, Hindi, or Gujarati.

Return ONLY valid JSON (no markdown, no commentary) with this exact schema:
{
  "site_name": string|null,
  "employee_name": string|null,
  "material": string|null,
  "brand": string|null,
  "quantity": number|null,
  "unit": string|null,
  "delivery_date": "YYYY-MM-DD"|null,
  "priority": "urgent"|"high"|"normal"|"low",
  "language": "en"|"hi"|"gu",
  "missing_fields": [list of missing critical fields among site_name, material, quantity, delivery_date],
  "follow_up_question": string|null
}

Rules:
- Translate brand/material/site names to English when possible (keep proper nouns).
- If delivery_date is relative (today/tomorrow/परसो), resolve it. Today's date will be provided.
- Priority defaults to "normal". If urgent/asap/जल्दी detected → "urgent".
- If quantity/unit missing → put both null and add to missing_fields.
- follow_up_question must be a short clarifying question in the same language as input if missing_fields not empty, else null.
"""


async def call_extraction(text: str) -> Dict[str, Any]:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    chat = LlmChat(
        api_key=OPENAI_API_KEY,
        session_id=f"extract-{uuid.uuid4()}",
        system_message=EXTRACTION_SYSTEM + f"\n\nToday's date: {today}",
    ).with_model("openai", "gpt-4o-mini")
    msg = UserMessage(text=f"Extract from: {text}")
    try:
        response = await chat.send_message(msg)
    except Exception as e:
        logger.exception("LLM extraction failed")
        raise HTTPException(status_code=502, detail=f"AI extraction failed: {e}")
    raw = str(response).strip()
    # Strip markdown fences if any
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        data = json.loads(raw)
    except Exception:
        # Try to find JSON substring
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(raw[start : end + 1])
        else:
            raise HTTPException(status_code=502, detail="Could not parse AI response")
    return data


# =============== AUTH ROUTES ===============
@api.post("/auth/register")
async def register(body: UserRegister):
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = gen_id()
    doc = {
        "id": uid,
        "name": body.name,
        "email": body.email,
        "password": hash_password(body.password),
        "role": body.role or "engineer",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_token(uid, body.email, doc["role"])
    return {"token": token, "user": {"id": uid, "name": body.name, "email": body.email, "role": doc["role"]}}


@api.post("/auth/login")
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]},
    }


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# =============== AI ROUTES ===============
@api.post("/ai/transcribe")
async def transcribe(file: UploadFile = File(...), language: Optional[str] = Form(None), user=Depends(current_user)):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    contents = await file.read()
    tmp_path = Path(f"/tmp/{uuid.uuid4()}_{file.filename or 'audio.webm'}")
    tmp_path.write_bytes(contents)
    try:
        stt = OpenAISpeechToText(api_key=OPENAI_API_KEY)
        with open(tmp_path, "rb") as af:
            kwargs = {"file": af, "model": "whisper-1", "response_format": "json"}
            if language and language in ("en", "hi", "gu"):
                kwargs["language"] = language
            resp = await stt.transcribe(**kwargs)
        text = getattr(resp, "text", None) or (resp.get("text") if isinstance(resp, dict) else str(resp))
        return {"text": text}
    except Exception as e:
        logger.exception("STT failed")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {e}")
    finally:
        try:
            tmp_path.unlink()
        except Exception:
            pass


@api.post("/ai/extract")
async def extract(body: ExtractInput, user=Depends(current_user)):
    data = await call_extraction(body.text)
    return data


# =============== REQUESTS ===============
@api.post("/requests")
async def create_request(payload: Dict[str, Any], user=Depends(current_user)):
    """Accept raw extracted data + raw_text to create a procurement request."""
    raw_text = payload.get("raw_text", "")
    extracted = payload.get("extracted") or {}

    if not extracted and raw_text:
        extracted = await call_extraction(raw_text)

    req = ProcurementRequest(
        raw_text=raw_text,
        language=extracted.get("language", "en"),
        site_name=extracted.get("site_name"),
        employee_name=extracted.get("employee_name") or user.get("name"),
        material=extracted.get("material"),
        brand=extracted.get("brand"),
        quantity=extracted.get("quantity"),
        unit=extracted.get("unit"),
        delivery_date=extracted.get("delivery_date"),
        priority=extracted.get("priority", "normal"),
        missing_fields=extracted.get("missing_fields", []) or [],
        source=payload.get("source", "voice"),
        created_by=user["id"],
    )
    doc = req.model_dump()
    await db.requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/requests")
async def list_requests(status_filter: Optional[str] = None, user=Depends(current_user)):
    q = {}
    if status_filter:
        q["status"] = status_filter
    cursor = db.requests.find(q, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)


@api.get("/requests/{req_id}")
async def get_request(req_id: str, user=Depends(current_user)):
    doc = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api.post("/requests/{req_id}/approve")
async def approve_request(req_id: str, user=Depends(current_user)):
    res = await db.requests.update_one({"id": req_id}, {"$set": {"status": "approved"}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.requests.find_one({"id": req_id}, {"_id": 0})


@api.post("/requests/{req_id}/reject")
async def reject_request(req_id: str, body: RejectInput, user=Depends(current_user)):
    res = await db.requests.update_one(
        {"id": req_id}, {"$set": {"status": "rejected", "reject_reason": body.reason}}
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.requests.find_one({"id": req_id}, {"_id": 0})


@api.post("/requests/{req_id}/generate-po")
async def generate_po(req_id: str, body: GeneratePOInput, user=Depends(current_user)):
    req = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    vendor = None
    if body.vendor_id:
        vendor = await db.vendors.find_one({"id": body.vendor_id}, {"_id": 0})
    if not vendor:
        # Pick a vendor matching material category (best effort)
        vendor = await db.vendors.find_one({}, {"_id": 0})

    unit_price = body.unit_price or 350.0
    qty = float(req.get("quantity") or 0)
    total = unit_price * qty

    po_count = await db.purchase_orders.count_documents({})
    po = PurchaseOrder(
        po_number=f"PO-{datetime.now().year}-{po_count + 1:05d}",
        request_id=req_id,
        vendor_id=vendor["id"] if vendor else None,
        vendor_name=vendor["name"] if vendor else "Unassigned",
        material=req.get("material") or "Unknown",
        brand=req.get("brand") or "",
        quantity=qty,
        unit=req.get("unit") or "unit",
        unit_price=unit_price,
        total=total,
        site_name=req.get("site_name"),
        delivery_date=req.get("delivery_date"),
    )
    await db.purchase_orders.insert_one(po.model_dump())
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "po_generated"}})
    return po.model_dump()


# =============== SITES / VENDORS / MATERIALS ===============
@api.get("/sites")
async def list_sites(user=Depends(current_user)):
    return await db.sites.find({}, {"_id": 0}).to_list(200)


@api.post("/sites")
async def create_site(body: Site, user=Depends(current_user)):
    await db.sites.insert_one(body.model_dump())
    return body.model_dump()


@api.get("/vendors")
async def list_vendors(user=Depends(current_user)):
    return await db.vendors.find({}, {"_id": 0}).sort("rating", -1).to_list(200)


@api.post("/vendors")
async def create_vendor(body: Vendor, user=Depends(current_user)):
    await db.vendors.insert_one(body.model_dump())
    return body.model_dump()


@api.get("/materials")
async def list_materials(user=Depends(current_user)):
    return await db.materials.find({}, {"_id": 0}).to_list(500)


# =============== PURCHASE ORDERS ===============
@api.get("/purchase-orders")
async def list_pos(user=Depends(current_user)):
    return await db.purchase_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/purchase-orders/{po_id}/status")
async def update_po_status(po_id: str, payload: Dict[str, str], user=Depends(current_user)):
    new_status = payload.get("status")
    if new_status not in ("issued", "acknowledged", "shipped", "delivered"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.purchase_orders.update_one({"id": po_id}, {"$set": {"status": new_status}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    # On delivered → update inventory + mark request delivered
    if new_status == "delivered":
        await db.requests.update_one({"id": po["request_id"]}, {"$set": {"status": "delivered"}})
        await _add_to_inventory(po)
    return po


async def _add_to_inventory(po: Dict[str, Any]):
    site = po.get("site_name") or "Unassigned"
    mat = po.get("material") or "Unknown"
    brand = po.get("brand") or ""
    existing = await db.inventory_items.find_one({"site_name": site, "material": mat, "brand": brand})
    if existing:
        await db.inventory_items.update_one(
            {"id": existing["id"]}, {"$inc": {"quantity": float(po.get("quantity") or 0)}}
        )
    else:
        item = InventoryItem(
            site_name=site, material=mat, brand=brand, unit=po.get("unit", "unit"),
            quantity=float(po.get("quantity") or 0),
        )
        await db.inventory_items.insert_one(item.model_dump())


# =============== INVENTORY ===============
@api.get("/inventory")
async def list_inventory(user=Depends(current_user)):
    return await db.inventory_items.find({}, {"_id": 0}).sort("site_name", 1).to_list(500)


# =============== WHATSAPP SIMULATION ===============
@api.get("/whatsapp/messages")
async def list_whatsapp(user=Depends(current_user)):
    return await db.whatsapp_messages.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)


@api.post("/whatsapp/send")
async def whatsapp_send(payload: Dict[str, str], user=Depends(current_user)):
    text = payload.get("text", "").strip()
    sender = payload.get("sender", user.get("name", "Engineer"))
    if not text:
        raise HTTPException(status_code=400, detail="Empty message")

    msg_in = WhatsAppMessage(sender=sender, text=text, direction="in")
    await db.whatsapp_messages.insert_one(msg_in.model_dump())

    # Run extraction
    extracted = await call_extraction(text)
    req = ProcurementRequest(
        raw_text=text,
        language=extracted.get("language", "en"),
        site_name=extracted.get("site_name"),
        employee_name=extracted.get("employee_name") or sender,
        material=extracted.get("material"),
        brand=extracted.get("brand"),
        quantity=extracted.get("quantity"),
        unit=extracted.get("unit"),
        delivery_date=extracted.get("delivery_date"),
        priority=extracted.get("priority", "normal"),
        missing_fields=extracted.get("missing_fields", []) or [],
        source="whatsapp",
        created_by=user["id"],
    )
    req_doc = req.model_dump()
    await db.requests.insert_one(req_doc)
    req_doc.pop("_id", None)
    await db.whatsapp_messages.update_one({"id": msg_in.id}, {"$set": {"request_id": req.id}})

    # Bot reply
    if extracted.get("follow_up_question"):
        bot_text = extracted["follow_up_question"]
    else:
        bot_text = (
            f"✓ Request logged: {req.quantity} {req.unit} {req.brand or ''} {req.material} "
            f"for {req.site_name} by {req.delivery_date}. Tracking ID: {req.id[:8]}"
        )
    bot = WhatsAppMessage(sender="ProcureBot", text=bot_text, direction="out", request_id=req.id)
    await db.whatsapp_messages.insert_one(bot.model_dump())

    return {"request": req_doc, "bot_reply": bot.model_dump(), "extracted": extracted}


# =============== ANALYTICS ===============
@api.get("/analytics/dashboard")
async def analytics_dashboard(user=Depends(current_user)):
    total_requests = await db.requests.count_documents({})
    pending = await db.requests.count_documents({"status": "pending"})
    pos_open = await db.purchase_orders.count_documents({"status": {"$ne": "delivered"}})
    low_stock = await db.inventory_items.count_documents({"$expr": {"$lt": ["$quantity", "$reorder_level"]}})

    pipe_spend = [
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]
    spend = await db.purchase_orders.aggregate(pipe_spend).to_list(1)
    total_spend = spend[0]["total"] if spend else 0

    # Spend by month (last 6 months)
    six_months_ago = (datetime.now(timezone.utc) - timedelta(days=180)).isoformat()
    pipe_month = [
        {"$match": {"created_at": {"$gte": six_months_ago}}},
        {
            "$group": {
                "_id": {"$substr": ["$created_at", 0, 7]},
                "spend": {"$sum": "$total"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    monthly = await db.purchase_orders.aggregate(pipe_month).to_list(50)
    monthly_spend = [{"month": m["_id"], "spend": m["spend"]} for m in monthly]

    pipe_mat = [
        {"$group": {"_id": "$material", "qty": {"$sum": "$quantity"}, "spend": {"$sum": "$total"}}},
        {"$sort": {"spend": -1}},
        {"$limit": 5},
    ]
    top_materials = await db.purchase_orders.aggregate(pipe_mat).to_list(10)
    top_materials = [{"material": m["_id"], "qty": m["qty"], "spend": m["spend"]} for m in top_materials]

    pipe_vendor = [
        {"$group": {"_id": "$vendor_name", "spend": {"$sum": "$total"}, "orders": {"$sum": 1}}},
        {"$sort": {"spend": -1}},
        {"$limit": 5},
    ]
    top_vendors = await db.purchase_orders.aggregate(pipe_vendor).to_list(10)
    top_vendors = [{"vendor": v["_id"], "spend": v["spend"], "orders": v["orders"]} for v in top_vendors]

    return {
        "kpis": {
            "total_requests": total_requests,
            "pending_requests": pending,
            "open_pos": pos_open,
            "low_stock_items": low_stock,
            "total_spend": total_spend,
        },
        "monthly_spend": monthly_spend,
        "top_materials": top_materials,
        "top_vendors": top_vendors,
    }


# =============== SEED ===============
async def seed_data():
    if await db.sites.count_documents({}) == 0:
        sites = [
            Site(name="Riverfront Site Surat", location="Surat, Gujarat", manager="Rajesh Patel"),
            Site(name="Skyline Towers Ahmedabad", location="Ahmedabad, Gujarat", manager="Anita Shah"),
            Site(name="Marina Bay Mumbai", location="Mumbai, Maharashtra", manager="Vikram Singh"),
        ]
        await db.sites.insert_many([s.model_dump() for s in sites])

    if await db.vendors.count_documents({}) == 0:
        vendors = [
            Vendor(name="UltraTech Cement Distributors", categories=["cement"], contact="+91 98250 11111",
                   email="sales@ultracementdist.in", rating=4.7, lead_time_days=1, on_time_delivery=97.5),
            Vendor(name="Tata Steel Direct", categories=["steel", "rebar"], contact="+91 98250 22222",
                   email="orders@tatasteel.in", rating=4.5, lead_time_days=3, on_time_delivery=94.0),
            Vendor(name="Asian Paints Pro", categories=["paint", "finishing"], contact="+91 98250 33333",
                   email="b2b@asianpaints.com", rating=4.3, lead_time_days=2, on_time_delivery=92.0),
            Vendor(name="Saint-Gobain Glass", categories=["glass", "facade"], contact="+91 98250 44444",
                   email="contact@saintgobain.in", rating=4.6, lead_time_days=5, on_time_delivery=96.0),
            Vendor(name="Local Aggregates Co.", categories=["sand", "aggregate", "gravel"],
                   contact="+91 98250 55555", email="info@localagg.in", rating=4.0,
                   lead_time_days=1, on_time_delivery=88.0),
        ]
        await db.vendors.insert_many([v.model_dump() for v in vendors])

    if await db.materials.count_documents({}) == 0:
        materials = [
            Material(name="OPC 53 Cement", brand="UltraTech", unit="bag", category="cement", unit_price=380),
            Material(name="PPC Cement", brand="ACC", unit="bag", category="cement", unit_price=360),
            Material(name="TMT Steel Bars 12mm", brand="Tata Tiscon", unit="ton", category="steel", unit_price=62000),
            Material(name="River Sand", brand="Local", unit="cum", category="sand", unit_price=1800),
            Material(name="Crushed Aggregate 20mm", brand="Local", unit="cum", category="aggregate", unit_price=1500),
            Material(name="Apex Ultima Paint", brand="Asian Paints", unit="liter", category="paint", unit_price=520),
        ]
        await db.materials.insert_many([m.model_dump() for m in materials])

    if await db.inventory_items.count_documents({}) == 0:
        items = [
            InventoryItem(site_name="Riverfront Site Surat", material="OPC 53 Cement", brand="UltraTech",
                          unit="bag", quantity=145, reorder_level=50),
            InventoryItem(site_name="Riverfront Site Surat", material="TMT Steel Bars 12mm", brand="Tata Tiscon",
                          unit="ton", quantity=2.5, reorder_level=5),
            InventoryItem(site_name="Skyline Towers Ahmedabad", material="OPC 53 Cement", brand="UltraTech",
                          unit="bag", quantity=30, reorder_level=50),
            InventoryItem(site_name="Marina Bay Mumbai", material="River Sand", brand="Local",
                          unit="cum", quantity=80, reorder_level=30),
        ]
        await db.inventory_items.insert_many([i.model_dump() for i in items])

    if await db.users.count_documents({}) == 0:
        # Seed demo accounts
        demo_users = [
            {"id": gen_id(), "name": "Demo Manager", "email": "manager@demo.com",
             "password": hash_password("Demo@123"), "role": "manager", "created_at": now_iso()},
            {"id": gen_id(), "name": "Site Engineer", "email": "engineer@demo.com",
             "password": hash_password("Demo@123"), "role": "engineer", "created_at": now_iso()},
        ]
        await db.users.insert_many(demo_users)

    logger.info("Seed data ensured.")


@app.on_event("startup")
async def on_startup():
    try:
        await seed_data()
    except Exception as e:
        logger.exception(f"Seed error: {e}")


@api.get("/")
async def root():
    return {"app": "ConstructProcure", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
