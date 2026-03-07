from __future__ import annotations

from sqlalchemy.orm import Session, joinedload, selectinload

from models import CareLocation
from wait_times.models import WaitTimeSnapshot


def list_care_locations(
    db: Session,
    *,
    care_type: str | None = None,
    city: str | None = None,
    location_id: int | None = None,
) -> list[CareLocation]:
    query = db.query(CareLocation).options(
        joinedload(CareLocation.specialties),
        joinedload(CareLocation.live_status),
    )
    if location_id is not None:
        query = query.filter(CareLocation.id == location_id)
    if care_type:
        query = query.filter(CareLocation.type == care_type)
    if city:
        query = query.filter(CareLocation.city.ilike(f"%{city}%"))
    return query.order_by(CareLocation.name.asc()).all()


def get_latest_snapshot(db: Session, location_id: int) -> WaitTimeSnapshot | None:
    snapshots = get_latest_snapshots(db, [location_id])
    return snapshots.get(location_id)


def get_latest_snapshots(
    db: Session,
    location_ids: list[int],
) -> dict[int, WaitTimeSnapshot]:
    if not location_ids:
        return {}

    rows = (
        db.query(WaitTimeSnapshot)
        .options(
            joinedload(WaitTimeSnapshot.care_location),
            selectinload(WaitTimeSnapshot.scenarios),
            selectinload(WaitTimeSnapshot.source_records),
        )
        .filter(
            WaitTimeSnapshot.care_location_id.in_(location_ids),
            WaitTimeSnapshot.is_active.is_(True),
        )
        .order_by(
            WaitTimeSnapshot.care_location_id.asc(),
            WaitTimeSnapshot.last_reported_at.desc(),
            WaitTimeSnapshot.id.desc(),
        )
        .all()
    )

    latest: dict[int, WaitTimeSnapshot] = {}
    for row in rows:
        latest.setdefault(row.care_location_id, row)
    return latest
