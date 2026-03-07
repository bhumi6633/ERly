from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class WaitTimeSnapshot(Base):
    __tablename__ = "wait_time_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    care_location_id = Column(Integer, ForeignKey("care_locations.id"), nullable=False, index=True)
    source_kind = Column(String, nullable=False)
    source_name = Column(String, nullable=False)
    status = Column(String, default="estimated")
    confidence_score = Column(Float, default=0.0)
    confidence_label = Column(String, default="low")
    overall_wait_minutes = Column(Integer, nullable=True)
    overall_wait_min_minutes = Column(Integer, nullable=True)
    overall_wait_max_minutes = Column(Integer, nullable=True)
    capacity_score = Column(Float, default=0.5)
    queue_length = Column(Integer, default=0)
    occupancy_probability = Column(Float, default=0.5)
    diversion_probability = Column(Float, default=0.0)
    last_reported_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True, index=True)

    care_location = relationship("CareLocation", back_populates="wait_time_snapshots")
    scenarios = relationship("WaitTimeScenario", back_populates="snapshot", cascade="all, delete-orphan")
    source_records = relationship("WaitTimeSourceRecord", back_populates="snapshot", cascade="all, delete-orphan")


class WaitTimeScenario(Base):
    __tablename__ = "wait_time_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("wait_time_snapshots.id"), nullable=False, index=True)
    scenario_code = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)
    wait_minutes = Column(Integer, nullable=True)
    wait_min_minutes = Column(Integer, nullable=True)
    wait_max_minutes = Column(Integer, nullable=True)
    target_minutes = Column(Integer, nullable=False)
    probability_within_target = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)

    snapshot = relationship("WaitTimeSnapshot", back_populates="scenarios")


class WaitTimeSourceRecord(Base):
    __tablename__ = "wait_time_source_records"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("wait_time_snapshots.id"), nullable=False, index=True)
    source_kind = Column(String, nullable=False)
    source_name = Column(String, nullable=False)
    status = Column(String, default="available")
    confidence_score = Column(Float, default=0.0)
    freshness_minutes = Column(Integer, default=0)
    reported_at = Column(DateTime, default=datetime.utcnow)
    wait_minutes = Column(Integer, nullable=True)
    wait_min_minutes = Column(Integer, nullable=True)
    wait_max_minutes = Column(Integer, nullable=True)
    metadata_json = Column(Text, nullable=True)

    snapshot = relationship("WaitTimeSnapshot", back_populates="source_records")
