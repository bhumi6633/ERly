from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ── LiveStatus ────────────────────────────────────────────────────────────────

class LiveStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    current_wait_mins: int
    predicted_wait_on_arrival_mins: int
    capacity_score: float
    queue_length: int
    staffing_level: str
    ambulance_load: int
    last_updated_at: Optional[datetime] = None


class LiveStatusUpdate(BaseModel):
    current_wait_mins: Optional[int] = None
    predicted_wait_on_arrival_mins: Optional[int] = None
    capacity_score: Optional[float] = None
    queue_length: Optional[int] = None
    staffing_level: Optional[str] = None
    ambulance_load: Optional[int] = None


# ── CareLocation ──────────────────────────────────────────────────────────────

class CareLocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    address: str
    city: str
    latitude: float
    longitude: float
    phone: Optional[str]
    is_open_24_7: bool
    opening_time: Optional[str]
    closing_time: Optional[str]
    accepts_ambulance: bool
    has_emergency_department: bool
    specialties: list[str] = []
    live_status: Optional[LiveStatusOut] = None

    @classmethod
    def from_orm_with_specialties(cls, location):
        data = cls.model_validate(location)
        data.specialties = [s.specialty_name for s in location.specialties]
        return data


# ── TriageSession ─────────────────────────────────────────────────────────────

class TriageSessionCreate(BaseModel):
    user_id: Optional[int] = None
    patient_latitude: float
    patient_longitude: float
    main_symptom: str


class TriageSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    started_at: datetime
    ended_at: Optional[datetime]
    current_status: str
    patient_latitude: float
    patient_longitude: float
    main_symptom: Optional[str]
    severity_score: Optional[int]
    recommended_care_type: Optional[str]
    clinical_summary: Optional[str]
    needs_ambulance: bool


# ── TriageAnswer ──────────────────────────────────────────────────────────────

class TriageAnswerCreate(BaseModel):
    question_text: str
    answer_text: str
    question_order: int


class TriageAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    triage_session_id: int
    question_text: str
    answer_text: str
    question_order: int
    timestamp: datetime


# ── SymptomFlag ───────────────────────────────────────────────────────────────

class SymptomFlagCreate(BaseModel):
    flag_name: str
    flag_value: str


class SymptomFlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    triage_session_id: int
    flag_name: str
    flag_value: str


# ── RoutingRecommendation ─────────────────────────────────────────────────────

class RoutingRecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    care_location_id: int
    rank_position: int
    travel_time_mins: Optional[int]
    distance_km: Optional[float]
    predicted_wait_mins: Optional[int]
    specialty_match_score: Optional[float]
    severity_fit_score: Optional[float]
    final_score: Optional[float]
    recommended: bool
    care_location: Optional[CareLocationOut] = None


# ── Handoff ───────────────────────────────────────────────────────────────────

class HandoffCreate(BaseModel):
    care_location_id: int
    eta_mins: int


class HandoffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    triage_session_id: int
    care_location_id: int
    sent_at: datetime
    eta_mins: Optional[int]
    clinical_summary: Optional[str]
    severity_score: Optional[int]
    handoff_status: str


# ── VitalMonitoringEvent ──────────────────────────────────────────────────────

class VitalEventCreate(BaseModel):
    heart_rate: Optional[int] = None
    breathing_rate: Optional[int] = None
    stress_score: Optional[float] = None
    risk_level: str = "low"
    alert_triggered: bool = False


class VitalEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    triage_session_id: int
    timestamp: datetime
    heart_rate: Optional[int]
    breathing_rate: Optional[int]
    stress_score: Optional[float]
    risk_level: str
    alert_triggered: bool


# ── Alert ─────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    triage_session_id: int
    care_location_id: int
    alert_type: str
    alert_message: str
    created_at: datetime
    resolved_at: Optional[datetime]


# ── Routing Request (from frontend) ──────────────────────────────────────────

class RoutingRequest(BaseModel):
    triage_session_id: int
    patient_latitude: float
    patient_longitude: float
    severity_score: int
    recommended_care_type: str
    symptom_flags: list[SymptomFlagCreate] = []
