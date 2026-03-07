from datetime import datetime
from sqlalchemy import (
    Boolean, Column, Float, ForeignKey, Integer, String, Text, DateTime
)
from sqlalchemy.orm import relationship
from database import Base


class CareLocation(Base):
    __tablename__ = "care_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # hospital | er | clinic | urgent_care | pharmacy
    type = Column(String, nullable=False)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False, default="Toronto")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String)
    is_open_24_7 = Column(Boolean, default=False)
    opening_time = Column(String)   # "08:00"
    closing_time = Column(String)   # "22:00"
    accepts_ambulance = Column(Boolean, default=False)
    has_emergency_department = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    specialties = relationship("LocationSpecialty", back_populates="care_location", cascade="all, delete-orphan")
    live_status = relationship("LiveStatus", back_populates="care_location", uselist=False, cascade="all, delete-orphan")
    routing_recommendations = relationship("RoutingRecommendation", back_populates="care_location")
    handoffs = relationship("Handoff", back_populates="care_location")
    alerts = relationship("Alert", back_populates="care_location")
    visit_outcomes = relationship("VisitOutcome", back_populates="care_location")
    wait_time_snapshots = relationship("WaitTimeSnapshot", back_populates="care_location", cascade="all, delete-orphan")


class LocationSpecialty(Base):
    __tablename__ = "location_specialties"

    id = Column(Integer, primary_key=True, index=True)
    care_location_id = Column(Integer, ForeignKey("care_locations.id"), nullable=False)
    # general | pediatric | cardiac | trauma | respiratory | mental_health | orthopedic
    specialty_name = Column(String, nullable=False)

    care_location = relationship("CareLocation", back_populates="specialties")


class LiveStatus(Base):
    __tablename__ = "live_status"

    id = Column(Integer, primary_key=True, index=True)
    care_location_id = Column(Integer, ForeignKey("care_locations.id"), unique=True, nullable=False)
    current_wait_mins = Column(Integer, default=0)
    predicted_wait_on_arrival_mins = Column(Integer, default=0)
    # 0.0 (empty) to 1.0 (full)
    capacity_score = Column(Float, default=0.5)
    queue_length = Column(Integer, default=0)
    # low | normal | high
    staffing_level = Column(String, default="normal")
    ambulance_load = Column(Integer, default=0)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    care_location = relationship("CareLocation", back_populates="live_status")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    age = Column(Integer)
    # male | female | other | prefer_not_to_say
    gender = Column(String)
    phone = Column(String)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    triage_sessions = relationship("TriageSession", back_populates="user")


class TriageSession(Base):
    __tablename__ = "triage_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    # active | completed | abandoned
    current_status = Column(String, default="active")
    patient_latitude = Column(Float)
    patient_longitude = Column(Float)
    main_symptom = Column(String)
    # 1 (mild) to 10 (critical)
    severity_score = Column(Integer)
    # pharmacy | clinic | urgent_care | er | ambulance
    recommended_care_type = Column(String)
    clinical_summary = Column(Text)
    needs_ambulance = Column(Boolean, default=False)

    user = relationship("User", back_populates="triage_sessions")
    answers = relationship("TriageAnswer", back_populates="session", cascade="all, delete-orphan")
    symptom_flags = relationship("SymptomFlag", back_populates="session", cascade="all, delete-orphan")
    routing_recommendations = relationship("RoutingRecommendation", back_populates="session", cascade="all, delete-orphan")
    handoffs = relationship("Handoff", back_populates="session", cascade="all, delete-orphan")
    vital_events = relationship("VitalMonitoringEvent", back_populates="session", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")
    visit_outcome = relationship("VisitOutcome", back_populates="session", uselist=False, cascade="all, delete-orphan")


class TriageAnswer(Base):
    __tablename__ = "triage_answers"

    id = Column(Integer, primary_key=True, index=True)
    triage_session_id = Column(Integer, ForeignKey("triage_sessions.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=False)
    question_order = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("TriageSession", back_populates="answers")


class SymptomFlag(Base):
    __tablename__ = "symptom_flags"

    id = Column(Integer, primary_key=True, index=True)
    triage_session_id = Column(Integer, ForeignKey("triage_sessions.id"), nullable=False)
    # e.g. "chest_pain", "shortness_of_breath", "pain_level"
    flag_name = Column(String, nullable=False)
    # e.g. "true", "false", "8"
    flag_value = Column(String, nullable=False)

    session = relationship("TriageSession", back_populates="symptom_flags")


class RoutingRecommendation(Base):
    __tablename__ = "routing_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    triage_session_id = Column(Integer, ForeignKey("triage_sessions.id"), nullable=False)
    care_location_id = Column(Integer, ForeignKey("care_locations.id"), nullable=False)
    rank_position = Column(Integer, nullable=False)
    travel_time_mins = Column(Integer)
    distance_km = Column(Float)
    predicted_wait_mins = Column(Integer)
    # 0.0 to 1.0
    specialty_match_score = Column(Float)
    # 0.0 to 1.0
    severity_fit_score = Column(Float)
    # composite score used for ranking
    final_score = Column(Float)
    recommended = Column(Boolean, default=False)

    session = relationship("TriageSession", back_populates="routing_recommendations")
    care_location = relationship("CareLocation", back_populates="routing_recommendations")


class Handoff(Base):
    __tablename__ = "handoffs"

    id = Column(Integer, primary_key=True, index=True)
    triage_session_id = Column(Integer, ForeignKey("triage_sessions.id"), nullable=False)
    care_location_id = Column(Integer, ForeignKey("care_locations.id"), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    eta_mins = Column(Integer)
    clinical_summary = Column(Text)
    severity_score = Column(Integer)
    # pending | received | patient_arrived | completed
    handoff_status = Column(String, default="pending")

    session = relationship("TriageSession", back_populates="handoffs")
    care_location = relationship("CareLocation", back_populates="handoffs")


class VitalMonitoringEvent(Base):
    __tablename__ = "vital_monitoring_events"

    id = Column(Integer, primary_key=True, index=True)
    triage_session_id = Column(Integer, ForeignKey("triage_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    heart_rate = Column(Integer)
    breathing_rate = Column(Integer)
    # 0.0 to 1.0
    stress_score = Column(Float)
    # low | moderate | high | critical
    risk_level = Column(String, default="low")
    alert_triggered = Column(Boolean, default=False)

    session = relationship("TriageSession", back_populates="vital_events")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    triage_session_id = Column(Integer, ForeignKey("triage_sessions.id"), nullable=False)
    care_location_id = Column(Integer, ForeignKey("care_locations.id"), nullable=False)
    # vital_deterioration | severe_symptom | no_show | escalation
    alert_type = Column(String, nullable=False)
    alert_message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    session = relationship("TriageSession", back_populates="alerts")
    care_location = relationship("CareLocation", back_populates="alerts")


class VisitOutcome(Base):
    __tablename__ = "visit_outcomes"

    id = Column(Integer, primary_key=True, index=True)
    triage_session_id = Column(Integer, ForeignKey("triage_sessions.id"), unique=True, nullable=False)
    care_location_id = Column(Integer, ForeignKey("care_locations.id"), nullable=False)
    actual_seen_at = Column(DateTime)
    actual_wait_mins = Column(Integer)
    # discharged | admitted | transferred | left_without_being_seen
    final_disposition = Column(String)
    # e.g. "respiratory", "cardiac", "trauma"
    diagnosis_category = Column(String)
    triage_was_accurate = Column(Boolean)

    session = relationship("TriageSession", back_populates="visit_outcome")
    care_location = relationship("CareLocation", back_populates="visit_outcomes")
