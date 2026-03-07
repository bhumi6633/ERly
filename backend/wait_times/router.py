from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from wait_times.repository import list_care_locations
from wait_times.schemas import WaitTimeSnapshotOut
from wait_times.service import (
    ensure_latest_snapshots,
    get_latest_snapshot_for_location,
    refresh_wait_time_for_location,
    refresh_wait_times_for_locations,
)

router = APIRouter(prefix="/wait-times", tags=["wait-times"])


@router.get("/", response_model=list[WaitTimeSnapshotOut])
def list_wait_times(
    care_type: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
):
    locations = list_care_locations(db, care_type=care_type, city=city)
    snapshots = ensure_latest_snapshots(db, locations)
    db.commit()
    return [snapshots[location.id] for location in locations if location.id in snapshots]


@router.get("/{location_id}", response_model=WaitTimeSnapshotOut)
def get_wait_time(location_id: int, force_refresh: bool = False, db: Session = Depends(get_db)):
    snapshot = get_latest_snapshot_for_location(db, location_id, force_refresh=force_refresh)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Location not found")
    db.commit()
    return snapshot


@router.post("/refresh", response_model=list[WaitTimeSnapshotOut])
def refresh_all_wait_times(
    care_type: str | None = None,
    city: str | None = None,
    force: bool = True,
    db: Session = Depends(get_db),
):
    locations = list_care_locations(db, care_type=care_type, city=city)
    if not locations:
        return []
    snapshots = refresh_wait_times_for_locations(db, locations, force=force)
    db.commit()
    return [snapshots[location.id] for location in locations if location.id in snapshots]


@router.post("/{location_id}/refresh", response_model=WaitTimeSnapshotOut)
def refresh_one_wait_time(location_id: int, force: bool = True, db: Session = Depends(get_db)):
    locations = list_care_locations(db, location_id=location_id)
    if not locations:
        raise HTTPException(status_code=404, detail="Location not found")
    snapshot = refresh_wait_time_for_location(db, locations[0], force=force)
    db.commit()
    return snapshot
