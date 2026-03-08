"""
Pre-arrival patient notification endpoint.

When the user presses GO, the frontend POSTs here so the destination
facility can prepare for their arrival.

In production this would push a live notification to a facility dashboard
and persist the record.  For the hackathon demo we return a mock success.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import uuid

router = APIRouter(prefix="/incoming-patient", tags=["incoming-patient"])


class IncomingPatientPayload(BaseModel):
    facility_id: int
    eta_minutes: int
    symptoms: List[str]
    severity: str
    user_id: Optional[str] = "demo_user"


class IncomingPatientResponse(BaseModel):
    success: bool
    patient_id: str
    message: str
    notification_sent: bool


@router.post("/", response_model=IncomingPatientResponse)
def register_incoming_patient(payload: IncomingPatientPayload):
    """
    Register a pre-arrival patient intent and notify the facility.
    """
    patient_id = f"PT-{uuid.uuid4().hex[:6].upper()}"
    return IncomingPatientResponse(
        success=True,
        patient_id=patient_id,
        message=(
            f"Facility #{payload.facility_id} alerted. "
            f"{patient_id} expected in ~{payload.eta_minutes} min."
        ),
        notification_sent=True,
    )
