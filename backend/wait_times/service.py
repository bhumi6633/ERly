from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import CareLocation, LiveStatus
from wait_times.constants import ROUTING_SCENARIO_PREFERENCES, WAIT_TIME_STALE_AFTER_MINUTES
from wait_times.models import WaitTimeScenario, WaitTimeSnapshot, WaitTimeSourceRecord
from wait_times.providers import clamp, confidence_label, default_providers
from wait_times.repository import get_latest_snapshot, get_latest_snapshots
from wait_times.types import FusedWaitTime, ScenarioSignal, SourceSignal


def utc_now() -> datetime:
    return datetime.utcnow().replace(second=0, microsecond=0)


def as_utc_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(second=0, microsecond=0)
    return value.astimezone(timezone.utc).replace(tzinfo=None, second=0, microsecond=0)


def freshness_weight(minutes: int) -> float:
    return max(0.3, 1.0 - (minutes / 180))


def weighted_average(values: list[tuple[float, float]]) -> float | None:
    usable = [(value, weight) for value, weight in values if value is not None and weight > 0]
    if not usable:
        return None
    numerator = sum(value * weight for value, weight in usable)
    denominator = sum(weight for _, weight in usable)
    if denominator <= 0:
        return None
    return numerator / denominator


def fuse_signals(signals: list[SourceSignal]) -> FusedWaitTime:
    ranked = sorted(
        signals,
        key=lambda signal: (
            signal.confidence_score,
            -signal.freshness_minutes,
            as_utc_naive(signal.reported_at),
        ),
        reverse=True,
    )
    primary = ranked[0]

    weighted_signals: list[tuple[SourceSignal, float]] = []
    for signal in ranked:
        weight = signal.confidence_score * freshness_weight(signal.freshness_minutes)
        weighted_signals.append((signal, weight))

    if primary.source_kind in {"official_hospital_feed", "provider_api"} and primary.wait_minutes is not None:
        overall_wait = primary.wait_minutes
        overall_lower = primary.wait_min_minutes
        overall_upper = primary.wait_max_minutes
        capacity_score = primary.metadata.get("capacity_score") or 0.0
        occupancy_probability = primary.metadata.get("occupancy_probability") or 0.0
        diversion_probability = primary.metadata.get("diversion_probability") or 0.0
        queue_length = primary.metadata.get("queue_length") or 0.0
        confidence_score = primary.confidence_score
    else:
        overall_wait = weighted_average([(signal.wait_minutes, weight) for signal, weight in weighted_signals])
        overall_lower = weighted_average([(signal.wait_min_minutes, weight) for signal, weight in weighted_signals])
        overall_upper = weighted_average([(signal.wait_max_minutes, weight) for signal, weight in weighted_signals])
        capacity_score = weighted_average([
            (signal.metadata.get("capacity_score"), weight) for signal, weight in weighted_signals
        ]) or 0.0
        occupancy_probability = weighted_average([
            (signal.metadata.get("occupancy_probability"), weight) for signal, weight in weighted_signals
        ]) or 0.0
        diversion_probability = weighted_average([
            (signal.metadata.get("diversion_probability"), weight) for signal, weight in weighted_signals
        ]) or 0.0
        queue_length = weighted_average([
            (signal.metadata.get("queue_length"), weight) for signal, weight in weighted_signals
        ]) or 0.0
        confidence_score = weighted_average([
            (signal.confidence_score, weight) for signal, weight in weighted_signals
        ]) or primary.confidence_score

    status = primary.status
    if any(signal.status == "reported" for signal in ranked):
        status = "reported"
    elif any(signal.status == "closed" for signal in ranked):
        status = "closed"
    elif diversion_probability >= 0.7:
        status = "diverting"

    if status == "closed" and not any(
        signal.wait_minutes is not None and signal.status == "reported"
        for signal in ranked
    ):
        overall_wait = None
        overall_lower = None
        overall_upper = None

    grouped_scenarios: dict[str, list[tuple[ScenarioSignal, float]]] = {}
    for signal, weight in weighted_signals:
        for scenario in signal.scenarios:
            grouped_scenarios.setdefault(scenario.scenario_code, []).append((scenario, weight))

    fused_scenarios: list[ScenarioSignal] = []
    for scenario_code, weighted_entries in grouped_scenarios.items():
        exemplar = weighted_entries[0][0]
        wait_minutes = weighted_average([(scenario.wait_minutes, weight) for scenario, weight in weighted_entries])
        wait_min = weighted_average([(scenario.wait_min_minutes, weight) for scenario, weight in weighted_entries])
        wait_max = weighted_average([(scenario.wait_max_minutes, weight) for scenario, weight in weighted_entries])
        scenario_confidence = weighted_average([
            (scenario.confidence_score, weight) for scenario, weight in weighted_entries
        ]) or exemplar.confidence_score
        probability = weighted_average([
            (scenario.probability_within_target, weight) for scenario, weight in weighted_entries
        ]) or exemplar.probability_within_target

        notes = next((scenario.notes for scenario, _ in weighted_entries if scenario.notes), None)
        fused_scenarios.append(
            ScenarioSignal(
                scenario_code=scenario_code,
                label=exemplar.label,
                wait_minutes=round(wait_minutes) if wait_minutes is not None else None,
                wait_min_minutes=round(wait_min) if wait_min is not None else None,
                wait_max_minutes=round(wait_max) if wait_max is not None else None,
                target_minutes=exemplar.target_minutes,
                probability_within_target=round(clamp(probability), 3),
                confidence_score=round(clamp(scenario_confidence), 3),
                notes=notes,
            )
        )

    fused_scenarios.sort(key=lambda scenario: scenario.target_minutes)
    latest_reported_at = max(as_utc_naive(signal.reported_at) for signal in ranked)
    return FusedWaitTime(
        source_kind=primary.source_kind,
        source_name=primary.source_name if len(ranked) == 1 else "ERly fused wait-time engine",
        source_count=len(ranked),
        confidence_score=round(clamp(confidence_score), 3),
        confidence_label=confidence_label(confidence_score),
        status=status,
        overall_wait_minutes=round(overall_wait) if overall_wait is not None else None,
        overall_wait_min_minutes=round(overall_lower) if overall_lower is not None else None,
        overall_wait_max_minutes=round(overall_upper) if overall_upper is not None else None,
        capacity_score=round(clamp(capacity_score), 3),
        queue_length=max(0, round(queue_length)),
        occupancy_probability=round(clamp(occupancy_probability), 3),
        diversion_probability=round(clamp(diversion_probability), 3),
        last_reported_at=latest_reported_at,
        scenarios=fused_scenarios,
        signals=ranked,
    )


def persist_snapshot(db: Session, location: CareLocation, fused: FusedWaitTime) -> WaitTimeSnapshot:
    db.query(WaitTimeSnapshot).filter(
        WaitTimeSnapshot.care_location_id == location.id,
        WaitTimeSnapshot.is_active.is_(True),
    ).update({"is_active": False})

    snapshot = WaitTimeSnapshot(
        care_location_id=location.id,
        source_kind=fused.source_kind,
        source_name=fused.source_name,
        status=fused.status,
        confidence_score=fused.confidence_score,
        confidence_label=fused.confidence_label,
        overall_wait_minutes=fused.overall_wait_minutes,
        overall_wait_min_minutes=fused.overall_wait_min_minutes,
        overall_wait_max_minutes=fused.overall_wait_max_minutes,
        capacity_score=fused.capacity_score,
        queue_length=fused.queue_length,
        occupancy_probability=fused.occupancy_probability,
        diversion_probability=fused.diversion_probability,
        last_reported_at=fused.last_reported_at,
        is_active=True,
    )
    db.add(snapshot)
    db.flush()

    for scenario in fused.scenarios:
        db.add(
            WaitTimeScenario(
                snapshot_id=snapshot.id,
                scenario_code=scenario.scenario_code,
                label=scenario.label,
                wait_minutes=scenario.wait_minutes,
                wait_min_minutes=scenario.wait_min_minutes,
                wait_max_minutes=scenario.wait_max_minutes,
                target_minutes=scenario.target_minutes,
                probability_within_target=scenario.probability_within_target,
                confidence_score=scenario.confidence_score,
                notes=scenario.notes,
            )
        )

    for signal in fused.signals:
        db.add(
            WaitTimeSourceRecord(
                snapshot_id=snapshot.id,
                source_kind=signal.source_kind,
                source_name=signal.source_name,
                status=signal.status,
                confidence_score=signal.confidence_score,
                freshness_minutes=signal.freshness_minutes,
                reported_at=signal.reported_at,
                wait_minutes=signal.wait_minutes,
                wait_min_minutes=signal.wait_min_minutes,
                wait_max_minutes=signal.wait_max_minutes,
                metadata_json=json.dumps(signal.metadata, default=str),
            )
        )

    sync_live_status(db, location, snapshot)
    db.flush()
    return snapshot


def sync_live_status(db: Session, location: CareLocation, snapshot: WaitTimeSnapshot) -> None:
    legacy_wait = snapshot.overall_wait_minutes
    if snapshot.status == "closed":
        legacy_wait = 480
    elif legacy_wait is None:
        legacy_wait = snapshot.overall_wait_max_minutes or 180

    ambulance_load = 0
    if location.accepts_ambulance:
        ambulance_load = min(5, round(snapshot.diversion_probability * 4))

    status = location.live_status or LiveStatus(care_location_id=location.id)
    status.current_wait_mins = legacy_wait
    status.predicted_wait_on_arrival_mins = snapshot.overall_wait_max_minutes or legacy_wait
    status.capacity_score = snapshot.capacity_score
    status.queue_length = snapshot.queue_length
    status.staffing_level = "low" if snapshot.capacity_score >= 0.92 else ("high" if snapshot.capacity_score <= 0.45 else "normal")
    status.ambulance_load = ambulance_load
    status.last_updated_at = snapshot.last_reported_at

    if location.live_status is None:
        db.add(status)
        location.live_status = status


def refresh_wait_time_for_location(
    db: Session,
    location: CareLocation,
    *,
    force: bool = False,
    now: datetime | None = None,
) -> WaitTimeSnapshot:
    now = as_utc_naive(now or utc_now())
    existing = get_latest_snapshot(db, location.id)
    if existing and not force:
        age = now - as_utc_naive(existing.last_reported_at)
        if age <= timedelta(minutes=WAIT_TIME_STALE_AFTER_MINUTES):
            return existing

    signals: list[SourceSignal] = []
    for provider in default_providers():
        signal = provider.fetch(location, now)
        if signal:
            signals.append(signal)

    if not signals:
        raise RuntimeError(f"No wait-time providers returned data for location {location.id}")

    fused = fuse_signals(signals)
    persist_snapshot(db, location, fused)
    return get_latest_snapshot(db, location.id)


def refresh_wait_times_for_locations(
    db: Session,
    locations: list[CareLocation],
    *,
    force: bool = False,
    now: datetime | None = None,
) -> dict[int, WaitTimeSnapshot]:
    refreshed: dict[int, WaitTimeSnapshot] = {}
    for location in locations:
        refreshed[location.id] = refresh_wait_time_for_location(db, location, force=force, now=now)
    return refreshed


def ensure_latest_snapshots(
    db: Session,
    locations: list[CareLocation],
    *,
    force: bool = False,
    now: datetime | None = None,
) -> dict[int, WaitTimeSnapshot]:
    now = as_utc_naive(now or utc_now())
    latest = get_latest_snapshots(db, [location.id for location in locations])
    stale_or_missing = []
    for location in locations:
        snapshot = latest.get(location.id)
        snapshot_time = as_utc_naive(snapshot.last_reported_at) if snapshot else None
        if force or snapshot is None or (now - snapshot_time) > timedelta(minutes=WAIT_TIME_STALE_AFTER_MINUTES):
            stale_or_missing.append(location)

    if stale_or_missing:
        latest.update(refresh_wait_times_for_locations(db, stale_or_missing, force=True, now=now))

    return latest


def get_latest_snapshot_for_location(
    db: Session,
    location_id: int,
    *,
    force_refresh: bool = False,
) -> WaitTimeSnapshot | None:
    snapshot = get_latest_snapshot(db, location_id)
    if snapshot and not force_refresh:
        return snapshot
    location = db.query(CareLocation).filter(CareLocation.id == location_id).first()
    if not location:
        return None
    return refresh_wait_time_for_location(db, location, force=True)


def severity_bucket(severity: int) -> str:
    if severity >= 9:
        return "critical"
    if severity >= 7:
        return "high"
    if severity >= 4:
        return "moderate"
    return "low"


def get_routing_wait_context(snapshot: WaitTimeSnapshot | None, location_type: str, severity: int) -> dict | None:
    if snapshot is None:
        return None

    preferences = ROUTING_SCENARIO_PREFERENCES.get(location_type, ROUTING_SCENARIO_PREFERENCES["clinic"])
    desired_codes = preferences[severity_bucket(severity)]
    scenarios_by_code = {scenario.scenario_code: scenario for scenario in snapshot.scenarios}

    selected = None
    for code in desired_codes:
        if code in scenarios_by_code:
            selected = scenarios_by_code[code]
            break

    if selected is None and snapshot.scenarios:
        selected = snapshot.scenarios[0]

    wait_minutes = None
    probability_within_target = None
    if selected is not None:
        wait_minutes = selected.wait_minutes or selected.wait_max_minutes or selected.wait_min_minutes
        probability_within_target = selected.probability_within_target
    if wait_minutes is None:
        wait_minutes = snapshot.overall_wait_minutes or snapshot.overall_wait_max_minutes or 240

    return {
        "wait_minutes": wait_minutes,
        "probability_within_target": probability_within_target,
        "confidence_score": snapshot.confidence_score,
        "confidence_label": snapshot.confidence_label,
        "source_kind": snapshot.source_kind,
        "status": snapshot.status,
        "diversion_probability": snapshot.diversion_probability,
        "scenario_code": (selected.scenario_code if selected else None),
    }
