from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from wait_times.repository import list_care_locations
from wait_times.service import refresh_wait_time_for_location
from wait_times.schemas import WaitTimeSnapshotOut

router = APIRouter(prefix="/care-options", tags=["care-options"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class CareOptionOut(BaseModel):
    facility_id: int
    name: str
    type: str
    address: str
    phone: Optional[str]
    latitude: float
    longitude: float
    distance_km: float
    travel_time_minutes: float
    wait_time_minutes: Optional[int]
    wait_time_range: list[Optional[int]]
    total_time_minutes: Optional[float]
    recommendation_score: float
    confidence_score: float
    confidence_label: str
    source_kind: str
    status: str
    snapshot: Optional[WaitTimeSnapshotOut]


class CareOptionsResponse(BaseModel):
    generated_at: str
    user_location: dict
    count: int
    facilities: list[CareOptionOut]


@router.get("/", response_model=CareOptionsResponse)
def get_care_options(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    radius_km: float = Query(default=50.0, description="Search radius in km"),
    limit: int = Query(default=20, ge=1, le=100),
    types: Optional[str] = Query(default=None, description="Comma-separated facility types: hospital,er,urgent_care,clinic,pharmacy"),
    db: Session = Depends(get_db),
):
    """
    Return nearby care facilities ranked by total time to care (travel + estimated wait).

    Uses the ERly 4-tier confidence cascade:
      Tier 1  official hospital feed          confidence 0.88–0.94
      Tier 2  public aggregator page          confidence 0.54–0.84
      Tier 3  Ontario Health provincial bench confidence 0.48
      Tier 4  CIHI-calibrated proxy floor     confidence 0.32  (always fires)

    Guarantee: every open facility returns a numeric wait estimate.
    Travel time is estimated as distance_km × 1.7 min/km (~35 km/h city average).
    """
    all_locations = list_care_locations(db)

    type_filter = set(t.strip() for t in types.split(",")) if types else None

    results: list[CareOptionOut] = []

    for location in all_locations:
        if location.latitude is None or location.longitude is None:
            continue
        if type_filter and location.type not in type_filter:
            continue

        loc_lat = float(location.latitude)
        loc_lng = float(location.longitude)

        dist_km = _haversine_km(lat, lng, loc_lat, loc_lng)
        if dist_km > radius_km:
            continue

        # Get/refresh snapshot — uses cached snapshot if < WAIT_TIME_STALE_AFTER_MINUTES old
        snapshot = refresh_wait_time_for_location(db, location)
        db.commit()

        # Travel time: distance × 1.7 min/km  ≈  35 km/h city average
        travel_time = round(dist_km * 1.7, 1)

        wait = snapshot.overall_wait_minutes if snapshot.status not in ("closed", "insufficient_evidence") else None
        total = round(travel_time + wait, 1) if wait is not None else None

        # Higher score = better option; closed/no-wait facilities go to end
        if total is not None and total > 0:
            rec_score = round(1.0 / (1.0 + total), 6)
        else:
            rec_score = 0.0

        results.append(
            CareOptionOut(
                facility_id=location.id,
                name=location.name,
                type=location.type,
                address=location.address or "",
                phone=location.phone,
                latitude=loc_lat,
                longitude=loc_lng,
                distance_km=round(dist_km, 2),
                travel_time_minutes=travel_time,
                wait_time_minutes=snapshot.overall_wait_minutes,
                wait_time_range=[snapshot.overall_wait_min_minutes, snapshot.overall_wait_max_minutes],
                total_time_minutes=total,
                recommendation_score=rec_score,
                confidence_score=float(snapshot.confidence_score),
                confidence_label=snapshot.confidence_label,
                source_kind=snapshot.source_kind,
                status=snapshot.status,
                snapshot=WaitTimeSnapshotOut.model_validate(snapshot),
            )
        )

    # Open facilities first, sorted by recommendation_score desc; closed at end
    results.sort(key=lambda r: (r.status == "closed", -r.recommendation_score))
    results = results[:limit]

    return CareOptionsResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        user_location={"lat": lat, "lng": lng},
        count=len(results),
        facilities=results,
    )
