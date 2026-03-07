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
    distance_km: float,
    preferred_care_types: list[str],
    needed_specialties: list[str],
    severity: int,
) -> dict:
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
    if status:
        max_acceptable_wait = 120
        wait = status.predicted_wait_on_arrival_mins or status.current_wait_mins or 0
        wait_score = max(0.0, 1.0 - wait / max_acceptable_wait)
        # Heavily penalise locations that are at capacity
        if status.capacity_score >= 0.95:
            wait_score *= 0.3
    else:
        wait_score = 0.5

    # 4. Distance score (closer = higher score, max radius 25 km)
    distance_score = max(0.0, 1.0 - distance_km / MAX_RADIUS_KM)

    # Composite
    final = (
        severity_fit * 0.35
        + specialty_match * 0.25
        + wait_score * 0.25
        + distance_score * 0.15
    )

    travel_time = round(distance_km / 0.5)  # rough: 30 km/h urban avg

    return {
        "distance_km": round(distance_km, 2),
        "travel_time_mins": travel_time,
        "predicted_wait_mins": (status.predicted_wait_on_arrival_mins if status else None),
        "specialty_match_score": round(specialty_match, 3),
        "severity_fit_score": round(severity_fit, 3),
        "final_score": round(final, 4),
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

        scores = score_location(loc, dist, preferred_care_types, needed_specialties, payload.severity_score)
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
        rec = RoutingRecommendation(
            triage_session_id=payload.triage_session_id,
            care_location_id=loc.id,
            rank_position=rank,
            recommended=(rank == 1),
            **scores,
        )
        db.add(rec)
        db.flush()

        rec_out = RoutingRecommendationOut.model_validate(rec)
        rec_out.care_location = CareLocationOut.from_orm_with_specialties(loc)
        results.append(rec_out)

    db.commit()
    return results
