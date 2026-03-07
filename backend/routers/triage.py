from backboard_service import assess as backboard_assess
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import TriageSession, TriageAnswer, SymptomFlag, Handoff
from schemas import (
    TriageSessionCreate, TriageSessionOut,
    TriageAnswerCreate, TriageAnswerOut,
    SymptomFlagCreate, SymptomFlagOut,
    HandoffCreate, HandoffOut,
    VitalEventCreate, VitalEventOut,
)
from models import VitalMonitoringEvent, Alert
from schemas import AlertOut

router = APIRouter(prefix="/triage", tags=["triage"])


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=TriageSessionOut, status_code=201)
def create_session(payload: TriageSessionCreate, db: Session = Depends(get_db)):
    session = TriageSession(**payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=TriageSessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/sessions/{session_id}/complete", response_model=TriageSessionOut)
def complete_session(
    session_id: int,
    severity_score: int,
    recommended_care_type: str,
    clinical_summary: str,
    needs_ambulance: bool = False,
    db: Session = Depends(get_db),
):
    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.severity_score = severity_score
    session.recommended_care_type = recommended_care_type
    session.clinical_summary = clinical_summary
    session.needs_ambulance = needs_ambulance
    session.ended_at = datetime.utcnow()
    session.current_status = "completed"

    db.commit()
    db.refresh(session)
    return session


# ── Q&A Log ───────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/answers", response_model=TriageAnswerOut, status_code=201)
def add_answer(
    session_id: int,
    payload: TriageAnswerCreate,
    db: Session = Depends(get_db),
):
    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    answer = TriageAnswer(triage_session_id=session_id, **payload.model_dump())
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


@router.get("/sessions/{session_id}/answers", response_model=list[TriageAnswerOut])
def list_answers(session_id: int, db: Session = Depends(get_db)):
    return (
        db.query(TriageAnswer)
        .filter(TriageAnswer.triage_session_id == session_id)
        .order_by(TriageAnswer.question_order)
        .all()
    )


# ── Symptom Flags ─────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/flags", response_model=list[SymptomFlagOut], status_code=201)
def upsert_flags(
    session_id: int,
    flags: list[SymptomFlagCreate],
    db: Session = Depends(get_db),
):
    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    existing = {f.flag_name: f for f in session.symptom_flags}
    results = []

    for flag_data in flags:
        if flag_data.flag_name in existing:
            existing[flag_data.flag_name].flag_value = flag_data.flag_value
            results.append(existing[flag_data.flag_name])
        else:
            flag = SymptomFlag(triage_session_id=session_id, **flag_data.model_dump())
            db.add(flag)
            results.append(flag)

    db.commit()
    for r in results:
        db.refresh(r)
    return results


# ── Handoffs ──────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/handoff", response_model=HandoffOut, status_code=201)
def create_handoff(
    session_id: int,
    payload: HandoffCreate,
    db: Session = Depends(get_db),
):
    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    handoff = Handoff(
        triage_session_id=session_id,
        care_location_id=payload.care_location_id,
        eta_mins=payload.eta_mins,
        clinical_summary=session.clinical_summary,
        severity_score=session.severity_score,
    )
    db.add(handoff)
    db.commit()
    db.refresh(handoff)
    return handoff


@router.patch("/handoffs/{handoff_id}/status", response_model=HandoffOut)
def update_handoff_status(
    handoff_id: int,
    status: str,
    db: Session = Depends(get_db),
):
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found")
    handoff.handoff_status = status
    db.commit()
    db.refresh(handoff)
    return handoff


# ── Vitals (PRESAGE) ──────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/vitals", response_model=VitalEventOut, status_code=201)
def log_vital_event(
    session_id: int,
    payload: VitalEventCreate,
    db: Session = Depends(get_db),
):
    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    event = VitalMonitoringEvent(triage_session_id=session_id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/sessions/{session_id}/vitals", response_model=list[VitalEventOut])
def list_vital_events(session_id: int, db: Session = Depends(get_db)):
    return (
        db.query(VitalMonitoringEvent)
        .filter(VitalMonitoringEvent.triage_session_id == session_id)
        .order_by(VitalMonitoringEvent.timestamp)
        .all()
    )


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/alerts", response_model=list[AlertOut])
def list_session_alerts(session_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Alert)
        .filter(Alert.triage_session_id == session_id)
        .order_by(Alert.created_at.desc())
        .all()
    )


@router.patch("/alerts/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert


class AssessPayload(BaseModel):
    session_id:    int
    patient_token: str
    category:      str
    severity:      str
    duration:      str
    custom_text:   Optional[str] = ""


@router.post("/sessions/{session_id}/assess")
async def assess_session(
    session_id: int,
    payload: AssessPayload,
    db: Session = Depends(get_db),
):
    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await backboard_assess(
        category      = payload.category,
        severity      = payload.severity,
        duration      = payload.duration,
        custom_text   = payload.custom_text or "",
        patient_token = payload.patient_token,
    )

    score     = result.get("priority_score", 5)
    care      = result.get("care_level", "clinic")
    report    = result.get("report", {})
    ambulance = result.get("needs_ambulance", False)

    session.severity_score        = score
    session.recommended_care_type = care
    session.clinical_summary      = report.get("chief_complaint", "")
    session.needs_ambulance       = ambulance
    session.main_symptom          = payload.category
    session.current_status        = "completed"
    db.commit()
    db.refresh(session)

    return {
        "session_id":             session.id,
        "priority_level":         result.get("priority_level"),
        "priority_score":         score,
        "care_level":             care,
        "needs_ambulance":        ambulance,
        "doctor_specialty":       result.get("doctor_specialty"),
        "doctor_specialty_label": result.get("doctor_specialty_label"),
        "pattern_alert":          result.get("pattern_alert"),
        "report":                 report,
        "patient_history":        result.get("patient_history", {}),
        "routing_payload": {
            "triage_session_id":     session.id,
            "patient_latitude":      session.patient_latitude,
            "patient_longitude":     session.patient_longitude,
            "severity_score":        score,
            "recommended_care_type": care,
            "symptom_flags":         [],
        }
    }