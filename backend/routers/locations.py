from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import CareLocation, LiveStatus
from schemas import CareLocationOut, LiveStatusUpdate

router = APIRouter(prefix="/locations", tags=["locations"])


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
