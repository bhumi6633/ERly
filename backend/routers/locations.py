from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
import math
import httpx
from database import get_db
from models import CareLocation, LiveStatus
from schemas import CareLocationOut, LiveStatusUpdate

router = APIRouter(prefix="/locations", tags=["locations"])

# ── Nearby discovery schema ───────────────────────────────────────────────────

class NearbyFacility(BaseModel):
    osm_id: int
    osm_type: str          # "node" or "way"
    name: str
    amenity_tag: str       # "hospital", "clinic", "doctors", "urgent_care", etc.
    latitude: float
    longitude: float
    distance_metres: float
    matched_location_id: int | None = None
    matched_location_name: str | None = None
    evidence_tier: str     # "has_live_data" | "db_location_no_wait" | "osm_only"


def _haversine_metres(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/", response_model=list[CareLocationOut])
def list_locations(
    type: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        query = db.query(CareLocation).options(
            joinedload(CareLocation.specialties),
            joinedload(CareLocation.live_status),
        )
        if type:
            query = query.filter(CareLocation.type == type)
        if city:
            query = query.filter(CareLocation.city.ilike(f"%{city}%"))

        locations = query.all()
        return [CareLocationOut.from_orm_with_specialties(loc) for loc in locations]
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(e)},
        )


@router.get("/{location_id}", response_model=CareLocationOut)
def get_location(location_id: int, db: Session = Depends(get_db)):
    location = (
        db.query(CareLocation)
        .options(
            joinedload(CareLocation.specialties),
            joinedload(CareLocation.live_status),
        )
        .filter(CareLocation.id == location_id)
        .first()
    )
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return CareLocationOut.from_orm_with_specialties(location)


@router.patch("/{location_id}/status", response_model=CareLocationOut)
def update_live_status(
    location_id: int,
    payload: LiveStatusUpdate,
    db: Session = Depends(get_db),
):
    location = db.query(CareLocation).filter(CareLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    status = db.query(LiveStatus).filter(LiveStatus.care_location_id == location_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Live status not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(status, field, value)

    db.commit()
    db.refresh(location)
    return CareLocationOut.from_orm_with_specialties(location)


@router.get("/nearby", response_model=list[NearbyFacility])
def discover_nearby_facilities(
    lat: float,
    lng: float,
    radius_metres: int = 5000,
    db: Session = Depends(get_db),
):
    """
    Discover healthcare facilities near the given coordinates using the
    OpenStreetMap Overpass API (no API key required).

    Returns a ranked list of nearby facilities. Each result indicates whether
    it is matched to a known DB location with live wait-time data.

    Query categories: hospital, clinic, doctors, urgent_care, pharmacy.
    Source: OpenStreetMap contributors, ODbL licence.
    """
    if radius_metres > 20_000:
        raise HTTPException(status_code=400, detail="radius_metres must be ≤ 20000")

    overpass_query = f"""
[out:json][timeout:30];
(
  node["amenity"~"^(hospital|clinic|doctors)$"](around:{radius_metres},{lat},{lng});
  way["amenity"~"^(hospital|clinic|doctors)$"](around:{radius_metres},{lat},{lng});
  node["healthcare"~"^(urgent_care|pharmacy)$"](around:{radius_metres},{lat},{lng});
  way["healthcare"~"^(urgent_care|pharmacy)$"](around:{radius_metres},{lat},{lng});
);
out center;
""".strip()

    try:
        with httpx.Client(timeout=35.0) as client:
            resp = client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query},
                headers={"User-Agent": "ERly/0.1 (hackcanada triage app)"},
            )
            resp.raise_for_status()
            osm_data = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Overpass API error: {exc}")

    # Load all DB locations for proximity matching
    db_locations = db.query(CareLocation).options(joinedload(CareLocation.wait_time_snapshots)).all()

    # For fast matching, build a list of (id, name, lat, lon, has_active_snapshot)
    from wait_times.models import WaitTimeSnapshot
    active_location_ids: set[int] = {
        row.care_location_id
        for row in db.query(WaitTimeSnapshot.care_location_id)
        .filter(WaitTimeSnapshot.is_active.is_(True))
        .all()
    }

    facilities: list[NearbyFacility] = []
    seen_osm_ids: set[int] = set()

    for element in osm_data.get("elements", []):
        osm_id = element.get("id")
        if osm_id in seen_osm_ids:
            continue
        seen_osm_ids.add(osm_id)

        tags = element.get("tags", {})
        name = tags.get("name") or tags.get("operator") or tags.get("brand") or ""
        if not name:
            continue

        osm_type = element.get("type", "node")
        if osm_type == "way":
            center = element.get("center", {})
            elem_lat = center.get("lat")
            elem_lon = center.get("lon")
        else:
            elem_lat = element.get("lat")
            elem_lon = element.get("lon")

        if elem_lat is None or elem_lon is None:
            continue

        amenity_tag = tags.get("amenity") or tags.get("healthcare") or "unknown"
        dist = _haversine_metres(lat, lng, elem_lat, elem_lon)

        # Match against DB locations: closest within 150 m wins
        matched_id: int | None = None
        matched_name: str | None = None
        best_dist = 150.0

        for db_loc in db_locations:
            d = _haversine_metres(elem_lat, elem_lon, db_loc.latitude, db_loc.longitude)
            if d < best_dist:
                best_dist = d
                matched_id = db_loc.id
                matched_name = db_loc.name

        if matched_id is not None and matched_id in active_location_ids:
            evidence_tier = "has_live_data"
        elif matched_id is not None:
            evidence_tier = "db_location_no_wait"
        else:
            evidence_tier = "osm_only"

        facilities.append(
            NearbyFacility(
                osm_id=osm_id,
                osm_type=osm_type,
                name=name,
                amenity_tag=amenity_tag,
                latitude=elem_lat,
                longitude=elem_lon,
                distance_metres=round(dist, 1),
                matched_location_id=matched_id,
                matched_location_name=matched_name,
                evidence_tier=evidence_tier,
            )
        )

    facilities.sort(key=lambda f: f.distance_metres)
    return facilities
