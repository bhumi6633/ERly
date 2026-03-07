from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class ScenarioSignal:
    scenario_code: str
    label: str
    wait_minutes: int | None
    wait_min_minutes: int | None
    wait_max_minutes: int | None
    target_minutes: int
    probability_within_target: float
    confidence_score: float
    notes: str | None = None


@dataclass
class SourceSignal:
    source_kind: str
    source_name: str
    confidence_score: float
    freshness_minutes: int
    reported_at: datetime
    status: str
    wait_minutes: int | None = None
    wait_min_minutes: int | None = None
    wait_max_minutes: int | None = None
    scenarios: list[ScenarioSignal] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class FusedWaitTime:
    source_kind: str
    source_name: str
    source_count: int
    confidence_score: float
    confidence_label: str
    status: str
    overall_wait_minutes: int | None
    overall_wait_min_minutes: int | None
    overall_wait_max_minutes: int | None
    capacity_score: float
    queue_length: int
    occupancy_probability: float
    diversion_probability: float
    last_reported_at: datetime
    scenarios: list[ScenarioSignal] = field(default_factory=list)
    signals: list[SourceSignal] = field(default_factory=list)
