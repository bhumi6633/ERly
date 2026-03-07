import unittest
from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from wait_times.live_sources import (
    parse_medimap_status,
    parse_thp_methodology,
    parse_thp_stats,
    parse_uhn_dashboard_text,
    parse_uhn_methodology,
)
from wait_times.service import fuse_signals
from wait_times.types import SourceSignal


THP_PAYLOAD = {
    "averageTimeToSeeDoctor": 1.3,
    "averageTimeToSeeDoctor80th": 1.7,
    "patientsWaitingToSeeDoctor": 17,
    "activePatients": 89,
    "activeNoBedAdmits": 15,
    "lastUpdated": "2026-03-07T15:39:07.9917546-05:00",
    "dataSets": [
        {"name": "LOS", "labels": [], "data": []},
        {
            "name": "PIA_GEN",
            "labels": ["00", "01", "02", "03"],
            "data": [1.4, 1.1, 1.2, 1.4],
        },
    ],
}

THP_PAGE = """
<script>
const apiUrl = 'https://edwt-prd.thp.ca/';
</script>
<p><span class="font-weight-bold">Definition: </span>80% of patients will be seen by a doctor within this time period.</p>
<p>The Wait Time Dashboard provides real-time and predicted data (based on last 30 days of data) that will help patients have a better understanding of the wait time to see a doctor after being triaged (initial assessment with a nurse). Wait times are shown for both the Credit Valley Hospital and Mississauga Hospital EDs.</p>
<p><strong style="color:#000;">Patients are seen based on their medical condition and the urgency of their situation (e.g., chest pain is prioritized over a minor cut). Posted wait times are estimates and may change.</strong></p>
"""

MEDIMAP_PAGE = """
<h1 class="text-base font-semibold text-foreground line-clamp-2 leading-tight">Bay College Medical &amp; Lockwood Diagnostic</h1>
<span class="text-sm text-gray-700 truncate">790 Bay St, Toronto, ON</span>
<button data-slot="popover-trigger">
  <span class="text-xs font-medium text-blue-600">Opens 8am Mon</span>
</button>
<div class="text-xs text-gray-500 mb-1 font-medium">Wait Time</div>
<div class="text-xs font-semibold text-blue-600 mb-1 leading-tight"><span class="font-medium">Opens</span> <span class="font-bold">8am</span> <span class="font-medium">Mon</span></div>
"""

UHN_PAGE = """
<meta name="description" content="Learn about the wait time in UHN's Emergency Departments. Find real-time emergency wait times at Toronto General and Toronto Western. Navigate your visit." />
<div>The wait time information presented on this webpage is updated every 1 hour and may vary from the real-time information displayed at the Emergency Department.</div>
<iframe src="https://app.powerbi.com/view?r=test"></iframe>
"""

UHN_DASHBOARD_TEXT = """
Toronto General Hospital

Number of Patients

02:45
hours

The majority of patients will be seen within:

22
Waiting
35
Being Treated

Average Wait Time to See a Provider

Last updated at:

3:37
hours
3/07/26 3:44 PM

Toronto Western Hospital

Number of Patients

02:45
hours

The majority of patients will be seen within:

48
Waiting
30
Being Treated

Average Wait Time to See a Provider

Last updated at:

3:23
hours
3/07/26 3:44 PM
"""


class WaitTimeSourceParsingTests(unittest.TestCase):
    def test_parse_thp_stats(self):
        parsed = parse_thp_stats(THP_PAYLOAD, site_code="MH", facility_label="Mississauga Hospital ED")
        self.assertEqual(parsed.average_hours, 1.3)
        self.assertEqual(parsed.average_80th_hours, 1.7)
        self.assertEqual(parsed.patients_waiting, 17)
        self.assertEqual(parsed.hourly_labels[:2], ["00", "01"])
        self.assertEqual(parsed.hourly_predicted_hours[:2], [1.4, 1.1])

    def test_parse_thp_methodology(self):
        methodology = parse_thp_methodology(THP_PAGE)
        self.assertEqual(methodology.api_url, "https://edwt-prd.thp.ca/")
        self.assertIn("80% of patients", methodology.definition_excerpt)
        self.assertIn("real-time and predicted data", methodology.methodology_excerpt)
        self.assertIn("Patients are seen based on their medical condition", methodology.urgency_excerpt)

    def test_parse_medimap_status(self):
        status = parse_medimap_status(MEDIMAP_PAGE, page_url="https://example.com")
        self.assertEqual(status.clinic_name, "Bay College Medical & Lockwood Diagnostic")
        self.assertEqual(status.address, "790 Bay St, Toronto, ON")
        self.assertEqual(status.status_text, "Opens 8am Mon")
        self.assertIn("Opens 8am Mon", status.wait_card_text)
        self.assertFalse(status.sign_in_required_for_wait_times)

    def test_parse_uhn_methodology(self):
        methodology = parse_uhn_methodology(UHN_PAGE)
        self.assertIn("updated every 1 hour", methodology.update_excerpt)
        self.assertIn("real-time emergency wait times", methodology.description_excerpt)
        self.assertEqual(methodology.powerbi_url, "https://app.powerbi.com/view?r=test")

    def test_parse_uhn_dashboard_text(self):
        parsed = parse_uhn_dashboard_text(UHN_DASHBOARD_TEXT)
        tgh = parsed["Toronto General Hospital"]
        self.assertEqual(tgh.majority_seen_within_minutes, 165)
        self.assertEqual(tgh.average_wait_minutes, 217)
        self.assertEqual(tgh.waiting_patients, 22)
        self.assertEqual(tgh.being_treated_patients, 35)
        self.assertEqual(tgh.last_updated_text, "3/07/26 3:44 PM")


class WaitTimeFusionTests(unittest.TestCase):
    def test_fusion_prefers_official_primary_wait(self):
        official = SourceSignal(
            source_kind="official_hospital_feed",
            source_name="Official",
            confidence_score=0.94,
            freshness_minutes=0,
            reported_at=datetime.now(timezone.utc),
            status="reported",
            wait_minutes=102,
            wait_min_minutes=78,
            wait_max_minutes=102,
            scenarios=[],
            metadata={"capacity_score": 0.78, "queue_length": 17, "occupancy_probability": 0.79, "diversion_probability": 0.17},
        )
        estimate = SourceSignal(
            source_kind="estimation",
            source_name="Estimate",
            confidence_score=0.63,
            freshness_minutes=2,
            reported_at=official.reported_at,
            status="estimated",
            wait_minutes=118,
            wait_min_minutes=90,
            wait_max_minutes=140,
            scenarios=[],
            metadata={"capacity_score": 0.7, "queue_length": 12, "occupancy_probability": 0.72, "diversion_probability": 0.1},
        )
        fused = fuse_signals([official, estimate])
        self.assertEqual(fused.overall_wait_minutes, 102)
        self.assertEqual(fused.overall_wait_min_minutes, 78)
        self.assertEqual(fused.overall_wait_max_minutes, 102)
        self.assertEqual(fused.source_kind, "official_hospital_feed")


if __name__ == "__main__":
    unittest.main()
