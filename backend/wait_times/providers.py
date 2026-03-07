from __future__ import annotations

import hashlib
import json
import os
import random
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

from models import CareLocation
from wait_times.constants import (
    CARE_SETTING_PROXY_FACTORS,
    DAYPART_DEMAND_MULTIPLIERS,
    FACILITY_BASELINES,
    HIGH_PRESSURE_SPECIALTIES,
    ONTARIO_BENCHMARK_SIZE_FACTORS,
    ONTARIO_CTAS_BENCHMARKS,
    ONTARIO_MEDIAN_ED_PHYSICIAN_WAIT_MINUTES,
    SCENARIO_LIBRARY,
    SOURCE_BASE_CONFIDENCE,
    WAIT_TIME_REFRESH_BUCKET_MINUTES,
    WEEKDAY_DEMAND_MULTIPLIERS,
)
from wait_times.live_sources import (
    MEDIMAP_LOCATION_REGISTRY,
    SUNNYBROOK_LOCATION_REGISTRY,
    THP_LOCATION_REGISTRY,
    UHN_LOCATION_REGISTRY,
    fetch_medimap_status,
    fetch_sunnybrook_ed,
    fetch_thp_methodology,
    fetch_thp_stats,
    fetch_uhn_dashboard,
    fetch_uhn_methodology,
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
    source_name = "Official hospital feed"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        uhn_registry = UHN_LOCATION_REGISTRY.get(location.name)
        if uhn_registry:
            try:
                methodology = fetch_uhn_methodology()
                artifact_dir = os.getenv("WAIT_TIME_EVIDENCE_DIR") or None
                dashboard = fetch_uhn_dashboard(artifact_dir=artifact_dir)
                record = dashboard.get(uhn_registry["facility_label"])
            except Exception:
                record = None
                methodology = None

            if record and methodology:
                lower_bound = min(record.majority_seen_within_minutes, record.average_wait_minutes)
                upper_bound = max(record.majority_seen_within_minutes, record.average_wait_minutes)
                confidence = 0.91
                return SourceSignal(
                    source_kind=self.source_kind,
                    source_name=f"{uhn_registry['facility_label']} official dashboard",
                    confidence_score=round(clamp(confidence), 3),
                    freshness_minutes=0,
                    reported_at=(
                        datetime.fromisoformat(record.last_updated_iso)
                        if record.last_updated_iso
                        else as_utc_naive(now)
                    ),
                    status="reported",
                    wait_minutes=record.majority_seen_within_minutes,
                    wait_min_minutes=lower_bound,
                    wait_max_minutes=upper_bound,
                    scenarios=[
                        ScenarioSignal(
                            scenario_code="immediate_emergency",
                            label="Immediate emergency",
                            wait_minutes=None,
                            wait_min_minutes=None,
                            wait_max_minutes=None,
                            target_minutes=10,
                            probability_within_target=1.0,
                            confidence_score=round(clamp(confidence), 3),
                            notes="Immediate life-threatening triage cases are prioritized ahead of posted dashboard wait times.",
                        ),
                        ScenarioSignal(
                            scenario_code="majority_seen_within",
                            label="Majority of patients seen within",
                            wait_minutes=record.majority_seen_within_minutes,
                            wait_min_minutes=record.majority_seen_within_minutes,
                            wait_max_minutes=record.majority_seen_within_minutes,
                            target_minutes=180,
                            probability_within_target=1.0 if record.majority_seen_within_minutes <= 180 else 0.35,
                            confidence_score=round(clamp(confidence), 3),
                            notes="Official UHN dashboard metric shown to arriving ED patients.",
                        ),
                        ScenarioSignal(
                            scenario_code="standard_er",
                            label="Standard ER",
                            wait_minutes=record.average_wait_minutes,
                            wait_min_minutes=lower_bound,
                            wait_max_minutes=upper_bound,
                            target_minutes=180,
                            probability_within_target=1.0 if record.average_wait_minutes <= 180 else 0.28,
                            confidence_score=round(clamp(confidence - 0.02), 3),
                            notes=methodology.update_excerpt or methodology.description_excerpt,
                        ),
                        ScenarioSignal(
                            scenario_code="low_acuity_non_urgent",
                            label="Low-acuity / non-urgent",
                            wait_minutes=round(record.average_wait_minutes * 1.12),
                            wait_min_minutes=record.majority_seen_within_minutes,
                            wait_max_minutes=round(record.average_wait_minutes * 1.22),
                            target_minutes=240,
                            probability_within_target=0.62 if record.average_wait_minutes <= 210 else 0.26,
                            confidence_score=round(clamp(confidence - 0.08), 3),
                            notes="Heuristic uplift above the official dashboard because lower-acuity patients are typically deprioritized behind sicker arrivals.",
                        ),
                    ],
                    metadata={
                        "facility_label": uhn_registry["facility_label"],
                        "source_url": methodology.powerbi_url or None,
                        "methodology_url": uhn_registry.get("page_url")
                        or "https://www.uhn.ca/PatientsFamilies/Visit_UHN/Emergency/Pages/ED_wait_times.aspx",
                        "definition_excerpt": "Official UHN dashboard metric: The majority of patients will be seen within.",
                        "methodology_excerpt": methodology.update_excerpt,
                        "urgency_excerpt": "Immediate life-threatening patients are triaged ahead of posted dashboard times.",
                        "browser_probe": True,
                        "evidence_tier": "official_browser_dashboard",
                        "match_strategy": "exact",
                        "source_fingerprint_sha256": record.evidence_sha256,
                        "raw_dashboard_text": record.raw_block_text,
                        "screenshot_path": record.screenshot_path,
                        "majority_seen_within_minutes": record.majority_seen_within_minutes,
                        "average_wait_minutes": record.average_wait_minutes,
                        "patients_waiting": record.waiting_patients,
                        "patients_being_treated": record.being_treated_patients,
                        "dashboard_updated_text": record.last_updated_text,
                        "capacity_score": round(
                            clamp((record.waiting_patients + record.being_treated_patients) / 90),
                            3,
                        ),
                        "queue_length": record.waiting_patients,
                        "occupancy_probability": round(
                            clamp((record.waiting_patients + record.being_treated_patients) / 70),
                            3,
                        ),
                        "diversion_probability": round(clamp((record.waiting_patients - 15) / 80), 3),
                    },
                )

        registry = THP_LOCATION_REGISTRY.get(location.name)
        if not registry:
            return None
        try:
            stats = fetch_thp_stats(registry["site_code"], registry["facility_label"])
            methodology = fetch_thp_methodology()
        except Exception:
            return None

        average_minutes = round(stats.average_hours * 60) if stats.average_hours is not None else None
        average_80_minutes = round(stats.average_80th_hours * 60) if stats.average_80th_hours is not None else None

        current_hour = now.strftime("%H")
        predicted_hour_wait = None
        if current_hour in stats.hourly_labels:
            hour_index = stats.hourly_labels.index(current_hour)
            predicted_hour_wait = round(stats.hourly_predicted_hours[hour_index] * 60)

        lower_bound = average_minutes or predicted_hour_wait or average_80_minutes
        upper_bound = average_80_minutes or predicted_hour_wait or average_minutes
        if lower_bound is not None and upper_bound is not None and lower_bound > upper_bound:
            lower_bound, upper_bound = upper_bound, lower_bound

        confidence = round(clamp(SOURCE_BASE_CONFIDENCE[self.source_kind]), 3)
        scenarios = [
            ScenarioSignal(
                scenario_code="immediate_emergency",
                label="Immediate emergency",
                wait_minutes=None,
                wait_min_minutes=None,
                wait_max_minutes=None,
                target_minutes=10,
                probability_within_target=1.0,
                confidence_score=confidence,
                notes=methodology.urgency_excerpt or "Official ED dashboard does not apply to immediate life-threatening triage cases.",
            ),
            ScenarioSignal(
                scenario_code="predicted_current_hour",
                label="Predicted current-hour queue",
                wait_minutes=predicted_hour_wait,
                wait_min_minutes=max(0, predicted_hour_wait - 15) if predicted_hour_wait is not None else None,
                wait_max_minutes=(predicted_hour_wait + 15) if predicted_hour_wait is not None else None,
                target_minutes=90,
                probability_within_target=1.0 if predicted_hour_wait is not None and predicted_hour_wait <= 90 else 0.42,
                confidence_score=confidence,
                notes=methodology.methodology_excerpt,
            ),
            ScenarioSignal(
                scenario_code="standard_er",
                label="Standard ER after triage",
                wait_minutes=average_80_minutes,
                wait_min_minutes=lower_bound,
                wait_max_minutes=upper_bound,
                target_minutes=120,
                probability_within_target=1.0 if average_80_minutes is not None and average_80_minutes <= 120 else 0.35,
                confidence_score=confidence,
                notes=methodology.definition_excerpt,
            ),
            ScenarioSignal(
                scenario_code="low_acuity_non_urgent",
                label="Low-acuity / non-urgent",
                wait_minutes=(round(average_80_minutes * 1.15) if average_80_minutes is not None else None),
                wait_min_minutes=(lower_bound if lower_bound is not None else None),
                wait_max_minutes=(round(upper_bound * 1.25) if upper_bound is not None else None),
                target_minutes=180,
                probability_within_target=0.58 if average_80_minutes is not None and average_80_minutes <= 180 else 0.22,
                confidence_score=round(clamp(confidence - 0.09), 3),
                notes=(
                    "Heuristic uplift above the official 80th percentile because the hospital states sicker patients may be seen sooner than the dashboard time."
                ),
            ),
        ]

        return SourceSignal(
            source_kind=self.source_kind,
            source_name=f"{registry['facility_label']} official feed",
            confidence_score=confidence,
            freshness_minutes=0,
            reported_at=datetime.fromisoformat(stats.last_updated.replace("Z", "+00:00")) if stats.last_updated else as_utc_naive(now),
            status="reported",
            wait_minutes=average_80_minutes,
            wait_min_minutes=lower_bound,
            wait_max_minutes=upper_bound,
            scenarios=scenarios,
            metadata={
                "facility_label": registry["facility_label"],
                "site_code": registry["site_code"],
                "source_url": f"https://edwt-prd.thp.ca/waittimes/stats/{registry['site_code']}",
                "methodology_url": "https://www.thp.ca/emergency/A/visit.html",
                "evidence_tier": "official_api_feed",
                "match_strategy": "exact",
                "definition_excerpt": methodology.definition_excerpt,
                "methodology_excerpt": methodology.methodology_excerpt,
                "urgency_excerpt": methodology.urgency_excerpt,
                "reported_average_hours": stats.average_hours,
                "reported_80th_hours": stats.average_80th_hours,
                "patients_waiting": stats.patients_waiting,
                "active_patients": stats.active_patients,
                "active_no_bed_admits": stats.active_no_bed_admits,
                "hourly_labels": stats.hourly_labels,
                "hourly_predicted_hours": stats.hourly_predicted_hours,
                "capacity_score": round(
                    clamp((stats.active_patients or 0) / max((stats.active_patients or 0) + 40, 1)),
                    3,
                ),
                "queue_length": stats.patients_waiting or 0,
                "occupancy_probability": round(
                    clamp((stats.active_patients or 0) / max((stats.active_patients or 0) + 25, 1)),
                    3,
                ),
                "diversion_probability": round(
                    clamp((stats.active_no_bed_admits or 0) / max((stats.active_patients or 1), 1)),
                    3,
                ),
                "raw_payload": stats.raw_payload,
                "source_fingerprint_sha256": hashlib.sha256(
                    json.dumps(stats.raw_payload, sort_keys=True).encode("utf-8")
                ).hexdigest(),
            },
        )


class PublicAggregatorProvider(WaitTimeSourceProvider):
    source_kind = "public_aggregator"
    source_name = "Public aggregator"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        sunnybrook_registry = SUNNYBROOK_LOCATION_REGISTRY.get(location.name)
        if sunnybrook_registry:
            try:
                record = fetch_sunnybrook_ed()
            except Exception:
                record = None

            if record and (record.average_wait_minutes is not None or record.patients_waiting is not None):
                wait = record.average_wait_minutes
                lower = round(wait * 0.80) if wait is not None else None
                upper = round(wait * 1.25) if wait is not None else None
                confidence = 0.88
                return SourceSignal(
                    source_kind=self.source_kind,
                    source_name=f"{sunnybrook_registry['facility_label']} ED dashboard",
                    confidence_score=round(clamp(confidence), 3),
                    freshness_minutes=0,
                    reported_at=as_utc_naive(now),
                    status="reported",
                    wait_minutes=wait,
                    wait_min_minutes=lower,
                    wait_max_minutes=upper,
                    scenarios=[
                        ScenarioSignal(
                            scenario_code="immediate_emergency",
                            label="Immediate emergency",
                            wait_minutes=None,
                            wait_min_minutes=None,
                            wait_max_minutes=None,
                            target_minutes=10,
                            probability_within_target=1.0,
                            confidence_score=round(clamp(confidence), 3),
                            notes="CTAS 1 resuscitation cases are seen immediately ahead of posted wait times.",
                        ),
                        ScenarioSignal(
                            scenario_code="standard_er",
                            label="Standard ER",
                            wait_minutes=wait,
                            wait_min_minutes=lower,
                            wait_max_minutes=upper,
                            target_minutes=180,
                            probability_within_target=1.0 if wait is not None and wait <= 180 else 0.35,
                            confidence_score=round(clamp(confidence), 3),
                            notes="Average wait time from Sunnybrook ED dashboard.",
                        ),
                        ScenarioSignal(
                            scenario_code="low_acuity_non_urgent",
                            label="Low-acuity / non-urgent",
                            wait_minutes=round(wait * 1.18) if wait is not None else None,
                            wait_min_minutes=upper,
                            wait_max_minutes=round(wait * 1.40) if wait is not None else None,
                            target_minutes=240,
                            probability_within_target=0.55 if wait is not None and wait <= 200 else 0.22,
                            confidence_score=round(clamp(confidence - 0.08), 3),
                            notes="Heuristic uplift: lower-acuity patients deprioritized behind sicker arrivals.",
                        ),
                    ],
                    metadata={
                        "evidence_tier": "official_browser_dashboard",
                        "match_strategy": "exact",
                        "source_url": sunnybrook_registry["page_url"],
                        "methodology_url": sunnybrook_registry["methodology_url"],
                        "average_wait_minutes": record.average_wait_minutes,
                        "patients_waiting": record.patients_waiting,
                        "dashboard_updated_text": record.last_updated_text,
                        "raw_dashboard_text": record.raw_block_text,
                        "source_fingerprint_sha256": record.evidence_sha256,
                        "capacity_score": round(clamp((record.patients_waiting or 0) / 70), 3),
                        "queue_length": record.patients_waiting or 0,
                        "occupancy_probability": round(clamp((record.patients_waiting or 0) / 60), 3),
                        "diversion_probability": 0.0,
                    },
                )
        registry = MEDIMAP_LOCATION_REGISTRY.get(location.name)
        if not registry:
            return None

        try:
            status = fetch_medimap_status(registry["page_url"])
        except Exception:
            return None

        confidence = 0.58 if registry.get("match_strategy") == "manual_alias" else SOURCE_BASE_CONFIDENCE[self.source_kind]
        status_label = status.status_text or status.wait_card_text or "unknown"
        normalized = status_label.lower()
        source_status = "available"
        if "open until" in normalized or "open now" in normalized:
            source_status = "reported"
        elif "opens" in normalized or "closed" in normalized:
            source_status = "closed"

        return SourceSignal(
            source_kind=self.source_kind,
            source_name="Medimap public page",
            confidence_score=round(clamp(confidence), 3),
            freshness_minutes=0,
            reported_at=as_utc_naive(now),
            status=source_status,
            wait_minutes=None,
            wait_min_minutes=None,
            wait_max_minutes=None,
            scenarios=[
                ScenarioSignal(
                    scenario_code="clinic_public_status",
                    label="Public clinic status",
                    wait_minutes=None,
                    wait_min_minutes=None,
                    wait_max_minutes=None,
                    target_minutes=0,
                    probability_within_target=0.0,
                    confidence_score=round(clamp(confidence), 3),
                    notes=status.status_text or status.wait_card_text,
                )
            ],
            metadata={
                "source_url": registry["page_url"],
                "evidence_tier": "public_aggregator_page",
                "match_strategy": registry.get("match_strategy", "exact"),
                "mapping_notes": registry.get("notes"),
                "public_clinic_name": status.clinic_name,
                "public_address": status.address,
                "public_status_text": status.status_text,
                "wait_card_text": status.wait_card_text,
                "join_waitlist_available": status.join_waitlist_available,
                "sign_in_required_for_wait_times": status.sign_in_required_for_wait_times,
                "raw_snippets": status.raw_snippets,
                "capacity_score": 0.35 if source_status == "closed" else 0.5,
                "queue_length": 0,
                "occupancy_probability": 0.2 if source_status == "closed" else 0.45,
                "diversion_probability": 0.0,
                "source_fingerprint_sha256": hashlib.sha256(
                    "\n".join(status.raw_snippets).encode("utf-8")
                ).hexdigest()
                if status.raw_snippets
                else None,
            },
        )


class EmsSignalProvider(WaitTimeSourceProvider):
    source_kind = "ems_signal"
    source_name = "EMS diversion registry"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        # Hook for ambulance diversion / bed saturation feeds.
        return None


class ProvincialBenchmarkProvider(WaitTimeSourceProvider):
    """
    Fallback provider using Ontario's published ED wait-time benchmarks.
    Activates only for locations NOT covered by an official hospital feed.

    Primary sources:
    - Health Quality Ontario. "Time spent in emergency departments." 2022-23.
      https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
    - Canadian Triage and Acuity Scale (CTAS) 2020 Implementation Guidelines,
      CAEP / NENA / AMUQ / NCA. https://caep.ca/resources/ctas/
    - CIHI National Ambulatory Care Reporting System (NACRS), 2022-23 extract.
      https://www.cihi.ca/en/nacrs-metadata
    """

    source_kind = "provincial_benchmark"
    source_name = "Ontario Health provincial benchmark model"
    BENCHMARK_URL = (
        "https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments"
    )
    CTAS_URL = "https://caep.ca/resources/ctas/"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        # Always fires as a supplementary/fallback signal.
        # When an official feed succeeds (confidence 0.91–0.94), the fuse logic
        # will use it as the primary. When it fails, the benchmark takes over.
        size_factor = ONTARIO_BENCHMARK_SIZE_FACTORS.get(location.type)
        if size_factor is None:
            return None

        now = as_utc_naive(now)
        daypart_mult = DAYPART_DEMAND_MULTIPLIERS[get_daypart(now.hour)]
        weekday_mult = WEEKDAY_DEMAND_MULTIPLIERS.get(now.weekday(), 1.0)

        baseline = ONTARIO_MEDIAN_ED_PHYSICIAN_WAIT_MINUTES * size_factor * daypart_mult * weekday_mult
        est_wait = max(1, round(baseline))
        range_low = max(1, round(baseline * 0.70))
        range_high = round(baseline * 1.35)

        confidence = round(clamp(SOURCE_BASE_CONFIDENCE[self.source_kind]), 3)

        # CTAS-level scenarios using published Ontario / CAEP benchmark values
        ctas_scenarios: list[ScenarioSignal] = []
        for code, bench in ONTARIO_CTAS_BENCHMARKS.items():
            target = bench["physician_wait_target_minutes"]
            p90 = bench["physician_wait_90th_minutes"]
            scenario_wait = max(0, round(target * size_factor * daypart_mult * weekday_mult))
            scenario_min = max(0, round(scenario_wait * 0.75))
            scenario_max = max(scenario_wait, round(p90 * size_factor))
            ctas_scenarios.append(
                ScenarioSignal(
                    scenario_code=code,
                    label=bench["label"],
                    wait_minutes=scenario_wait,
                    wait_min_minutes=scenario_min,
                    wait_max_minutes=scenario_max,
                    target_minutes=target,
                    probability_within_target=probability_within_target(
                        scenario_min, scenario_max, target, confidence
                    ),
                    confidence_score=confidence,
                    notes=bench["citation"],
                )
            )

        is_open = is_location_open(location, now)
        status = "estimated" if is_open else "closed"
        facility_baseline = FACILITY_BASELINES.get(location.type, FACILITY_BASELINES["clinic"])
        est_queue = max(0, round(facility_baseline["queue"] * daypart_mult * weekday_mult))

        return SourceSignal(
            source_kind=self.source_kind,
            source_name=self.source_name,
            confidence_score=confidence,
            freshness_minutes=0,
            reported_at=now,
            status=status,
            wait_minutes=est_wait if is_open else None,
            wait_min_minutes=range_low if is_open else None,
            wait_max_minutes=range_high if is_open else None,
            scenarios=ctas_scenarios,
            metadata={
                "evidence_tier": "provincial_benchmark",
                "match_strategy": "benchmark_model",
                "benchmark_url": self.BENCHMARK_URL,
                "ctas_guidelines_url": self.CTAS_URL,
                "formula_explanation": (
                    "est_wait = ontario_median_physician_wait"
                    " × size_factor × daypart_multiplier × weekday_multiplier"
                ),
                "formula_inputs": {
                    "ontario_median_physician_wait_minutes": {
                        "value": ONTARIO_MEDIAN_ED_PHYSICIAN_WAIT_MINUTES,
                        "source_citation": (
                            "Health Quality Ontario, Time spent in emergency departments 2022-23. "
                            + self.BENCHMARK_URL
                        ),
                    },
                    "size_factor": {
                        "value": round(size_factor, 3),
                        "source_citation": (
                            f"Derived from HQO volume-weighted ED data for '{location.type}' facility type. "
                            + self.BENCHMARK_URL
                        ),
                    },
                    "daypart_multiplier": {
                        "value": round(daypart_mult, 3),
                        "source_citation": (
                            "CIHI NACRS hourly ED arrival distribution 2022-23. "
                            "https://www.cihi.ca/en/nacrs-metadata"
                        ),
                    },
                    "weekday_multiplier": {
                        "value": round(weekday_mult, 3),
                        "source_citation": (
                            "CIHI NACRS weekday ED arrival distribution 2022-23. "
                            "https://www.cihi.ca/en/nacrs-metadata"
                        ),
                    },
                },
                "ontario_median_minutes": ONTARIO_MEDIAN_ED_PHYSICIAN_WAIT_MINUTES,
                "range_low": range_low,
                "range_high": range_high,
                "capacity_score": round(min(0.60, size_factor * 0.50), 3),
                "queue_length": est_queue,
                "occupancy_probability": round(min(0.65, size_factor * 0.52), 3),
                "diversion_probability": 0.0,
            },
        )


class CareSettingProxyProvider(WaitTimeSourceProvider):
    """
    Unconditional floor provider — fires for every open care location.

    Uses ERly's internally calibrated FACILITY_BASELINES, derived from
    CIHI 2022-23 National Ambulatory Care Reporting System attendance patterns.
    Confidence is intentionally low (0.32). The purpose is to guarantee
    a numeric estimate is always present in the fused signal, so the UI
    never shows a null wait for an open facility.

    Calibration source:
    - CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
    """

    source_kind = "care_setting_proxy"
    source_name = "ERly care-setting proxy (CIHI-calibrated baseline)"
    CIHI_URL = "https://www.cihi.ca/en/nacrs-metadata"

    def fetch(self, location: CareLocation, now: datetime) -> SourceSignal | None:
        baseline = FACILITY_BASELINES.get(location.type)
        if baseline is None:
            return None

        now = as_utc_naive(now)
        daypart_mult = DAYPART_DEMAND_MULTIPLIERS[get_daypart(now.hour)]
        weekday_mult = WEEKDAY_DEMAND_MULTIPLIERS.get(now.weekday(), 1.0)
        proxy_factor = CARE_SETTING_PROXY_FACTORS.get(location.type, 1.0)
        is_open = is_location_open(location, now)

        if is_open:
            est_wait = max(1, round(baseline["wait"] * daypart_mult * weekday_mult))
            spread = max(3, round(baseline["spread"] * 0.9))
            lower = max(0, est_wait - spread)
            upper = est_wait + spread
            status = "estimated"
        else:
            est_wait = None
            lower = None
            upper = None
            status = "closed"

        est_queue = (
            max(0, round(baseline["queue"] * daypart_mult * weekday_mult)) if is_open else 0
        )
        capacity = round(min(0.99, baseline["capacity"] * daypart_mult * weekday_mult), 3)
        confidence = round(clamp(SOURCE_BASE_CONFIDENCE["care_setting_proxy"]), 3)

        scenarios: list[ScenarioSignal] = []
        for definition in SCENARIO_LIBRARY.get(location.type, SCENARIO_LIBRARY["clinic"]):
            if est_wait is None:
                wait_value = None
                wait_min = None
                wait_max = None
                notes = "Facility currently closed based on configured hours."
            else:
                wait_value = max(0, round(est_wait * definition["factor"]))
                scenario_spread = max(2, round(definition["spread"] * 0.9))
                wait_min = max(0, wait_value - scenario_spread)
                wait_max = wait_value + scenario_spread
                notes = (
                    f"ERly care-setting baseline for {location.type} facilities, "
                    f"calibrated from CIHI NACRS 2022-23. {self.CIHI_URL}"
                )
            scenarios.append(
                ScenarioSignal(
                    scenario_code=definition["code"],
                    label=definition["label"],
                    wait_minutes=wait_value,
                    wait_min_minutes=wait_min,
                    wait_max_minutes=wait_max,
                    target_minutes=definition["target"],
                    probability_within_target=probability_within_target(
                        wait_min, wait_max, definition["target"], confidence
                    ),
                    confidence_score=confidence,
                    notes=notes,
                )
            )

        return SourceSignal(
            source_kind=self.source_kind,
            source_name=self.source_name,
            confidence_score=confidence,
            freshness_minutes=0,
            reported_at=now,
            status=status,
            wait_minutes=est_wait,
            wait_min_minutes=lower,
            wait_max_minutes=upper,
            scenarios=scenarios,
            metadata={
                "evidence_tier": "care_setting_proxy",
                "match_strategy": "facility_type_baseline",
                "source_url": self.CIHI_URL,
                "formula_explanation": (
                    "est_wait = facility_type_baseline_wait"
                    " × daypart_multiplier × weekday_multiplier"
                ),
                "formula_inputs": {
                    "facility_type_baseline_wait_minutes": {
                        "value": baseline["wait"],
                        "source_citation": (
                            f"ERly baseline for {location.type}: {baseline['wait']} min. "
                            f"Derived from CIHI NACRS 2022-23 median visit durations. "
                            + self.CIHI_URL
                        ),
                    },
                    "daypart_multiplier": {
                        "value": round(daypart_mult, 3),
                        "source_citation": (
                            "CIHI NACRS hourly ED arrival distribution 2022-23. "
                            + self.CIHI_URL
                        ),
                    },
                    "weekday_multiplier": {
                        "value": round(weekday_mult, 3),
                        "source_citation": (
                            "CIHI NACRS weekday ED arrival distribution 2022-23. "
                            + self.CIHI_URL
                        ),
                    },
                    "care_setting_proxy_factor": {
                        "value": round(proxy_factor, 3),
                        "source_citation": (
                            f"ERly CARE_SETTING_PROXY_FACTORS['{location.type}'] = {proxy_factor}. "
                            "Derived from CIHI NACRS weighted facility-type median visit durations."
                        ),
                    },
                },
                "capacity_score": capacity,
                "queue_length": est_queue,
                "occupancy_probability": round(min(0.99, capacity * 0.90), 3),
                "diversion_probability": (
                    round(max(0.0, (capacity - 0.85) * 1.2), 3)
                    if location.accepts_ambulance
                    else 0.0
                ),
                "open_now": is_open,
                "provider_note": (
                    "Evidence floor — deterministic estimate from CIHI-calibrated facility-type baselines. "
                    "Confidence intentionally low (0.32). Always prefer official or aggregator sources."
                ),
            },
        )


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
                "evidence_tier": "transparent_heuristic",
                "match_strategy": "synthetic",
                "formula_inputs": {
                    "base_wait_minutes": base["wait"],
                    "base_spread_minutes": base["spread"],
                    "daypart_multiplier": round(DAYPART_DEMAND_MULTIPLIERS[get_daypart(now.hour)], 3),
                    "weekday_multiplier": round(WEEKDAY_DEMAND_MULTIPLIERS.get(now.weekday(), 1.0), 3),
                    "specialty_uplift": round(specialty_uplift, 3),
                    "ambulance_uplift": round(ambulance_uplift, 3),
                    "emergency_uplift": round(emergency_uplift, 3),
                    "volatility": round(volatility, 3),
                },
                "formula_explanation": "overall_wait = base_wait * daypart * weekday * specialty * ambulance * emergency * volatility",
                "source_fingerprint_sha256": hashlib.sha256(
                    json.dumps(
                        {
                            "location_id": location.id,
                            "bucket_time": bucket_time.isoformat(),
                            "base_wait": base["wait"],
                            "demand_multiplier": round(demand_multiplier, 4),
                            "specialty_uplift": round(specialty_uplift, 4),
                            "ambulance_uplift": round(ambulance_uplift, 4),
                            "emergency_uplift": round(emergency_uplift, 4),
                            "volatility": round(volatility, 4),
                        },
                        sort_keys=True,
                    ).encode("utf-8")
                ).hexdigest(),
            },
        )


def default_providers() -> list[WaitTimeSourceProvider]:
    providers: list[WaitTimeSourceProvider] = [
        OfficialHospitalFeedProvider(),
        PublicAggregatorProvider(),
        EmsSignalProvider(),
        ProvincialBenchmarkProvider(),
        CareSettingProxyProvider(),
    ]
    if os.getenv("WAIT_TIME_ENABLE_SYNTHETIC", "").lower() in {"1", "true", "yes"}:
        providers.append(EstimationProvider())
    return providers
