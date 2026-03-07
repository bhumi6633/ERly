"""
Seed script — run once to populate the database with Toronto-area care locations
and simulated live status data.

Usage:
    python seed.py
"""
import random
from datetime import datetime, timezone
from database import engine, SessionLocal, Base
import models  # noqa: F401 — registers all models with Base

Base.metadata.create_all(bind=engine)

CARE_LOCATIONS = [
    # ── Hospitals / ERs ──────────────────────────────────────────────────────
    {
        "name": "Toronto General Hospital",
        "type": "hospital",
        "address": "200 Elizabeth St",
        "city": "Toronto",
        "latitude": 43.6594,
        "longitude": -79.3883,
        "phone": "416-340-4800",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["cardiac", "trauma", "general", "respiratory"],
    },
    {
        "name": "St. Michael's Hospital ER",
        "type": "er",
        "address": "36 Queen St E",
        "city": "Toronto",
        "latitude": 43.6534,
        "longitude": -79.3762,
        "phone": "416-360-4000",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["trauma", "general", "cardiac"],
    },
    {
        "name": "Sunnybrook Health Sciences Centre",
        "type": "hospital",
        "address": "2075 Bayview Ave",
        "city": "Toronto",
        "latitude": 43.7232,
        "longitude": -79.3765,
        "phone": "416-480-6100",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["trauma", "cardiac", "orthopedic", "general"],
    },
    {
        "name": "SickKids Hospital",
        "type": "hospital",
        "address": "555 University Ave",
        "city": "Toronto",
        "latitude": 43.6574,
        "longitude": -79.3902,
        "phone": "416-813-1500",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["pediatric", "general"],
    },
    {
        "name": "Mount Sinai Hospital",
        "type": "hospital",
        "address": "600 University Ave",
        "city": "Toronto",
        "latitude": 43.6573,
        "longitude": -79.3906,
        "phone": "416-596-4200",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["general", "respiratory", "cardiac"],
    },
    {
        "name": "North York General Hospital",
        "type": "hospital",
        "address": "4001 Leslie St",
        "city": "North York",
        "latitude": 43.7614,
        "longitude": -79.3437,
        "phone": "416-756-6000",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["general", "trauma", "orthopedic"],
    },
    {
        "name": "Humber River Hospital",
        "type": "hospital",
        "address": "1235 Wilson Ave",
        "city": "North York",
        "latitude": 43.7433,
        "longitude": -79.5021,
        "phone": "416-242-1000",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["general", "cardiac"],
    },
    {
        "name": "Scarborough Health Network — General",
        "type": "hospital",
        "address": "3050 Lawrence Ave E",
        "city": "Scarborough",
        "latitude": 43.7552,
        "longitude": -79.2411,
        "phone": "416-431-8200",
        "is_open_24_7": True,
        "accepts_ambulance": True,
        "has_emergency_department": True,
        "specialties": ["general", "trauma", "respiratory"],
    },
    # ── Urgent Care ───────────────────────────────────────────────────────────
    {
        "name": "Appletree Medical Group — King West",
        "type": "urgent_care",
        "address": "680 King St W",
        "city": "Toronto",
        "latitude": 43.6446,
        "longitude": -79.4023,
        "phone": "416-593-2273",
        "is_open_24_7": False,
        "opening_time": "08:00",
        "closing_time": "20:00",
        "accepts_ambulance": False,
        "has_emergency_department": False,
        "specialties": ["general"],
    },
    {
        "name": "Medpoint Health Centres — Yonge & Eg",
        "type": "urgent_care",
        "address": "2300 Yonge St",
        "city": "Toronto",
        "latitude": 43.7053,
        "longitude": -79.3979,
        "phone": "416-932-9000",
        "is_open_24_7": False,
        "opening_time": "08:00",
        "closing_time": "22:00",
        "accepts_ambulance": False,
        "has_emergency_department": False,
        "specialties": ["general", "respiratory"],
    },
    {
        "name": "Bay-College Medical Centre",
        "type": "urgent_care",
        "address": "777 Bay St",
        "city": "Toronto",
        "latitude": 43.6591,
        "longitude": -79.3842,
        "phone": "416-977-7653",
        "is_open_24_7": False,
        "opening_time": "09:00",
        "closing_time": "21:00",
        "accepts_ambulance": False,
        "has_emergency_department": False,
        "specialties": ["general", "mental_health"],
    },
    # ── Walk-in Clinics ───────────────────────────────────────────────────────
    {
        "name": "Women's College Hospital Walk-in",
        "type": "clinic",
        "address": "76 Grenville St",
        "city": "Toronto",
        "latitude": 43.6640,
        "longitude": -79.3880,
        "phone": "416-323-6400",
        "is_open_24_7": False,
        "opening_time": "08:30",
        "closing_time": "17:00",
        "accepts_ambulance": False,
        "has_emergency_department": False,
        "specialties": ["general"],
    },
    {
        "name": "Rexdale Community Health Centre",
        "type": "clinic",
        "address": "8 Taber Rd",
        "city": "Etobicoke",
        "latitude": 43.7306,
        "longitude": -79.5744,
        "phone": "416-744-0066",
        "is_open_24_7": False,
        "opening_time": "09:00",
        "closing_time": "17:00",
        "accepts_ambulance": False,
        "has_emergency_department": False,
        "specialties": ["general", "mental_health"],
    },
    # ── Pharmacies ────────────────────────────────────────────────────────────
    {
        "name": "Shoppers Drug Mart — Yonge & Dundas",
        "type": "pharmacy",
        "address": "700 Yonge St",
        "city": "Toronto",
        "latitude": 43.6672,
        "longitude": -79.3860,
        "phone": "416-961-0707",
        "is_open_24_7": True,
        "accepts_ambulance": False,
        "has_emergency_department": False,
        "specialties": ["general"],
    },
    {
        "name": "Rexall Pharmacy — Bay St",
        "type": "pharmacy",
        "address": "100 Bay St",
        "city": "Toronto",
        "latitude": 43.6489,
        "longitude": -79.3800,
        "phone": "416-368-4400",
        "is_open_24_7": False,
        "opening_time": "07:00",
        "closing_time": "23:00",
        "accepts_ambulance": False,
        "has_emergency_department": False,
        "specialties": ["general"],
    },
]

LIVE_STATUS_PRESETS = {
    "hospital": {"wait_range": (30, 180), "capacity_range": (0.5, 0.95)},
    "er":       {"wait_range": (45, 240), "capacity_range": (0.6, 1.0)},
    "urgent_care": {"wait_range": (10, 60),  "capacity_range": (0.2, 0.75)},
    "clinic":   {"wait_range": (5, 40),   "capacity_range": (0.1, 0.6)},
    "pharmacy": {"wait_range": (0, 10),   "capacity_range": (0.0, 0.3)},
}


def seed():
    db = SessionLocal()
    try:
        if db.query(models.CareLocation).count() > 0:
            print("Database already seeded — skipping.")
            return

        for loc_data in CARE_LOCATIONS:
            specialties = loc_data.pop("specialties", [])

            location = models.CareLocation(**loc_data)
            db.add(location)
            db.flush()  # get the auto-generated id

            for specialty in specialties:
                db.add(models.LocationSpecialty(
                    care_location_id=location.id,
                    specialty_name=specialty,
                ))

            preset = LIVE_STATUS_PRESETS.get(location.type, LIVE_STATUS_PRESETS["clinic"])
            current_wait = random.randint(*preset["wait_range"])
            capacity = round(random.uniform(*preset["capacity_range"]), 2)

            db.add(models.LiveStatus(
                care_location_id=location.id,
                current_wait_mins=current_wait,
                predicted_wait_on_arrival_mins=max(0, current_wait + random.randint(-10, 20)),
                capacity_score=capacity,
                queue_length=int(capacity * random.randint(5, 30)),
                staffing_level=random.choice(["low", "normal", "normal", "high"]),
                ambulance_load=random.randint(0, 3) if location.accepts_ambulance else 0,
                last_updated_at=datetime.now(timezone.utc),
            ))

        db.commit()
        print(f"Seeded {len(CARE_LOCATIONS)} care locations with live status.")
    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    seed()
