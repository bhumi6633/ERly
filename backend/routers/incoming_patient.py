"""
Pre-arrival patient notification endpoint + real-time facility dashboard.

POST /incoming-patient/  — registers a patient, broadcasts to connected dashboards.
GET  /incoming-patient/  — returns the current in-memory queue (for initial load).
GET  /incoming-patient/stream — SSE stream; each event is a JSON patient record.
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uuid
import json
import asyncio
from datetime import datetime, timezone

router = APIRouter(prefix="/incoming-patient", tags=["incoming-patient"])

# ── In-memory store ───────────────────────────────────────────────────────────
_reports: List[dict] = []
_subscribers: List[asyncio.Queue] = []


# ── Schemas ───────────────────────────────────────────────────────────────────

class IncomingPatientPayload(BaseModel):
    facility_id: int
    facility_name: Optional[str] = "Unknown Facility"
    eta_minutes: float  # accept floats from frontend; stored/broadcast as a number
    symptoms: List[str]
    severity: str
    urgency_label: Optional[str] = "Standard"
    care_type: Optional[str] = "General Care"
    user_id: Optional[str] = "demo_user"


class IncomingPatientResponse(BaseModel):
    success: bool
    patient_id: str
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=IncomingPatientResponse)
async def register_incoming_patient(payload: IncomingPatientPayload):
    """Register a pre-arrival patient and broadcast to dashboard subscribers."""
    patient_id = f"PT-{uuid.uuid4().hex[:6].upper()}"
    record = {
        "patient_id": patient_id,
        "facility_id": payload.facility_id,
        "facility_name": payload.facility_name,
        "eta_minutes": round(payload.eta_minutes),
        "symptoms": payload.symptoms,
        "severity": payload.severity,
        "urgency_label": payload.urgency_label,
        "care_type": payload.care_type,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    _reports.append(record)

    # Broadcast to every connected SSE client.
    dead: List[asyncio.Queue] = []
    for q in _subscribers:
        try:
            q.put_nowait(record)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        try:
            _subscribers.remove(q)
        except ValueError:
            pass

    return IncomingPatientResponse(
        success=True,
        patient_id=patient_id,
        message=f"{payload.facility_name} alerted — {patient_id} arriving in ~{payload.eta_minutes} min.",
    )


@router.get("/")
def list_reports():
    """Return current queue (newest first)."""
    return list(reversed(_reports))


@router.get("/stream")
async def stream_reports():
    """SSE endpoint — push each new patient record as it arrives."""

    async def event_generator():
        q: asyncio.Queue = asyncio.Queue(maxsize=50)
        _subscribers.append(q)
        try:
            # Heartbeat every 15 s to keep the connection alive through proxies.
            while True:
                try:
                    record = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"data: {json.dumps(record)}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            try:
                _subscribers.remove(q)
            except ValueError:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
