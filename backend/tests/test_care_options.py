"""
Tests for the /care-options/ endpoint.
Uses an in-memory SQLite database seeded with two hospitals so no external
network calls are needed.
"""
import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from database import Base, get_db
from main import app
import models  # noqa: F401 — register all ORM classes with Base
import wait_times.models  # noqa: F401
from models import CareLocation
from routers.care_options import _haversine_km


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_test_db():
    # StaticPool keeps a single connection so the in-memory DB isn't re-created
    # each time a new Session is opened (which would wipe data in :memory: DBs).
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Two hospitals near Waterloo, ON — within 50 km of [43.490, -80.536]
    session.add_all([
        CareLocation(
            id=1,
            name="Grand River Hospital",
            type="hospital",
            address="835 King St W, Kitchener, ON",
            city="Kitchener",
            latitude=43.4513,
            longitude=-80.4938,
            is_open_24_7=True,
            has_emergency_department=True,
        ),
        CareLocation(
            id=2,
            name="St. Mary's General Hospital",
            type="hospital",
            address="911 Queen's Blvd, Kitchener, ON",
            city="Kitchener",
            latitude=43.4474,
            longitude=-80.5320,
            is_open_24_7=True,
            has_emergency_department=True,
        ),
    ])
    session.commit()
    return engine, session


class HaversineTests(unittest.TestCase):
    def test_same_point_is_zero(self):
        self.assertAlmostEqual(_haversine_km(43.49, -80.536, 43.49, -80.536), 0.0, places=3)

    def test_known_distance(self):
        # Grand River Hospital → St. Mary's ~3 km
        d = _haversine_km(43.4513, -80.4938, 43.4474, -80.532)
        self.assertGreater(d, 2.0)
        self.assertLess(d, 5.0)

    def test_far_point_exceeds_radius(self):
        # Toronto (43.70, -79.42) to Waterloo centre (~80 km)
        d = _haversine_km(43.70, -79.42, 43.49, -80.536)
        self.assertGreater(d, 50.0)


class CareOptionsEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.session = _make_test_db()
        TestSession = sessionmaker(bind=self.engine)

        def override_get_db():
            db = TestSession()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.session.close()
        self.engine.dispose()

    def test_returns_facilities_within_radius(self):
        # Waterloo centre — both test hospitals are within 50 km
        resp = self.client.get("/care-options/?lat=43.490&lng=-80.536&radius_km=50")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["count"], 2)
        self.assertEqual(len(data["facilities"]), data["count"])

    def test_excludes_facilities_outside_radius(self):
        # Very tight radius — no facilities within 1 km of map centre
        resp = self.client.get("/care-options/?lat=43.490&lng=-80.536&radius_km=1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["count"], 0)

    def test_total_time_equals_travel_plus_wait(self):
        resp = self.client.get("/care-options/?lat=43.490&lng=-80.536&radius_km=50")
        self.assertEqual(resp.status_code, 200)
        for f in resp.json()["facilities"]:
            if f["total_time_minutes"] is not None and f["wait_time_minutes"] is not None:
                expected = round(f["travel_time_minutes"] + f["wait_time_minutes"], 1)
                self.assertAlmostEqual(f["total_time_minutes"], expected, places=1)

    def test_travel_time_matches_distance_model(self):
        resp = self.client.get("/care-options/?lat=43.490&lng=-80.536&radius_km=50")
        self.assertEqual(resp.status_code, 200)
        for f in resp.json()["facilities"]:
            expected_travel = round(f["distance_km"] * 1.7, 1)
            self.assertAlmostEqual(f["travel_time_minutes"], expected_travel, places=1)

    def test_type_filter_excludes_non_matching(self):
        resp = self.client.get("/care-options/?lat=43.490&lng=-80.536&radius_km=50&types=pharmacy")
        self.assertEqual(resp.status_code, 200)
        # Our test hospitals are type "hospital", not "pharmacy"
        self.assertEqual(resp.json()["count"], 0)

    def test_sorted_by_recommendation_score_desc(self):
        resp = self.client.get("/care-options/?lat=43.490&lng=-80.536&radius_km=50")
        self.assertEqual(resp.status_code, 200)
        facilities = resp.json()["facilities"]
        # Open facilities must appear before closed ones; within open, score must be non-increasing
        open_scores = [f["recommendation_score"] for f in facilities if f["status"] != "closed"]
        self.assertEqual(open_scores, sorted(open_scores, reverse=True))

    def test_response_schema_fields_present(self):
        resp = self.client.get("/care-options/?lat=43.490&lng=-80.536&radius_km=50")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("generated_at", data)
        self.assertIn("user_location", data)
        self.assertEqual(data["user_location"]["lat"], 43.49)
        self.assertEqual(data["user_location"]["lng"], -80.536)
        if data["count"] > 0:
            f = data["facilities"][0]
            for field in ("facility_id", "name", "type", "address", "latitude", "longitude",
                          "distance_km", "travel_time_minutes", "recommendation_score",
                          "confidence_score", "confidence_label", "source_kind", "status"):
                self.assertIn(field, f, f"Missing field: {field}")


if __name__ == "__main__":
    unittest.main()
