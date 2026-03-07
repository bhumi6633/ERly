WAIT_TIME_STALE_AFTER_MINUTES = 10
WAIT_TIME_REFRESH_BUCKET_MINUTES = 15

SOURCE_BASE_CONFIDENCE = {
    "official_hospital_feed": 0.94,
    "public_aggregator": 0.84,
    "provider_api": 0.9,
    "ems_signal": 0.76,
    "provincial_benchmark": 0.48,
    "ontario_monthly_benchmark": 0.62,
    "care_setting_proxy": 0.32,
    "insufficient_evidence": 1.0,
    "estimation": 0.63,
}

CARE_SETTING_PROXY_FACTORS = {
    "hospital": 1.0,
    "er": 1.08,
    "urgent_care": 0.58,
    "clinic": 0.46,
    "pharmacy": 0.22,
}

FACILITY_BASELINES = {
    "hospital": {"wait": 76, "spread": 28, "capacity": 0.78, "queue": 28},
    "er": {"wait": 92, "spread": 34, "capacity": 0.84, "queue": 31},
    "urgent_care": {"wait": 26, "spread": 12, "capacity": 0.52, "queue": 14},
    "clinic": {"wait": 18, "spread": 9, "capacity": 0.4, "queue": 10},
    "pharmacy": {"wait": 7, "spread": 4, "capacity": 0.22, "queue": 5},
}

DAYPART_DEMAND_MULTIPLIERS = {
    "overnight": 0.76,
    "morning": 0.92,
    "midday": 1.0,
    "evening": 1.14,
}

WEEKDAY_DEMAND_MULTIPLIERS = {
    0: 1.04,
    1: 1.0,
    2: 1.02,
    3: 1.06,
    4: 1.1,
    5: 0.96,
    6: 0.9,
}

HIGH_PRESSURE_SPECIALTIES = {
    "trauma": 0.08,
    "cardiac": 0.06,
    "respiratory": 0.05,
    "pediatric": 0.05,
    "orthopedic": 0.04,
    "mental_health": 0.03,
}

SCENARIO_LIBRARY = {
    "hospital": [
        {"code": "immediate_emergency", "label": "Immediate emergency", "factor": 0.14, "spread": 6, "target": 10},
        {"code": "ambulance_offload", "label": "Ambulance offload", "factor": 0.52, "spread": 12, "target": 25},
        {"code": "standard_er", "label": "Standard ER", "factor": 1.0, "spread": 20, "target": 60},
        {"code": "low_acuity_non_urgent", "label": "Low-acuity / non-urgent", "factor": 1.34, "spread": 26, "target": 120},
    ],
    "er": [
        {"code": "immediate_emergency", "label": "Immediate emergency", "factor": 0.12, "spread": 6, "target": 10},
        {"code": "ambulance_offload", "label": "Ambulance offload", "factor": 0.48, "spread": 12, "target": 20},
        {"code": "standard_er", "label": "Standard ER", "factor": 1.0, "spread": 22, "target": 60},
        {"code": "low_acuity_non_urgent", "label": "Low-acuity / non-urgent", "factor": 1.42, "spread": 28, "target": 135},
    ],
    "urgent_care": [
        {"code": "urgent_walk_in", "label": "Urgent walk-in", "factor": 0.9, "spread": 10, "target": 30},
        {"code": "minor_injury", "label": "Minor injury / respiratory", "factor": 1.0, "spread": 10, "target": 40},
        {"code": "low_acuity_non_urgent", "label": "Low-acuity / non-urgent", "factor": 1.18, "spread": 12, "target": 55},
    ],
    "clinic": [
        {"code": "same_day_primary_care", "label": "Same-day primary care", "factor": 0.88, "spread": 8, "target": 30},
        {"code": "routine_non_urgent", "label": "Routine non-urgent", "factor": 1.14, "spread": 10, "target": 60},
        {"code": "follow_up_or_mental_health", "label": "Follow-up / mental health", "factor": 1.05, "spread": 10, "target": 50},
    ],
    "pharmacy": [
        {"code": "pharmacist_assessment", "label": "Pharmacist assessment", "factor": 0.75, "spread": 4, "target": 10},
        {"code": "minor_ailment_consult", "label": "Minor ailment consult", "factor": 0.9, "spread": 5, "target": 15},
        {"code": "prescription_fill", "label": "Prescription fill", "factor": 0.55, "spread": 4, "target": 8},
    ],
}

# ── Ontario Provincial Benchmark Data ────────────────────────────────────────
# Applied by ProvincialBenchmarkProvider as the fallback when no official
# hospital feed or public aggregator page provides a numeric wait time.

# Source: Health Quality Ontario. "Time spent in emergency departments."
# Reporting period 2022–23. All Ontario EDs, non-admitted patients.
# URL: https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
ONTARIO_MEDIAN_ED_PHYSICIAN_WAIT_MINUTES = 99   # 1.65 hours, median time from triage to physician
ONTARIO_90TH_PERCENTILE_ED_PHYSICIAN_WAIT_MINUTES = 279  # 4.65 hours, 90th percentile

# Size/type scaling factors.
# Derived from HQO volume-weighted reporting: major academic Level-1/2 trauma centres
# report higher median waits due to acuity mix vs. community EDs and lower-acuity settings.
# Source: HQO 2022-23 ED performance report, Table 1 (facility-type breakdown).
ONTARIO_BENCHMARK_SIZE_FACTORS: dict[str, float] = {
    "hospital":    1.15,  # Major academic / teaching hospital (Level 1/2 trauma)
    "er":          1.00,  # Community emergency department
    "urgent_care": 0.40,  # Urgent care centre — no trauma, lower acuity
    "clinic":      0.25,  # Walk-in clinic — GP-level, higher throughput
    "pharmacy":    0.07,  # Pharmacy minor ailment service — very short consult
}

# CTAS per-level physician wait targets and 90th-percentile thresholds.
# Source: Canadian Triage and Acuity Scale (CTAS) 2020 Implementation Guidelines.
# Authors: CAEP / NENA / AMUQ / NCA.
# URL: https://caep.ca/resources/ctas/
ONTARIO_CTAS_BENCHMARKS: dict[str, dict] = {
    "ctas_1": {
        "label": "CTAS 1 — Resuscitation",
        "physician_wait_target_minutes": 0,
        "physician_wait_90th_minutes": 1,
        "citation": (
            "CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. "
            "https://caep.ca/resources/ctas/"
        ),
    },
    "ctas_2": {
        "label": "CTAS 2 — Emergent",
        "physician_wait_target_minutes": 15,
        "physician_wait_90th_minutes": 30,
        "citation": (
            "CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. "
            "https://caep.ca/resources/ctas/"
        ),
    },
    "ctas_3": {
        "label": "CTAS 3 — Urgent",
        "physician_wait_target_minutes": 30,
        "physician_wait_90th_minutes": 60,
        "citation": (
            "CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. "
            "https://caep.ca/resources/ctas/"
        ),
    },
    "ctas_4": {
        "label": "CTAS 4 — Less Urgent",
        "physician_wait_target_minutes": 60,
        "physician_wait_90th_minutes": 120,
        "citation": (
            "CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. "
            "https://caep.ca/resources/ctas/"
        ),
    },
    "ctas_5": {
        "label": "CTAS 5 — Non-Urgent",
        "physician_wait_target_minutes": 120,
        "physician_wait_90th_minutes": 240,
        "citation": (
            "CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. "
            "https://caep.ca/resources/ctas/"
        ),
    },
}

ROUTING_SCENARIO_PREFERENCES = {
    "hospital": {
        "critical": ["immediate_emergency", "ambulance_offload", "standard_er"],
        "high": ["standard_er", "ambulance_offload", "immediate_emergency"],
        "moderate": ["standard_er", "low_acuity_non_urgent"],
        "low": ["low_acuity_non_urgent", "standard_er"],
    },
    "er": {
        "critical": ["immediate_emergency", "ambulance_offload", "standard_er"],
        "high": ["standard_er", "ambulance_offload", "immediate_emergency"],
        "moderate": ["standard_er", "low_acuity_non_urgent"],
        "low": ["low_acuity_non_urgent", "standard_er"],
    },
    "urgent_care": {
        "critical": ["urgent_walk_in"],
        "high": ["urgent_walk_in", "minor_injury"],
        "moderate": ["minor_injury", "urgent_walk_in"],
        "low": ["low_acuity_non_urgent", "minor_injury"],
    },
    "clinic": {
        "critical": ["same_day_primary_care"],
        "high": ["same_day_primary_care"],
        "moderate": ["same_day_primary_care", "routine_non_urgent"],
        "low": ["routine_non_urgent", "follow_up_or_mental_health"],
    },
    "pharmacy": {
        "critical": ["pharmacist_assessment"],
        "high": ["pharmacist_assessment", "minor_ailment_consult"],
        "moderate": ["minor_ailment_consult", "pharmacist_assessment"],
        "low": ["prescription_fill", "minor_ailment_consult"],
    },
}
