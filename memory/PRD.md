# ConstructProcure — Product Requirements Document

## Original Problem Statement
Build an AI-powered Real Estate Procurement & Inventory Automation Platform for construction companies. Automate procurement using AI voice agents, WhatsApp bots, ERP integration, vendor intelligence, and automated PO workflows.

**Core flow:**
1. Site engineer sends requirement via WhatsApp / Voice call / Mobile app voice input (English, Hindi, Gujarati).
2. AI extracts: site, employee, material, brand/spec, quantity/unit, delivery date, priority.
3. AI processes: STT, NLP, translation, missing-field validation, follow-up questions.

## User Personas
- **Site Engineer** — sends voice/WhatsApp requests from field
- **Procurement Manager** — approves/rejects requests, generates POs
- **Admin** — full oversight, vendor management

## Architecture
- **Frontend**: React (CRA), TailwindCSS, shadcn/ui, recharts, sonner, lucide-react
- **Backend**: FastAPI + Motor (async MongoDB)
- **AI**: OpenAI GPT-4o-mini (entity extraction) + Whisper (STT) via `emergentintegrations` (user-provided OPENAI_API_KEY)
- **Auth**: JWT (PyJWT) + bcrypt password hashing
- **Storage**: MongoDB (collections: users, sites, vendors, materials, requests, purchase_orders, inventory_items, whatsapp_messages)

## Core Requirements (static)
- Voice intake → transcription → extraction → request
- WhatsApp simulation with AI parsing + bot reply
- Procurement lifecycle: pending → approved → po_generated → delivered
- Vendor directory with ratings & lead time
- Site-level inventory with reorder alerts
- Analytics: KPIs, monthly spend, top materials/vendors

## What's Been Implemented (v1 — Feb 2026)
- [x] JWT auth (register / login / me), bcrypt hashing
- [x] AI extraction endpoint (`/api/ai/extract`) — multilingual EN/HI/GU
- [x] Whisper STT endpoint (`/api/ai/transcribe`) — webm upload
- [x] Procurement request CRUD + approve/reject/generate-PO
- [x] WhatsApp simulator (`/api/whatsapp/send`, `/api/whatsapp/messages`) with bot reply
- [x] PO lifecycle (issued → acknowledged → shipped → delivered) with auto-inventory update
- [x] Vendor / Site / Material / Inventory endpoints
- [x] Analytics dashboard endpoint
- [x] Seeded sample data (3 sites, 5 vendors, 6 materials, inventory, 2 demo users)
- [x] Frontend: Login, Register (split-screen), Dashboard, Voice Intake (mic + text), Requests (filter + drawer), WhatsApp simulator, Vendors, Purchase Orders, Inventory, Analytics
- [x] Design: Industrial B&W + Safety Orange (#FF4500), Chivo + IBM Plex Sans/Mono, sharp rounded-sm, grid-borders

## Tested
- 17/17 backend pytest tests passing
- Frontend E2E flows verified (login → dashboard → requests → WhatsApp → PO)

## Prioritized Backlog
### P0 (next)
- Twilio integration for real phone-call voice intake
- Real WhatsApp Business API (Meta) — replace simulator
- Vendor matching by material category (currently best-effort)

### P1
- ERP / Tally / SAP integration for PO sync
- Mobile-first responsive optimization for field engineers
- Pricing intelligence: compare quotes from multiple vendors
- Multi-tenant / company workspaces
- Email/SMS notifications on PO status

### P2
- Approval routing rules (auto-approve <₹X, escalate to manager)
- PDF PO export
- GST tax calculation
- Vendor portal (3rd-party login to acknowledge POs)
- Audit log of every voice request and AI extraction
