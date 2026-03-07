from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class WaitTimeScenarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scenario_code: str
    label: str
    wait_minutes: Optional[int]
    wait_min_minutes: Optional[int]
    wait_max_minutes: Optional[int]
    target_minutes: int
    probability_within_target: float
    confidence_score: float
    notes: Optional[str] = None


class WaitTimeSourceRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source_kind: str
    source_name: str
    status: str
    confidence_score: float
    freshness_minutes: int
    reported_at: datetime
    wait_minutes: Optional[int]
    wait_min_minutes: Optional[int]
    wait_max_minutes: Optional[int]
    metadata_json: Optional[str] = None

    @field_serializer("reported_at")
    def serialize_reported_at(self, value: datetime) -> str:
        return value.isoformat()


class WaitTimeLocationSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    city: str
    latitude: float
    longitude: float

    @field_serializer("latitude", "longitude")
    def serialize_float(self, value: Any) -> float:
        return float(value) if value is not None else 0.0


class WaitTimeSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    care_location_id: int
    source_kind: str
    source_name: str
    status: str
    confidence_score: float
    confidence_label: str
    overall_wait_minutes: Optional[int]
    overall_wait_min_minutes: Optional[int]
    overall_wait_max_minutes: Optional[int]
    capacity_score: float
    queue_length: int
    occupancy_probability: float
    diversion_probability: float
    last_reported_at: datetime
    created_at: datetime
    scenarios: list[WaitTimeScenarioOut] = []
    source_records: list[WaitTimeSourceRecordOut] = []
    care_location: Optional[WaitTimeLocationSummaryOut] = None

    @field_serializer("last_reported_at", "created_at")
    def serialize_dt(self, value: datetime) -> str:
        return value.isoformat()

    @field_serializer(
        "confidence_score",
        "capacity_score",
        "occupancy_probability",
        "diversion_probability",
    )
    def serialize_float(self, value: Any) -> float:
        return float(value) if value is not None else 0.0
