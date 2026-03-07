"""
BACKBOARD routing engine.

Scores nearby care locations using a weighted formula:
    final_score = (
        severity_fit    * 0.35
        + specialty_match * 0.25
        + wait_score      * 0.25
        + distance_score  * 0.15
    )

Higher score = better match.
"""
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import CareLocation, TriageSession, RoutingRecommendation
from schemas import RoutingRequest, RoutingRecommendationOut, CareLocationOut
from wait_times.service import ensure_latest_snapshots, get_routing_wait_context

router = APIRouter(prefix="/routing", tags=["routing"])

# Max search radius in km
MAX_RADIUS_KM = 25

# Severity → appropriate care types (ordered preference)
SEVERITY_CARE_MAP = {
    range(1, 4):  ["pharmacy", "clinic"],
    range(4, 7):  ["clinic", "urgent_care"],
    range(7, 9):  ["urgent_care", "er", "hospital"],
    range(9, 11): ["er", "hospital"],
}

# Specialty keywords extracted from symptom flags
SYMPTOM_SPECIALTY_MAP = {
    "chest_pain": "cardiac",
    "shortness_of_breath": "respiratory",
    "fever": "general",
    "trauma": "trauma",
    "child": "pediatric",
    "pediatric": "pediatric",
    "broken": "orthopedic",
    "fracture": "orthopedic",
    "anxiety": "mental_health",
    "mental": "mental_health",
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_preferred_care_types(severity: int) -> list[str]:
    for rng, types in SEVERITY_CARE_MAP.items():
        if severity in rng:
            return types
    return ["urgent_care", "er"]


def infer_needed_specialties(flags: list[dict]) -> list[str]:
    specialties = []
    for flag in flags:
        name = flag.get("flag_name", "").lower()
        value = flag.get("flag_value", "").lower()
        if value in ("true", "yes", "1"):
            for keyword, specialty in SYMPTOM_SPECIALTY_MAP.items():
                if keyword in name and specialty not in specialties:
                    specialties.append(specialty)
    return specialties or ["general"]


def score_location(
    location: CareLocation,
    wait_snapshot,
    distance_km: float,
    preferred_care_types: list[str],
    needed_specialties: list[str],
    severity: int,
) -> dict:
    weights = {
        "severity_fit": 0.35,
        "specialty_match": 0.25,
        "wait_score": 0.25,
        "distance_score": 0.15,
    }

    # 1. Severity fit — does this location type match the severity?
    loc_specialties = [s.specialty_name for s in location.specialties]
    care_types = preferred_care_types
    if location.type in care_types:
        pos = care_types.index(location.type)
        severity_fit = 1.0 - (pos * 0.15)
    else:
        severity_fit = 0.2

    # ERs are only a fit for high severity; penalise over-triaging to ER for mild cases
    if location.type in ("er", "hospital") and severity < 7:
        severity_fit *= 0.4

    # 2. Specialty match
    matched = len(set(needed_specialties) & set(loc_specialties))
    specialty_match = min(1.0, matched / max(1, len(needed_specialties)))

    # 3. Wait time score (lower wait = higher score)
    status = location.live_status
    routing_wait = get_routing_wait_context(wait_snapshot, location.type, severity)
    wait_evidence_available = False
    if routing_wait:
        wait = routing_wait["wait_minutes"]
        if wait is None and routing_wait["status"] != "closed":
            wait_score = None
        else:
            wait_evidence_available = True
            max_acceptable_wait = 150
            wait_score = max(0.0, 1.0 - (wait or 0) / max_acceptable_wait)
        if routing_wait["status"] == "closed":
            wait_evidence_available = True
            wait_score *= 0.1
        elif routing_wait["status"] == "diverting":
            wait_score *= 0.45
        if routing_wait["diversion_probability"] >= 0.65 and location.accepts_ambulance:
            wait_score *= 0.6
    elif status:
        max_acceptable_wait = 120
        wait = status.predicted_wait_on_arrival_mins or status.current_wait_mins or 0
        wait_score = max(0.0, 1.0 - wait / max_acceptable_wait)
        # Heavily penalise locations that are at capacity
        if status.capacity_score >= 0.95:
            wait_score *= 0.3
        wait_evidence_available = True
    else:
        wait_score = None

    # 4. Distance score (closer = higher score, max radius 25 km)
    distance_score = max(0.0, 1.0 - distance_km / MAX_RADIUS_KM)

    score_components = {
        "severity_fit": severity_fit,
        "specialty_match": specialty_match,
        "wait_score": wait_score,
        "distance_score": distance_score,
    }
    active_weights = {
        name: weights[name]
        for name, value in score_components.items()
        if value is not None
    }
    weight_total = sum(active_weights.values()) or 1.0
    final = sum(
        score_components[name] * (active_weights[name] / weight_total)
        for name in active_weights
    )

    travel_time = round(distance_km / 0.5)  # rough: 30 km/h urban avg

    return {
        "distance_km": round(distance_km, 2),
        "travel_time_mins": travel_time,
        "predicted_wait_mins": (
            routing_wait["wait_minutes"]
            if routing_wait
            else (status.predicted_wait_on_arrival_mins if status else None)
        ),
        "specialty_match_score": round(specialty_match, 3),
        "severity_fit_score": round(severity_fit, 3),
        "final_score": round(final, 4),
        "wait_time_confidence_score": (
            round(routing_wait["confidence_score"], 3) if routing_wait else None
        ),
        "wait_time_confidence_label": (
            routing_wait["confidence_label"] if routing_wait else None
        ),
        "wait_time_source": routing_wait["source_kind"] if routing_wait else None,
        "wait_time_status": routing_wait["status"] if routing_wait else None,
        "wait_time_evidence_available": wait_evidence_available,
    }


@router.post("/recommend", response_model=list[RoutingRecommendationOut])
def recommend(payload: RoutingRequest, db: Session = Depends(get_db)):
    session = db.query(TriageSession).filter(TriageSession.id == payload.triage_session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Triage session not found")

    locations = db.query(CareLocation).options(
        joinedload(CareLocation.specialties),
        joinedload(CareLocation.live_status),
    ).all()
    latest_snapshots = ensure_latest_snapshots(db, locations)

    preferred_care_types = get_preferred_care_types(payload.severity_score)
    needed_specialties = infer_needed_specialties(
        [f.model_dump() for f in payload.symptom_flags]
    )

    # Filter to locations within radius and score each one
    scored = []
    for loc in locations:
        dist = haversine_km(
            payload.patient_latitude, payload.patient_longitude,
            loc.latitude, loc.longitude,
        )
        if dist > MAX_RADIUS_KM:
            continue

        scores = score_location(
            loc,
            latest_snapshots.get(loc.id),
            dist,
            preferred_care_types,
            needed_specialties,
            payload.severity_score,
        )
        scored.append((loc, scores))

    # Sort by final_score descending
    scored.sort(key=lambda x: x[1]["final_score"], reverse=True)
    top = scored[:5]

    # Delete stale recommendations for this session
    db.query(RoutingRecommendation).filter(
        RoutingRecommendation.triage_session_id == payload.triage_session_id
    ).delete()

    results = []
    for rank, (loc, scores) in enumerate(top, start=1):
        wait_metadata = {
            "wait_time_confidence_score": scores.get("wait_time_confidence_score"),
            "wait_time_confidence_label": scores.get("wait_time_confidence_label"),
            "wait_time_source": scores.get("wait_time_source"),
            "wait_time_status": scores.get("wait_time_status"),
            "wait_time_evidence_available": scores.get("wait_time_evidence_available"),
        }
        persistence_scores = {
            key: value
            for key, value in scores.items()
            if key not in wait_metadata
        }
        rec = RoutingRecommendation(
            triage_session_id=payload.triage_session_id,
            care_location_id=loc.id,
            rank_position=rank,
            recommended=(rank == 1),
            **persistence_scores,
        )
        db.add(rec)
        db.flush()

        rec_out = RoutingRecommendationOut.model_validate(rec)
        rec_out.care_location = CareLocationOut.from_orm_with_specialties(loc)
        rec_out.wait_time_confidence_score = wait_metadata["wait_time_confidence_score"]
        rec_out.wait_time_confidence_label = wait_metadata["wait_time_confidence_label"]
        rec_out.wait_time_source = wait_metadata["wait_time_source"]
        rec_out.wait_time_status = wait_metadata["wait_time_status"]
        rec_out.wait_time_evidence_available = wait_metadata["wait_time_evidence_available"]
        results.append(rec_out)

    db.commit()
    return results
