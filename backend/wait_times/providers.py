from __future__ import annotations

import random
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

from models import CareLocation
from wait_times.constants import (
    DAYPART_DEMAND_MULTIPLIERS,
    FACILITY_BASELINES,
    HIGH_PRESSURE_SPECIALTIES,
    SCENARIO_LIBRARY,
    SOURCE_BASE_CONFIDENCE,
    WAIT_TIME_REFRESH_BUCKET_MINUTES,
    WEEKDAY_DEMAND_MULTIPLIERS,
)
from wait_times.types import ScenarioSignal, SourceSignal


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def as_utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(second=0, microsecond=0)
    return value.astimezone(timezone.utc).replace(tzinfo=None, second=0, microsecond=0)


def get_daypart(hour: int) -> str:
    if 0 <= hour < 6:
        return "overnight"
    if 6 <= hour < 11:
        return "morning"
    if 11 <= hour < 17:
        return "midday"
    return "evening"


def parse_clock(value: str | None) -> tuple[int, int] | None:
    if not value or ":" not in value:
        return None
    hours, minutes = value.split(":", 1)
    return int(hours), int(minutes)


def is_location_open(location: CareLocation, now: datetime) -> bool:
    if location.is_open_24_7:
        return True
    opening = parse_clock(location.opening_time)
    closing = parse_clock(location.closing_time)
    if not opening or not closing:
        return True

    current_minutes = now.hour * 60 + now.minute
    opening_minutes = opening[0] * 60 + opening[1]
    closing_minutes = closing[0] * 60 + closing[1]

    if closing_minutes >= opening_minutes:
        return opening_minutes <= current_minutes < closing_minutes

    return current_minutes >= opening_minutes or current_minutes < closing_minutes


def confidence_label(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score >= 0.6:
        return "medium"
    return "low"


def probability_within_target(lower: int | None, upper: int | None, target: int, confidence: float) -> float:
    if lower is None or upper is None:
        return 0.0
    if upper <= target:
        base = 0.92
    elif lower >= target:
        overflow = lower - target
        base = max(0.04, 0.58 - (overflow / max(target * 1.8, 1)))
    else:
        ratio = (target - lower) / max(upper - lower, 1)
        base = 0.35 + (0.45 * ratio)
    return round(clamp(base * (0.72 + confidence * 0.28)), 3)


class WaitTimeSourceProvider(ABC):
    source_kind: str
    source_name: str

    @abstractmethod
    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        raise NotImplementedError


class OfficialHospitalFeedProvider(WaitTimeSourceProvider):
    source_kind = "official_hospital_feed"
    source_name = "Official feed registry"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        # Hook for future per-facility feed integrations.
        return None


class PublicAggregatorProvider(WaitTimeSourceProvider):
    source_kind = "public_aggregator"
    source_name = "Public aggregator registry"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        # Hook for province/state dashboards or open data feeds.
        return None


class EmsSignalProvider(WaitTimeSourceProvider):
    source_kind = "ems_signal"
    source_name = "EMS diversion registry"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        # Hook for ambulance diversion / bed saturation feeds.
        return None


class EstimationProvider(WaitTimeSourceProvider):
    source_kind = "estimation"
    source_name = "ERly estimation engine"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal:
        now = as_utc_naive(now)
        bucket_minute = (now.minute // WAIT_TIME_REFRESH_BUCKET_MINUTES) * WAIT_TIME_REFRESH_BUCKET_MINUTES
        bucket_time = now.replace(minute=bucket_minute, second=0, microsecond=0)
        rng = random.Random(f"{location.id}:{bucket_time.isoformat()}:{location.type}")

        base = FACILITY_BASELINES.get(location.type, FACILITY_BASELINES["clinic"])
        demand_multiplier = DAYPART_DEMAND_MULTIPLIERS[get_daypart(now.hour)]
        demand_multiplier *= WEEKDAY_DEMAND_MULTIPLIERS.get(now.weekday(), 1.0)

        specialty_uplift = 1.0
        for specialty in getattr(location, "specialties", []) or []:
            specialty_uplift += HIGH_PRESSURE_SPECIALTIES.get(getattr(specialty, "specialty_name", specialty), 0.0)

        ambulance_uplift = 1.08 if location.accepts_ambulance else 1.0
        emergency_uplift = 1.06 if location.has_emergency_department else 1.0
        volatility = rng.uniform(0.88, 1.16)
        is_open = is_location_open(location, now)

        if is_open:
            overall_wait = max(
                1,
                round(base["wait"] * demand_multiplier * specialty_uplift * ambulance_uplift * emergency_uplift * volatility),
            )
            spread = max(4, round(base["spread"] * rng.uniform(0.8, 1.25)))
            lower = max(0, overall_wait - spread)
            upper = overall_wait + spread
            capacity = clamp(
                base["capacity"] * demand_multiplier * rng.uniform(0.92, 1.1) + (0.06 if location.accepts_ambulance else 0.0),
                0.05,
                0.99,
            )
            queue_length = max(0, round(base["queue"] * capacity * rng.uniform(0.75, 1.25)))
            diversion_probability = clamp(((capacity - 0.74) * 1.5) if location.accepts_ambulance else ((capacity - 0.86) * 1.2))
            status = "estimated"
        else:
            overall_wait = None
            lower = None
            upper = None
            capacity = clamp(base["capacity"] * 0.4, 0.02, 0.4)
            queue_length = 0
            diversion_probability = 0.0
            status = "closed"

        confidence = SOURCE_BASE_CONFIDENCE[self.source_kind]
        if location.type in ("clinic", "pharmacy"):
            confidence += 0.05
        if not is_open:
            confidence += 0.08
        if location.accepts_ambulance:
            confidence -= 0.03
        confidence = round(clamp(confidence), 3)

        scenarios: list[ScenarioSignal] = []
        for definition in SCENARIO_LIBRARY.get(location.type, SCENARIO_LIBRARY["clinic"]):
            if overall_wait is None:
                wait_value = None
                wait_min = None
                wait_max = None
                notes = "Facility currently closed based on configured hours."
            else:
                wait_value = max(0, round(overall_wait * definition["factor"]))
                scenario_spread = max(2, round(definition["spread"] * rng.uniform(0.85, 1.15)))
                wait_min = max(0, wait_value - scenario_spread)
                wait_max = wait_value + scenario_spread
                notes = None

            scenarios.append(
                ScenarioSignal(
                    scenario_code=definition["code"],
                    label=definition["label"],
                    wait_minutes=wait_value,
                    wait_min_minutes=wait_min,
                    wait_max_minutes=wait_max,
                    target_minutes=definition["target"],
                    probability_within_target=probability_within_target(wait_min, wait_max, definition["target"], confidence),
                    confidence_score=confidence,
                    notes=notes,
                )
            )

        freshness_minutes = max(0, int((now - bucket_time).total_seconds() // 60))
        return SourceSignal(
            source_kind=self.source_kind,
            source_name=self.source_name,
            confidence_score=confidence,
            freshness_minutes=freshness_minutes,
            reported_at=bucket_time,
            status=status,
            wait_minutes=overall_wait,
            wait_min_minutes=lower,
            wait_max_minutes=upper,
            scenarios=scenarios,
            metadata={
                "capacity_score": round(capacity, 3),
                "queue_length": queue_length,
                "occupancy_probability": round(clamp(capacity * 0.96), 3),
                "diversion_probability": round(diversion_probability, 3),
                "forecast_window_minutes": WAIT_TIME_REFRESH_BUCKET_MINUTES,
                "open_now": is_open,
                "next_refresh_eta": (bucket_time + timedelta(minutes=WAIT_TIME_REFRESH_BUCKET_MINUTES)).isoformat(),
                "weather_factor": 1.0,
                "traffic_factor": 1.0,
            },
        )


def default_providers() -> list[WaitTimeSourceProvider]:
    return [
        OfficialHospitalFeedProvider(),
        PublicAggregatorProvider(),
        EmsSignalProvider(),
        EstimationProvider(),
    ]
