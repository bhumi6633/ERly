WAIT_TIME_STALE_AFTER_MINUTES = 10
WAIT_TIME_REFRESH_BUCKET_MINUTES = 15

SOURCE_BASE_CONFIDENCE = {
    "official_hospital_feed": 0.94,
    "public_aggregator": 0.84,
    "provider_api": 0.9,
    "ems_signal": 0.76,
    "estimation": 0.63,
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
