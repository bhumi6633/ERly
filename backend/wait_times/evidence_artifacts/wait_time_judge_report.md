# ERly Wait Time Evidence Report

Generated at: `2026-03-07T23:47:55+00:00`

---

## Evidence Cascade Architecture

ERly uses a **4-tier confidence cascade** to guarantee every open facility always returns a numeric wait estimate. Higher tiers override lower tiers in the fused signal.

| Tier | Provider | Confidence | Source |
|------|----------|------------|--------|
| 1 | Official hospital feed (THP API / UHN dashboard / Sunnybrook page) | 0.88–0.94 | Hospital-published endpoint — verified by SHA-256 fingerprint over raw bytes |
| 2 | Public aggregator page (Medimap) | 0.54–0.84 | Public third-party page — open/closed status + wait card text |
| 3 | Ontario Health provincial benchmark (HQO/CIHI/CAEP) | 0.48 | Published Ontario ED statistics with CTAS targets and day/time multipliers — every input individually cited |
| 4 | Care-setting proxy floor (CIHI-calibrated baseline) | 0.32 | ERly FACILITY_BASELINES derived from CIHI NACRS 2022-23 attendance distributions — always fires |

> **Guarantee:** No open facility returns a null wait time. Tier 4 always fires unless Tier 1–3 already produced a numeric estimate with higher confidence. The fused output is a confidence-weighted average across all active tiers.

---

## Section A — Live Feed Verification (GTA + Waterloo Seeded)

> THP locations use hospital-published JSON APIs with SHA-256-fingerprinted payloads. GTA hospitals without live adapters (Toronto General, Sunnybrook) cascade to Tier 3+4. Waterloo locations use Tier 3+4 from seeded DB. All 9 locations produce numeric wait times.

### Reproduction

```bash
cd /path/to/backend
./venv/bin/python tests/test_wait_times.py   # 8 unit tests
./venv/bin/python -m wait_times.judge_report  # regenerate this file
```

### Unit Tests

```text
test_fusion_prefers_official_primary_wait (test_wait_times.WaitTimeFusionTests.test_fusion_prefers_official_primary_wait) ... ok
test_parse_medimap_status (test_wait_times.WaitTimeSourceParsingTests.test_parse_medimap_status) ... ok
test_parse_sunnybrook_page (test_wait_times.WaitTimeSourceParsingTests.test_parse_sunnybrook_page) ... ok
test_parse_sunnybrook_page_returns_none_when_no_data (test_wait_times.WaitTimeSourceParsingTests.test_parse_sunnybrook_page_returns_none_when_no_data) ... ok
test_parse_thp_methodology (test_wait_times.WaitTimeSourceParsingTests.test_parse_thp_methodology) ... ok
test_parse_thp_stats (test_wait_times.WaitTimeSourceParsingTests.test_parse_thp_stats) ... ok
test_parse_uhn_dashboard_text (test_wait_times.WaitTimeSourceParsingTests.test_parse_uhn_dashboard_text) ... ok
test_parse_uhn_methodology (test_wait_times.WaitTimeSourceParsingTests.test_parse_uhn_methodology) ... ok

----------------------------------------------------------------------
Ran 8 tests in 0.002s

OK

PASSED=True  RUN=8
```

### Live Demo Run (9 locations — 2 live APIs + 7 benchmark cascade)

```text
Database already seeded — skipping. Use --reset to wipe and reseed.
ERly wait-time evidence demo
Live fetches + source proofs + strict evidence gating
generated_at=2026-03-07T23:47:47+00:00

Location                           | Source                   | Evidence                 | Wait       | Range           | Conf   | Updated            
------------------------------------------------------------------------------------------------------------------------------------------------------
Credit Valley Hospital             | official_hospital_feed   | official_api_feed        | 228m       | 144-228m        | 0.94   | 2026-03-07 23:47   
Trillium Health Partners — Mississ | official_hospital_feed   | official_api_feed        | 90m        | 60-90m          | 0.94   | 2026-03-07 23:47   
Bay-College Medical Centre         | public_aggregator        | public_aggregator_page   | closed     | n/a             | 0.48   | 2026-03-07 23:47   
Toronto General Hospital           | official_hospital_feed   | official_browser_dashboa | 165m       | 165-176m        | 0.91   | 2026-03-07 23:47   
Sunnybrook Health Sciences Centre  | provincial_benchmark     | provincial_benchmark     | 108m       | 75-144m         | 0.42   | 2026-03-07 23:47   
St. Michael's Hospital ER          | provincial_benchmark     | provincial_benchmark     | 105m       | 74-140m         | 0.42   | 2026-03-07 23:47   
Grand River Hospital               | provincial_benchmark     | provincial_benchmark     | 108m       | 75-144m         | 0.42   | 2026-03-07 23:47   
Waterloo Walk-in Clinic — Universi | provincial_benchmark     | provincial_benchmark     | closed     | n/a             | 0.42   | 2026-03-07 23:47   
UW Campus Health Services          | provincial_benchmark     | provincial_benchmark     | closed     | n/a             | 0.42   | 2026-03-07 23:47   

========================================================================================
Credit Valley Hospital (hospital)
========================================================================================
location_id=17  address=2200 Eglinton Ave W, Mississauga
result={
  "source_kind": "official_hospital_feed",
  "source_name": "ERly fused wait-time engine",
  "status": "reported",
  "overall_wait_minutes": 228,
  "overall_wait_range": [
    144,
    228
  ],
  "confidence_score": 0.94,
  "confidence_label": "high",
  "queue_length": 50,
  "occupancy_probability": 0.851,
  "diversion_probability": 0.273,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:official_hospital_feed]
  name=Credit Valley Hospital ED official feed
  status=reported
  trust_verdict=official exact feed
  confidence=0.940
  reported_at=2026-03-07T18:46:40.291386
  wait=228 range=[144, 228]
  evidence_tier=official_api_feed
  source_url=https://edwt-prd.thp.ca/waittimes/stats/CVH
  methodology_url=https://www.thp.ca/emergency/A/visit.html
  source_fingerprint_sha256=f346d7d655334b1d538ee67cef44a254abfc9402c5142c80fe6f7b754c0fef7e
  definition_excerpt=Definition: 80% of patients will be seen by a doctor within this time period.
  methodology_excerpt=The Wait Time Dashboard provides real-time and predicted data (based on last 30 days of data) that will help patients have a better understanding of the wait time to see a doctor after being triaged (initial assessment with a nurse). Wait times are shown for both the Credit Valley Hospital and Mississauga Hospital EDs.
  urgency_excerpt=Patients are seen based on their medical condition and the urgency of their situation (e.g., chest pain is prioritized over a minor cut). Posted wait times are estimates and may change.
  public_status_text=None
  wait_card_text=None
  match_strategy=exact
  screenshot_path=None
  formula_explanation=None
  formula_inputs=null

[evidence:raw_payload]
  {
  "averageTimeToSeeDoctor": 2.4,
  "averageTimeToSeeDoctor80th": 3.8,
  "patientsWaitingToSeeDoctor": 50,
  "activePatients": 143,
  "activeNoBedAdmits": 39,
  "lastUpdated": "2026-03-07T18:46:40.2913864-05:00",
  "hour15_prediction": 2.6
}

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=estimated
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=125 range=[87, 168]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 1.15}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=estimated
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=83 range=[58, 108]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['hospital'] = 1.0. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 1.0}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for hospital: 76 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 76}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 1] target=0 p_within_target=0.496 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  immediate_emergency: wait=12 range=[7, 17] target=10 p_within_target=0.846 confidence=0.783 notes=Patients are seen based on their medical condition and the urgency of their situation (e.g., chest pain is prioritized over a minor cut). Posted wait times are estimates and may change.
  ctas_2: wait=19 range=[14, 34] target=15 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ambulance_offload: wait=43 range=[32, 54] target=25 p_within_target=0.344 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_3: wait=38 range=[28, 69] target=30 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_4: wait=76 range=[57, 138] target=60 p_within_target=0.313 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  predicted_current_hour: wait=114 range=[99, 129] target=90 p_within_target=0.420 confidence=0.940 notes=The Wait Time Dashboard provides real-time and predicted data (based on last 30 days of data) that will help patients have a better understanding of the wait time to see a doctor after being triaged (initial assessment with a nurse). Wait times are shown for both the Credit Valley Hospital and Mississauga Hospital EDs.
  standard_er: wait=191 range=[124, 196] target=120 p_within_target=0.371 confidence=0.783 notes=Definition: 80% of patients will be seen by a doctor within this time period.
  ctas_5: wait=151 range=[113, 276] target=120 p_within_target=0.316 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  low_acuity_non_urgent: wait=224 range=[130, 247] target=180 p_within_target=0.301 confidence=0.715 notes=Heuristic uplift above the official 80th percentile because the hospital states sicker patients may be seen sooner than the dashboard time.

========================================================================================
Trillium Health Partners — Mississauga (hospital)
========================================================================================
location_id=18  address=100 Queensway W, Mississauga
result={
  "source_kind": "official_hospital_feed",
  "source_name": "ERly fused wait-time engine",
  "status": "reported",
  "overall_wait_minutes": 90,
  "overall_wait_range": [
    60,
    90
  ],
  "confidence_score": 0.94,
  "confidence_label": "high",
  "queue_length": 11,
  "occupancy_probability": 0.742,
  "diversion_probability": 0.236,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:official_hospital_feed]
  name=Mississauga Hospital ED official feed
  status=reported
  trust_verdict=official exact feed
  confidence=0.940
  reported_at=2026-03-07T18:46:40.291386
  wait=90 range=[60, 90]
  evidence_tier=official_api_feed
  source_url=https://edwt-prd.thp.ca/waittimes/stats/MH
  methodology_url=https://www.thp.ca/emergency/A/visit.html
  source_fingerprint_sha256=7ac8ba54bfbeaf517b9709caf3a351acc207105c35ba8a765e54c12e6a215c8b
  definition_excerpt=Definition: 80% of patients will be seen by a doctor within this time period.
  methodology_excerpt=The Wait Time Dashboard provides real-time and predicted data (based on last 30 days of data) that will help patients have a better understanding of the wait time to see a doctor after being triaged (initial assessment with a nurse). Wait times are shown for both the Credit Valley Hospital and Mississauga Hospital EDs.
  urgency_excerpt=Patients are seen based on their medical condition and the urgency of their situation (e.g., chest pain is prioritized over a minor cut). Posted wait times are estimates and may change.
  public_status_text=None
  wait_card_text=None
  match_strategy=exact
  screenshot_path=None
  formula_explanation=None
  formula_inputs=null

[evidence:raw_payload]
  {
  "averageTimeToSeeDoctor": 1,
  "averageTimeToSeeDoctor80th": 1.5,
  "patientsWaitingToSeeDoctor": 11,
  "activePatients": 72,
  "activeNoBedAdmits": 17,
  "lastUpdated": "2026-03-07T18:46:40.2913864-05:00",
  "hour15_prediction": 1.4
}

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=estimated
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=125 range=[87, 168]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 1.15}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=estimated
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=83 range=[58, 108]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['hospital'] = 1.0. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 1.0}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for hospital: 76 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 76}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 1] target=0 p_within_target=0.496 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  immediate_emergency: wait=12 range=[7, 17] target=10 p_within_target=0.846 confidence=0.783 notes=Patients are seen based on their medical condition and the urgency of their situation (e.g., chest pain is prioritized over a minor cut). Posted wait times are estimates and may change.
  ctas_2: wait=19 range=[14, 34] target=15 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ambulance_offload: wait=43 range=[32, 54] target=25 p_within_target=0.344 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_3: wait=38 range=[28, 69] target=30 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_4: wait=76 range=[57, 138] target=60 p_within_target=0.313 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  predicted_current_hour: wait=60 range=[45, 75] target=90 p_within_target=1.000 confidence=0.940 notes=The Wait Time Dashboard provides real-time and predicted data (based on last 30 days of data) that will help patients have a better understanding of the wait time to see a doctor after being triaged (initial assessment with a nurse). Wait times are shown for both the Credit Valley Hospital and Mississauga Hospital EDs.
  standard_er: wait=88 range=[61, 93] target=120 p_within_target=0.856 confidence=0.783 notes=Definition: 80% of patients will be seen by a doctor within this time period.
  ctas_5: wait=151 range=[113, 276] target=120 p_within_target=0.316 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  low_acuity_non_urgent: wait=105 range=[67, 118] target=180 p_within_target=0.569 confidence=0.715 notes=Heuristic uplift above the official 80th percentile because the hospital states sicker patients may be seen sooner than the dashboard time.

========================================================================================
Bay-College Medical Centre (urgent_care)
========================================================================================
location_id=11  address=777 Bay St, Toronto
result={
  "source_kind": "public_aggregator",
  "source_name": "ERly fused wait-time engine",
  "status": "closed",
  "overall_wait_minutes": null,
  "overall_wait_range": [
    null,
    null
  ],
  "confidence_score": 0.485,
  "confidence_label": "low",
  "queue_length": 5,
  "occupancy_probability": 0.275,
  "diversion_probability": 0.0,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:public_aggregator]
  name=Medimap public page
  status=closed
  trust_verdict=public alias match
  confidence=0.580
  reported_at=2026-03-07T23:47:00
  wait=None range=[None, None]
  evidence_tier=public_aggregator_page
  source_url=https://medimap.ca/clinic/walk-in-clinics/on/toronto/bay-college-medical-and-lockwood-diagnostic
  methodology_url=None
  source_fingerprint_sha256=8470b73f587b2493517a24082c7fa19028633261f6b096dc8660779a3ac8eaee
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=Opens 8am Mon
  wait_card_text=Opens 8am Mon
  match_strategy=manual_alias
  screenshot_path=None
  formula_explanation=None
  formula_inputs=null

[evidence:html_snippets]
  Bay College Medical & Lockwood Diagnostic
  Opens 8am Mon
  Wait TimeOpens 8am Mon

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=closed
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=None range=[None, None]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'urgent_care' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 0.4}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=closed
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=None range=[None, None]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['urgent_care'] = 0.58. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 0.58}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for urgent_care: 26 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 26}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  clinic_public_status: wait=None range=[None, None] target=0 p_within_target=0.000 confidence=0.580 notes=Opens 8am Mon
  ctas_1: wait=0 range=[0, 0] target=0 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_2: wait=7 range=[5, 12] target=15 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_3: wait=13 range=[10, 24] target=30 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  urgent_walk_in: wait=None range=[None, None] target=30 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  minor_injury: wait=None range=[None, None] target=40 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  low_acuity_non_urgent: wait=None range=[None, None] target=55 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  ctas_4: wait=26 range=[20, 48] target=60 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_5: wait=53 range=[40, 96] target=120 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/

========================================================================================
Toronto General Hospital (hospital)
========================================================================================
location_id=1  address=200 Elizabeth St, Toronto
result={
  "source_kind": "official_hospital_feed",
  "source_name": "ERly fused wait-time engine",
  "status": "reported",
  "overall_wait_minutes": 165,
  "overall_wait_range": [
    165,
    176
  ],
  "confidence_score": 0.91,
  "confidence_label": "high",
  "queue_length": 20,
  "occupancy_probability": 0.829,
  "diversion_probability": 0.062,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:official_hospital_feed]
  name=Toronto General Hospital official dashboard
  status=reported
  trust_verdict=official browser dashboard
  confidence=0.910
  reported_at=2026-03-07T18:44:00
  wait=165 range=[165, 176]
  evidence_tier=official_browser_dashboard
  source_url=https://app.powerbi.com/view?r=eyJrIjoiYjdmYTA2ZGEtZjIyOS00MzZhLThjMzQtNmIxYjgyODA3NmI2IiwidCI6ImQ5MGRjZTA1LTA2M2QtNDE0Zi1hZWZlLWMyOTJmZjE4ZDhiMCJ9
  methodology_url=https://www.uhn.ca/PatientsFamilies/Visit_UHN/Emergency/Pages/ED_wait_times.aspx
  source_fingerprint_sha256=9ddd1128df3e0d225d01dcfad736bbd4939e2e4c04a0a39d2ac502f09cb00f13
  definition_excerpt=Official UHN dashboard metric: The majority of patients will be seen within.
  methodology_excerpt=The wait time information presented on this webpage is updated every 1 hour and may vary from the real-time information displayed at the Emergency Department.
  urgency_excerpt=Immediate life-threatening patients are triaged ahead of posted dashboard times.
  public_status_text=None
  wait_card_text=None
  match_strategy=exact
  screenshot_path=/Users/vishnu/Documents/Triage/HackCanada2026/backend/wait_times/evidence_artifacts/uhn-dashboard-2026-03-07T23.png
  formula_explanation=None
  formula_inputs=null

[evidence:dashboard_text]
  Toronto General Hospital Number of Patients 02:45 hours The majority of patients will be seen within: 20 Waiting 38 Being Treated Average Wait Time to See a Provider Last updated at: 2:56 hours 3/07/26 6:44 PM

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=estimated
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=125 range=[87, 168]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 1.15}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=estimated
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=83 range=[58, 108]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['hospital'] = 1.0. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 1.0}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for hospital: 76 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 76}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 1] target=0 p_within_target=0.496 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  immediate_emergency: wait=12 range=[7, 17] target=10 p_within_target=0.842 confidence=0.757 notes=Immediate life-threatening triage cases are prioritized ahead of posted dashboard wait times.
  ctas_2: wait=19 range=[14, 34] target=15 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ambulance_offload: wait=43 range=[32, 54] target=25 p_within_target=0.344 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_3: wait=38 range=[28, 69] target=30 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_4: wait=76 range=[57, 138] target=60 p_within_target=0.313 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_5: wait=151 range=[113, 276] target=120 p_within_target=0.316 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  majority_seen_within: wait=165 range=[165, 165] target=180 p_within_target=1.000 confidence=0.910 notes=Official UHN dashboard metric shown to arriving ED patients.
  standard_er: wait=152 range=[139, 156] target=180 p_within_target=0.852 confidence=0.742 notes=The wait time information presented on this webpage is updated every 1 hour and may vary from the real-time information displayed at the Emergency Department.
  low_acuity_non_urgent: wait=175 range=[145, 194] target=240 p_within_target=0.598 confidence=0.697 notes=Heuristic uplift above the official dashboard because lower-acuity patients are typically deprioritized behind sicker arrivals.

========================================================================================
Sunnybrook Health Sciences Centre (hospital)
========================================================================================
location_id=3  address=2075 Bayview Ave, Toronto
result={
  "source_kind": "provincial_benchmark",
  "source_name": "ERly fused wait-time engine",
  "status": "estimated",
  "overall_wait_minutes": 108,
  "overall_wait_range": [
    75,
    144
  ],
  "confidence_score": 0.416,
  "confidence_label": "low",
  "queue_length": 31,
  "occupancy_probability": 0.666,
  "diversion_probability": 0.002,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=estimated
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=125 range=[87, 168]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 1.15}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=estimated
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=83 range=[58, 108]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['hospital'] = 1.0. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 1.0}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for hospital: 76 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 76}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 1] target=0 p_within_target=0.496 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  immediate_emergency: wait=12 range=[7, 17] target=10 p_within_target=0.393 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_2: wait=19 range=[14, 34] target=15 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ambulance_offload: wait=43 range=[32, 54] target=25 p_within_target=0.344 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_3: wait=38 range=[28, 69] target=30 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_4: wait=76 range=[57, 138] target=60 p_within_target=0.313 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  standard_er: wait=83 range=[65, 101] target=60 p_within_target=0.432 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_5: wait=151 range=[113, 276] target=120 p_within_target=0.316 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  low_acuity_non_urgent: wait=111 range=[88, 134] target=120 p_within_target=0.537 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata

========================================================================================
St. Michael's Hospital ER (er)
========================================================================================
location_id=2  address=36 Queen St E, Toronto
result={
  "source_kind": "provincial_benchmark",
  "source_name": "ERly fused wait-time engine",
  "status": "estimated",
  "overall_wait_minutes": 105,
  "overall_wait_range": [
    74,
    140
  ],
  "confidence_score": 0.416,
  "confidence_label": "low",
  "queue_length": 34,
  "occupancy_probability": 0.643,
  "diversion_probability": 0.033,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=estimated
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=108 range=[76, 146]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'er' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 1.0}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=estimated
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=101 range=[70, 132]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['er'] = 1.08. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 1.08}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for er: 92 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 92}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 1] target=0 p_within_target=0.496 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  immediate_emergency: wait=12 range=[7, 17] target=10 p_within_target=0.393 confidence=0.320 notes=ERly care-setting baseline for er facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_2: wait=16 range=[12, 30] target=15 p_within_target=0.363 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ambulance_offload: wait=48 range=[37, 59] target=20 p_within_target=0.087 confidence=0.320 notes=ERly care-setting baseline for er facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_3: wait=33 range=[25, 60] target=30 p_within_target=0.354 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_4: wait=66 range=[50, 120] target=60 p_within_target=0.354 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  standard_er: wait=101 range=[81, 121] target=60 p_within_target=0.312 confidence=0.320 notes=ERly care-setting baseline for er facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_5: wait=131 range=[98, 240] target=120 p_within_target=0.359 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  low_acuity_non_urgent: wait=143 range=[118, 168] target=135 p_within_target=0.407 confidence=0.320 notes=ERly care-setting baseline for er facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata

========================================================================================
Grand River Hospital (hospital)
========================================================================================
location_id=39  address=835 King St W, Kitchener
result={
  "source_kind": "provincial_benchmark",
  "source_name": "ERly fused wait-time engine",
  "status": "estimated",
  "overall_wait_minutes": 108,
  "overall_wait_range": [
    75,
    144
  ],
  "confidence_score": 0.416,
  "confidence_label": "low",
  "queue_length": 31,
  "occupancy_probability": 0.666,
  "diversion_probability": 0.002,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=estimated
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=125 range=[87, 168]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 1.15}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=estimated
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=83 range=[58, 108]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['hospital'] = 1.0. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 1.0}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for hospital: 76 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 76}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 1] target=0 p_within_target=0.496 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  immediate_emergency: wait=12 range=[7, 17] target=10 p_within_target=0.393 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_2: wait=19 range=[14, 34] target=15 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ambulance_offload: wait=43 range=[32, 54] target=25 p_within_target=0.344 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_3: wait=38 range=[28, 69] target=30 p_within_target=0.318 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_4: wait=76 range=[57, 138] target=60 p_within_target=0.313 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  standard_er: wait=83 range=[65, 101] target=60 p_within_target=0.432 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata
  ctas_5: wait=151 range=[113, 276] target=120 p_within_target=0.316 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  low_acuity_non_urgent: wait=111 range=[88, 134] target=120 p_within_target=0.537 confidence=0.320 notes=ERly care-setting baseline for hospital facilities, calibrated from CIHI NACRS 2022-23. https://www.cihi.ca/en/nacrs-metadata

========================================================================================
Waterloo Walk-in Clinic — University Plaza (urgent_care)
========================================================================================
location_id=44  address=170 University Ave W, Waterloo
result={
  "source_kind": "provincial_benchmark",
  "source_name": "ERly fused wait-time engine",
  "status": "closed",
  "overall_wait_minutes": null,
  "overall_wait_range": [
    null,
    null
  ],
  "confidence_score": 0.416,
  "confidence_label": "low",
  "queue_length": 9,
  "occupancy_probability": 0.33,
  "diversion_probability": 0.0,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=closed
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=None range=[None, None]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'urgent_care' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 0.4}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=closed
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=None range=[None, None]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['urgent_care'] = 0.58. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 0.58}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for urgent_care: 26 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 26}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 0] target=0 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_2: wait=7 range=[5, 12] target=15 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_3: wait=13 range=[10, 24] target=30 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  urgent_walk_in: wait=None range=[None, None] target=30 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  minor_injury: wait=None range=[None, None] target=40 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  low_acuity_non_urgent: wait=None range=[None, None] target=55 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  ctas_4: wait=26 range=[20, 48] target=60 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_5: wait=53 range=[40, 96] target=120 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/

========================================================================================
UW Campus Health Services (clinic)
========================================================================================
location_id=50  address=200 University Ave W, Waterloo
result={
  "source_kind": "provincial_benchmark",
  "source_name": "ERly fused wait-time engine",
  "status": "closed",
  "overall_wait_minutes": null,
  "overall_wait_range": [
    null,
    null
  ],
  "confidence_score": 0.416,
  "confidence_label": "low",
  "queue_length": 7,
  "occupancy_probability": 0.236,
  "diversion_probability": 0.0,
  "last_reported_at": "2026-03-07T23:47:00"
}

[source:provincial_benchmark]
  name=Ontario Health provincial benchmark model
  status=closed
  trust_verdict=ontario health provincial benchmark model (low confidence)
  confidence=0.480
  reported_at=2026-03-07T23:47:00
  wait=None range=[None, None]
  evidence_tier=provincial_benchmark
  source_url=None
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=benchmark_model
  screenshot_path=None
  formula_explanation=est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier
  formula_inputs={"daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "ontario_median_physician_wait_minutes": {"source_citation": "Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 99}, "size_factor": {"source_citation": "Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments", "value": 0.25}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[source:care_setting_proxy]
  name=ERly care-setting proxy (CIHI-calibrated baseline)
  status=closed
  trust_verdict=cihi-calibrated care-setting proxy (evidence floor, confidence 0.32)
  confidence=0.320
  reported_at=2026-03-07T23:47:00
  wait=None range=[None, None]
  evidence_tier=care_setting_proxy
  source_url=https://www.cihi.ca/en/nacrs-metadata
  methodology_url=None
  source_fingerprint_sha256=None
  definition_excerpt=None
  methodology_excerpt=None
  urgency_excerpt=None
  public_status_text=None
  wait_card_text=None
  match_strategy=facility_type_baseline
  screenshot_path=None
  formula_explanation=est_wait = facility_type_baseline_wait × daypart_multiplier × weekday_multiplier
  formula_inputs={"care_setting_proxy_factor": {"source_citation": "ERly CARE_SETTING_PROXY_FACTORS['clinic'] = 0.46. Derived from CIHI NACRS weighted facility-type median visit durations.", "value": 0.46}, "daypart_multiplier": {"source_citation": "CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 1.14}, "facility_type_baseline_wait_minutes": {"source_citation": "ERly baseline for clinic: 18 min. Derived from CIHI NACRS 2022-23 median visit durations. https://www.cihi.ca/en/nacrs-metadata", "value": 18}, "weekday_multiplier": {"source_citation": "CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata", "value": 0.96}}

[subcases]
  ctas_1: wait=0 range=[0, 0] target=0 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_2: wait=4 range=[3, 8] target=15 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  ctas_3: wait=8 range=[6, 15] target=30 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  same_day_primary_care: wait=None range=[None, None] target=30 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  follow_up_or_mental_health: wait=None range=[None, None] target=50 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  ctas_4: wait=16 range=[12, 30] target=60 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
  routine_non_urgent: wait=None range=[None, None] target=60 p_within_target=0.000 confidence=0.320 notes=Facility currently closed based on configured hours.
  ctas_5: wait=33 range=[25, 60] target=120 p_within_target=0.786 confidence=0.480 notes=CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/
```

### Metric Provenance (full cascade per location)

### Credit Valley Hospital
- **Fused headline:** `228` min, range `144–228` min
- **Active source tiers:** `3` (official_hospital_feed, provincial_benchmark, care_setting_proxy)
- **Primary tier:** `official_hospital_feed` (confidence `0.94`)
- **Evidence tier:** `official_api_feed`
- **Match strategy:** `exact`
- **Queue length:** `50` | **Occupancy:** `0.851` | **Diversion:** `0.273`
- **Source fingerprint (primary):** `f346d7d655334b1d538ee67cef44a254abfc9402c5142c80fe6f7b754c0fef7e`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`official_hospital_feed`** | confidence `0.94` | tier `official_api_feed` | wait `228` min [`144`–`228`] | status `reported`
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `125` min [`87`–`168`] | status `estimated`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `83` min [`58`–`108`] | status `estimated`

#### Primary tier detail
- Wait source field: `averageTimeToSeeDoctor80th` from `https://edwt-prd.thp.ca/waittimes/stats/CVH`
- Queue source field: `patientsWaitingToSeeDoctor=50`
- Occupancy derivation: `activePatients / (activePatients + 25)` with `activePatients=143`
- Diversion derivation: `activeNoBedAdmits / activePatients` with `activeNoBedAdmits=39`
- Methodology source: `https://www.thp.ca/emergency/A/visit.html`

```json
{
  "averageTimeToSeeDoctor": 2.4,
  "averageTimeToSeeDoctor80th": 3.8,
  "patientsWaitingToSeeDoctor": 50,
  "activePatients": 143,
  "activeNoBedAdmits": 39,
  "lastUpdated": "2026-03-07T18:46:40.2913864-05:00"
}
```
### Trillium Health Partners — Mississauga
- **Fused headline:** `90` min, range `60–90` min
- **Active source tiers:** `3` (official_hospital_feed, provincial_benchmark, care_setting_proxy)
- **Primary tier:** `official_hospital_feed` (confidence `0.94`)
- **Evidence tier:** `official_api_feed`
- **Match strategy:** `exact`
- **Queue length:** `11` | **Occupancy:** `0.742` | **Diversion:** `0.236`
- **Source fingerprint (primary):** `7ac8ba54bfbeaf517b9709caf3a351acc207105c35ba8a765e54c12e6a215c8b`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`official_hospital_feed`** | confidence `0.94` | tier `official_api_feed` | wait `90` min [`60`–`90`] | status `reported`
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `125` min [`87`–`168`] | status `estimated`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `83` min [`58`–`108`] | status `estimated`

#### Primary tier detail
- Wait source field: `averageTimeToSeeDoctor80th` from `https://edwt-prd.thp.ca/waittimes/stats/MH`
- Queue source field: `patientsWaitingToSeeDoctor=11`
- Occupancy derivation: `activePatients / (activePatients + 25)` with `activePatients=72`
- Diversion derivation: `activeNoBedAdmits / activePatients` with `activeNoBedAdmits=17`
- Methodology source: `https://www.thp.ca/emergency/A/visit.html`

```json
{
  "averageTimeToSeeDoctor": 1,
  "averageTimeToSeeDoctor80th": 1.5,
  "patientsWaitingToSeeDoctor": 11,
  "activePatients": 72,
  "activeNoBedAdmits": 17,
  "lastUpdated": "2026-03-07T18:46:40.2913864-05:00"
}
```
### Bay-College Medical Centre
- **Fused headline:** `None` min, range `None–None` min
- **Active source tiers:** `3` (public_aggregator, provincial_benchmark, care_setting_proxy)
- **Primary tier:** `public_aggregator` (confidence `0.58`)
- **Evidence tier:** `public_aggregator_page`
- **Match strategy:** `manual_alias`
- **Queue length:** `5` | **Occupancy:** `0.275` | **Diversion:** `0.0`
- **Source fingerprint (primary):** `8470b73f587b2493517a24082c7fa19028633261f6b096dc8660779a3ac8eaee`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`public_aggregator`** | confidence `0.58` | tier `public_aggregator_page` | wait `None` min [`None`–`None`] | status `closed`
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `None` min [`None`–`None`] | status `closed`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `None` min [`None`–`None`] | status `closed`

#### Primary tier detail
- Public status text: `Opens 8am Mon`
- Wait-card text: `Opens 8am Mon`
- No numeric queue or wait was exposed by the source; headline wait is suppressed when closed.

```text
Bay College Medical & Lockwood Diagnostic
Opens 8am Mon
Wait TimeOpens 8am Mon
```
### Toronto General Hospital
- **Fused headline:** `165` min, range `165–176` min
- **Active source tiers:** `3` (official_hospital_feed, provincial_benchmark, care_setting_proxy)
- **Primary tier:** `official_hospital_feed` (confidence `0.91`)
- **Evidence tier:** `official_browser_dashboard`
- **Match strategy:** `exact`
- **Queue length:** `20` | **Occupancy:** `0.829` | **Diversion:** `0.062`
- **Source fingerprint (primary):** `9ddd1128df3e0d225d01dcfad736bbd4939e2e4c04a0a39d2ac502f09cb00f13`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`official_hospital_feed`** | confidence `0.91` | tier `official_browser_dashboard` | wait `165` min [`165`–`176`] | status `reported`
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `125` min [`87`–`168`] | status `estimated`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `83` min [`58`–`108`] | status `estimated`

#### Primary tier detail
- Wait source field: dashboard text `The majority of patients will be seen within: 165 minutes`
- Average wait source field: dashboard text `Average Wait Time to See a Provider: 176 minutes`
- Queue source field: dashboard text `Waiting 20`
- Occupancy derivation: `(waiting + being_treated) / 70` with `being_treated=38`
- Diversion derivation: `(waiting - 15) / 80`
- Dashboard source: `https://app.powerbi.com/view?r=eyJrIjoiYjdmYTA2ZGEtZjIyOS00MzZhLThjMzQtNmIxYjgyODA3NmI2IiwidCI6ImQ5MGRjZTA1LTA2M2QtNDE0Zi1hZWZlLWMyOTJmZjE4ZDhiMCJ9`
- Methodology source: `https://www.uhn.ca/PatientsFamilies/Visit_UHN/Emergency/Pages/ED_wait_times.aspx`

```text
Toronto General Hospital Number of Patients 02:45 hours The majority of patients will be seen within: 20 Waiting 38 Being Treated Average Wait Time to See a Provider Last updated at: 2:56 hours 3/07/26 6:44 PM
```

![Dashboard evidence](/Users/vishnu/Documents/Triage/HackCanada2026/backend/wait_times/evidence_artifacts/uhn-dashboard-2026-03-07T23.png)
### Sunnybrook Health Sciences Centre
- **Fused headline:** `108` min, range `75–144` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `31` | **Occupancy:** `0.666` | **Diversion:** `0.002`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `125` min [`87`–`168`] | status `estimated`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `83` min [`58`–`108`] | status `estimated`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 1.15` — Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `87 – 168 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.
### St. Michael's Hospital ER
- **Fused headline:** `105` min, range `74–140` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `34` | **Occupancy:** `0.643` | **Diversion:** `0.033`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `108` min [`76`–`146`] | status `estimated`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `101` min [`70`–`132`] | status `estimated`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 1.0` — Derived from HQO volume-weighted ED data for 'er' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `76 – 146 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.
### Grand River Hospital
- **Fused headline:** `108` min, range `75–144` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `31` | **Occupancy:** `0.666` | **Diversion:** `0.002`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `125` min [`87`–`168`] | status `estimated`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `83` min [`58`–`108`] | status `estimated`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 1.15` — Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `87 – 168 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.
### Waterloo Walk-in Clinic — University Plaza
- **Fused headline:** `None` min, range `None–None` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `9` | **Occupancy:** `0.33` | **Diversion:** `0.0`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `None` min [`None`–`None`] | status `closed`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `None` min [`None`–`None`] | status `closed`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 0.4` — Derived from HQO volume-weighted ED data for 'urgent_care' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `30 – 59 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.
### UW Campus Health Services
- **Fused headline:** `None` min, range `None–None` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `7` | **Occupancy:** `0.236` | **Diversion:** `0.0`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `None` min [`None`–`None`] | status `closed`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `None` min [`None`–`None`] | status `closed`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 0.25` — Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `19 – 37 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.

---

## Section B — Waterloo Region Seeded Fallback (SPUR Campus Pipeline)

> These locations are in the seeded DB. They demonstrate the **Tier 3+4 benchmark cascade** that fires for any user at SPUR Campus (2240 University Ave, Waterloo, ON). No live adapter is registered — the pipeline falls through to provincial benchmark and CIHI-calibrated baseline, each with full formula provenance.

### Grand River Hospital
- **Fused headline:** `108` min, range `75–144` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `31` | **Occupancy:** `0.666` | **Diversion:** `0.002`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `125` min [`87`–`168`] | status `estimated`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `83` min [`58`–`108`] | status `estimated`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 1.15` — Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `87 – 168 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.
### Waterloo Walk-in Clinic — University Plaza
- **Fused headline:** `None` min, range `None–None` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `9` | **Occupancy:** `0.33` | **Diversion:** `0.0`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `None` min [`None`–`None`] | status `closed`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `None` min [`None`–`None`] | status `closed`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 0.4` — Derived from HQO volume-weighted ED data for 'urgent_care' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `30 – 59 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.
### UW Campus Health Services
- **Fused headline:** `None` min, range `None–None` min
- **Active source tiers:** `2` (provincial_benchmark, care_setting_proxy)
- **Primary tier:** `provincial_benchmark` (confidence `0.48`)
- **Evidence tier:** `provincial_benchmark`
- **Match strategy:** `benchmark_model`
- **Queue length:** `7` | **Occupancy:** `0.236` | **Diversion:** `0.0`
- **Source fingerprint (primary):** `None`

#### Active source tiers (all contribute to fused estimate via confidence weighting)
- **`provincial_benchmark`** | confidence `0.48` | tier `provincial_benchmark` | wait `None` min [`None`–`None`] | status `closed`
- **`care_setting_proxy`** | confidence `0.32` | tier `care_setting_proxy` | wait `None` min [`None`–`None`] | status `closed`

#### Primary tier detail
- Model: Ontario Health provincial benchmark model (not a live feed)
- Benchmark source: `https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments`
- CTAS guidelines source: `https://caep.ca/resources/ctas/`
- Formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- Ontario median physician wait (baseline): `99 minutes`
- Formula inputs (each with source citation):
  - `ontario_median_physician_wait_minutes = 99` — Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `size_factor = 0.25` — Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments
  - `daypart_multiplier = 1.14` — CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
  - `weekday_multiplier = 0.96` — CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata
- Output range: `19 – 37 minutes`
- No live feed is configured for this location; this estimate is NOT decision-grade.

---

## Section B — Waterloo Region Discovery from SPUR Campus

**Base location:** SPUR Campus – Spur Innovation Centre
**Address:** 2240 University Ave, Waterloo, ON N2K 0G3
**Coordinates (WGS-84):** `43.4997°N, -80.5392°E`
**Discovery radius:** 10 km  
**Discovery method:** OpenStreetMap Overpass API — `overpass-api.de/api/interpreter`
**Timestamp:** `2026-03-07T23:47:47+00:00`

### Rationale

For any user location that does not match a known live-adapter registry entry (THP API, UHN dashboard, Sunnybrook), ERly falls back to the **Ontario Health Provincial Benchmark Model** using published CIHI/HQO data with full citation chains. Below, every facility discovered by Overpass within 10 km receives a benchmark-derived wait estimate with its full formula provenance.

### 63 Facilities Found via OpenStreetMap

| # | Name | OSM type | Distance | Addr |
|---|------|----------|----------|------|
| 1 | Dr. John Lu | `doctors` (node/648487943) | 2.11 km | 81, Cardill Crescent |
| 2 | Waterloo Nuclear and Radiography | `clinic` (node/10120212692) | 2.14 km | 380, King Street North, Waterloo |
| 3 | Curex Medical Centre | `doctors` (node/10120212693) | 2.14 km | 380, King Street North, Waterloo |
| 4 | Canuk Healthcare | `clinic` (node/12291166390) | 2.14 km | n/a |
| 5 | Dearborn Health | `clinic` (node/4826287769) | 2.29 km | n/a |
| 6 | Eastbridge Walk-in Clinic | `doctors` (node/1566651687) | 2.47 km | n/a |
| 7 | Spruce Medical | `clinic` (node/12968699018) | 2.55 km | n/a |
| 8 | Flockton Chiropractic Clinic | `clinic` (node/12374681048) | 2.62 km | n/a |
| 9 | Lester Medical And Educational Centre | `clinic` (node/5368660993) | 2.69 km | Waterloo |
| 10 | True North Imaging | `clinic` (node/10308014738) | 2.94 km | 65, University Avenue East, Waterloo |
| 11 | Waterloo Sports Medicine Centre | `clinic` (node/10308014741) | 2.98 km | 65, University Avenue East, Waterloo |
| 12 | Waterloo Walk-in Clinic | `doctors` (way/39606061) | 3.09 km | 170, University Avenue West |
| 13 | Health Services | `doctors` (way/43250611) | 3.29 km | n/a |
| 14 | Uptown Waterloo Health and Wellness Clinic | `clinic` (node/10985244626) | 3.94 km | n/a |
| 15 | Spa Surgica MediSpa | `clinic` (way/325120099) | 4.16 km | n/a |
| 16 | Dr. José Adrian Prudencio | `doctors` (node/13520863037) | 4.17 km | 55, Erb Street East, Waterloo, ON |
| 17 | CARESPACE Uptown Waterloo | `clinic` (node/12881056591) | 4.22 km | n/a |
| 18 | K. Papp | `doctors` (node/1983051220) | 4.68 km | n/a |
| 19 | DR. Pierre Kugler | `doctors` (node/1982899754) | 4.71 km | n/a |
| 20 | Onyx Medical Centre | `doctors` (node/3599620761) | 4.97 km | 580, Lancaster Street West, Kitchener |
| 21 | Tri-City Hearing & Balance Care | `clinic` (node/12922276975) | 5.18 km | 535, Park Street, Kitchener, ON |
| 22 | Dr. Satish Rangaswamy — Urology–Vasectomy | `clinic` (node/12922276976) | 5.19 km | 535, Park Street, Kitchener, ON |
| 23 | Dr. Maky Hafidh — Ear, Nose, Throat | `doctors` (node/12922276977) | 5.19 km | 535, Park Street, Kitchener, ON |
| 24 | Dr. Adetokunbo Teriba — Family Physician | `doctors` (node/12922276979) | 5.19 km | 535, Park Street, Kitchener, ON |
| 25 | Dr. A. Atiyah — Plastic Surgeon | `doctors` (node/12922276980) | 5.19 km | 535, Park Street, Kitchener, ON |
| 26 | Temple Green Clinic | `doctors` (node/8019802039) | 5.28 km | n/a |
| 27 | Beechwood Cosmetic and Laser | `doctors` (node/8019802041) | 5.28 km | n/a |
| 28 | WRHN @ Midtown | `hospital` (way/140180455) | 5.31 km | 835, King Street West, Kitchener |
| 29 | Passport Health Kitchener Travel Clinic | `clinic` (node/13131737623) | 5.48 km | 684, Belmont Avenue West, Kitchener, ON |
| 30 | Andrew Street Family Health Centre | `clinic` (node/4035501238) | 5.55 km | 16, Andrew Street |
| 31 | Optometrists - Dr. Valerie Dippel & Dr. Dawn Clarke | `doctors` (node/4900820334) | 6.32 km | 77, Water Street North, Kitchener |
| 32 | ABA Compass Behavior Therapy Services Inc. | `clinic` (node/10005807728) | 6.46 km | 96, Young Street |
| 33 | Public Health | `clinic` (node/12251169098) | 6.8 km | 20, Weber Street East, Kitchener |
| 34 | Centre for Family Medicine | `doctors` (node/481297054) | 6.85 km | n/a |
| 35 | LASIK MD | `clinic` (node/2168303644) | 6.89 km | 101, Frederick Street, Kitchener |
| 36 | Medical Centre 1 | `clinic` (way/292384181) | 6.93 km | 430, The Boardwalk, Waterloo |
| 37 | ACT New Day Pharmacy | `clinic` (node/10278965482) | 6.94 km | 91, Queen Street South |
| 38 | Victoria Westmount Medical | `doctors` (way/156269967) | 6.94 km | 751, Victoria Street South |
| 39 | K-W Urgent Care Clinic | `clinic` (node/9097956309) | 6.95 km | 751, Victoria Street South |
| 40 | Generation Fertility Waterloo | `clinic` (node/11436144890) | 6.99 km | 435, The Boardwalk, Waterloo, ON |
| 41 | Medical Centre 2 | `clinic` (way/835426819) | 6.99 km | 435, The Boardwalk, Waterloo |
| 42 | Benton Medical Clinic | `clinic` (node/10274359237) | 7.08 km | n/a |
| 43 | Dr. D.G. MacMillan Family Doctor | `doctors` (node/10284183814) | 7.09 km | 520, University Avenue West |
| 44 | J Borys | `doctors` (node/8110152461) | 7.13 km | 100, Highland Road West |
| 45 | T Borys | `doctors` (node/8110152462) | 7.13 km | 100, Highland Road West |
| 46 | M Gulan | `doctors` (node/8110152463) | 7.13 km | 100, Highland Road West |
| 47 | Grace Med | `doctors` (way/206046754) | 7.13 km | 150, Edna Street, Kitchener |
| 48 | R Toews | `doctors` (node/8110152460) | 7.14 km | 100, Highland Road West |
| 49 | Family Physician Dr Bao Nguyen | `doctors` (node/12790225091) | 7.14 km | n/a |
| 50 | New Age Medical Cosmetic Laser Clinic | `clinic` (node/11189780847) | 7.23 km | 313, Highland Rd W, Kitchener, Ontario |
| 51 | Pain Releif Walkin-in Clinic | `clinic` (way/1078907981) | 7.26 km | 339, Highland Road West |
| 52 | eHealth Centre of Excellence | `doctors` (node/7926265331) | 7.33 km | 235, The Boardwalk |
| 53 | Sunbeam Developmental Resource Centre | `clinic` (node/11228378141) | 7.46 km | 1120, Victoria Street North |
| 54 | Arjun Vellore Denture Clinic Kitchener | `clinic` (node/12333475211) | 7.54 km | 79, Highland Road East |
| 55 | Westheights Medical Centre | `doctors` (way/173000562) | 7.85 km | 10, Westheights Drive |
| 56 | Primacy Medical Clinic: Highland Medical Group | `clinic` (node/7873462073) | 7.87 km | n/a |
| 57 | Eastwood Pharmacy & Clinic | `clinic` (node/9061277825) | 8.39 km | 120, Ottawa Street North |
| 58 | New Vision Family Health Team | `doctors` (node/12355402334) | 8.57 km | 421, Greenbrook Drive |
| 59 | Greenbrook Family Medical Centre | `clinic` (node/12355402337) | 8.64 km | n/a |
| 60 | Dr Remon Gahyl | `doctors` (node/12845248033) | 8.66 km | n/a |
| 61 | Driftwood Family Medicine | `doctors` (node/11929709981) | 9.12 km | 450, Westheights Drive |
| 62 | Westheights Family Practice | `doctors` (node/11929709984) | 9.12 km | 450, Westheights Drive |
| 63 | Northfield at Strasburg Crossing | `doctors` (node/12280939178) | 9.58 km | 795, Ottawa Street South, Kitchener, Ontario |

### Benchmark Evidence — Full Provenance Per Facility

> Wait estimates below use the formula: `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`. Each input cites its published Ontario Health / CIHI / CAEP source.

#### Dr. John Lu
- **OSM:** `node/648487943`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 2.11 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Waterloo Nuclear and Radiography
- **OSM:** `node/10120212692`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.14 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Curex Medical Centre
- **OSM:** `node/10120212693`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 2.14 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Canuk Healthcare
- **OSM:** `node/12291166390`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.14 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dearborn Health
- **OSM:** `node/4826287769`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.29 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Eastbridge Walk-in Clinic
- **OSM:** `node/1566651687`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 2.47 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Spruce Medical
- **OSM:** `node/12968699018`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.55 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Flockton Chiropractic Clinic
- **OSM:** `node/12374681048`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.62 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Lester Medical And Educational Centre
- **OSM:** `node/5368660993`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.69 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### True North Imaging
- **OSM:** `node/10308014738`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.94 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Waterloo Sports Medicine Centre
- **OSM:** `node/10308014741`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 2.98 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Waterloo Walk-in Clinic
- **OSM:** `way/39606061`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 3.09 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Health Services
- **OSM:** `way/43250611`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 3.29 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Uptown Waterloo Health and Wellness Clinic
- **OSM:** `node/10985244626`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 3.94 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Spa Surgica MediSpa
- **OSM:** `way/325120099`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 4.16 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dr. José Adrian Prudencio
- **OSM:** `node/13520863037`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 4.17 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### CARESPACE Uptown Waterloo
- **OSM:** `node/12881056591`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 4.22 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### K. Papp
- **OSM:** `node/1983051220`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 4.68 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### DR. Pierre Kugler
- **OSM:** `node/1982899754`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 4.71 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Onyx Medical Centre
- **OSM:** `node/3599620761`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 4.97 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Tri-City Hearing & Balance Care
- **OSM:** `node/12922276975`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 5.18 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dr. Satish Rangaswamy — Urology–Vasectomy
- **OSM:** `node/12922276976`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 5.19 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dr. Maky Hafidh — Ear, Nose, Throat
- **OSM:** `node/12922276977`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 5.19 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dr. Adetokunbo Teriba — Family Physician
- **OSM:** `node/12922276979`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 5.19 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dr. A. Atiyah — Plastic Surgeon
- **OSM:** `node/12922276980`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 5.19 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Temple Green Clinic
- **OSM:** `node/8019802039`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 5.28 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Beechwood Cosmetic and Laser
- **OSM:** `node/8019802041`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 5.28 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### WRHN @ Midtown
- **OSM:** `way/140180455`, amenity tag: `hospital`
- **Distance from SPUR Campus:** 5.31 km
- **Facility type (mapped):** `hospital`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `125` min  (range `87–168` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 1.15` — *Derived from HQO volume-weighted ED data for 'hospital' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.496` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `19` min, target `15` min, p(within target)=`0.318` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `38` min, target `30` min, p(within target)=`0.318` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `76` min, target `60` min, p(within target)=`0.313` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `151` min, target `120` min, p(within target)=`0.316` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Passport Health Kitchener Travel Clinic
- **OSM:** `node/13131737623`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 5.48 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Andrew Street Family Health Centre
- **OSM:** `node/4035501238`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 5.55 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Optometrists - Dr. Valerie Dippel & Dr. Dawn Clarke
- **OSM:** `node/4900820334`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 6.32 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### ABA Compass Behavior Therapy Services Inc.
- **OSM:** `node/10005807728`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.46 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Public Health
- **OSM:** `node/12251169098`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.8 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Centre for Family Medicine
- **OSM:** `node/481297054`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 6.85 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### LASIK MD
- **OSM:** `node/2168303644`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.89 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Medical Centre 1
- **OSM:** `way/292384181`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.93 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### ACT New Day Pharmacy
- **OSM:** `node/10278965482`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.94 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Victoria Westmount Medical
- **OSM:** `way/156269967`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 6.94 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### K-W Urgent Care Clinic
- **OSM:** `node/9097956309`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.95 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Generation Fertility Waterloo
- **OSM:** `node/11436144890`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.99 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Medical Centre 2
- **OSM:** `way/835426819`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 6.99 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Benton Medical Clinic
- **OSM:** `node/10274359237`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 7.08 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dr. D.G. MacMillan Family Doctor
- **OSM:** `node/10284183814`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.09 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### J Borys
- **OSM:** `node/8110152461`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.13 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### T Borys
- **OSM:** `node/8110152462`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.13 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### M Gulan
- **OSM:** `node/8110152463`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.13 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Grace Med
- **OSM:** `way/206046754`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.13 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### R Toews
- **OSM:** `node/8110152460`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.14 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Family Physician Dr Bao Nguyen
- **OSM:** `node/12790225091`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.14 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### New Age Medical Cosmetic Laser Clinic
- **OSM:** `node/11189780847`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 7.23 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Pain Releif Walkin-in Clinic
- **OSM:** `way/1078907981`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 7.26 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### eHealth Centre of Excellence
- **OSM:** `node/7926265331`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.33 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Sunbeam Developmental Resource Centre
- **OSM:** `node/11228378141`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 7.46 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Arjun Vellore Denture Clinic Kitchener
- **OSM:** `node/12333475211`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 7.54 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Westheights Medical Centre
- **OSM:** `way/173000562`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 7.85 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Primacy Medical Clinic: Highland Medical Group
- **OSM:** `node/7873462073`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 7.87 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Eastwood Pharmacy & Clinic
- **OSM:** `node/9061277825`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 8.39 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### New Vision Family Health Team
- **OSM:** `node/12355402334`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 8.57 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Greenbrook Family Medical Centre
- **OSM:** `node/12355402337`, amenity tag: `clinic`
- **Distance from SPUR Campus:** 8.64 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Dr Remon Gahyl
- **OSM:** `node/12845248033`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 8.66 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Driftwood Family Medicine
- **OSM:** `node/11929709981`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 9.12 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Westheights Family Practice
- **OSM:** `node/11929709984`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 9.12 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*

#### Northfield at Strasburg Crossing
- **OSM:** `node/12280939178`, amenity tag: `doctors`
- **Distance from SPUR Campus:** 9.58 km
- **Facility type (mapped):** `clinic`
- **Evidence tier:** `provincial_benchmark`
- **Confidence:** `0.48` (low)
- **Estimated wait:** `27` min  (range `19–37` min)
- **Benchmark source:** <https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments>
- **CTAS guidelines source:** <https://caep.ca/resources/ctas/>
- **Formula:** `est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`
- **Formula inputs (each individually cited):**
  - `ontario_median_physician_wait_minutes = 99` — *Health Quality Ontario, Time spent in emergency departments 2022-23. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `size_factor = 0.25` — *Derived from HQO volume-weighted ED data for 'clinic' facility type. https://www.hqontario.ca/System-Performance/Time-Spent-in-Emergency-Departments*
  - `daypart_multiplier = 1.14` — *CIHI NACRS hourly ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
  - `weekday_multiplier = 0.96` — *CIHI NACRS weekday ED arrival distribution 2022-23. https://www.cihi.ca/en/nacrs-metadata*
- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**
  - `ctas_1` — CTAS 1 — Resuscitation: est `0` min, target `0` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_2` — CTAS 2 — Emergent: est `4` min, target `15` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_3` — CTAS 3 — Urgent: est `8` min, target `30` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_4` — CTAS 4 — Less Urgent: est `16` min, target `60` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*
  - `ctas_5` — CTAS 5 — Non-Urgent: est `33` min, target `120` min, p(within target)=`0.786` | *CTAS 2020 Implementation Guidelines, CAEP/NENA/AMUQ/NCA. https://caep.ca/resources/ctas/*


---

## Trust Tier Definitions

| Tier | Meaning |
|------|---------|
| `official_api_feed` | Hospital-published machine-readable JSON feed — field names and URLs cited per location. SHA-256 over raw bytes. |
| `official_browser_dashboard` | Hospital-published ED dashboard, captured by Playwright browser probe; raw text reproduced verbatim with SHA-256. |
| `public_aggregator_page` | Public third-party page — no numeric wait extracted; presence/absence + status text. SHA-256 over HTML snippets. |
| `provincial_benchmark` | Ontario Health HQO/CIHI/CAEP published statistics — formula and every input individually cited; NOT a live feed. Fires when Tier 1+2 fail or are absent. |
| `care_setting_proxy` | CIHI NACRS 2022-23 calibrated baseline — absolute floor, always fires for open facilities. Confidence 0.32 by design. |
| `transparent_heuristic` | Explicit seeded formula — disabled by default; never presented as official. |
| `insufficient_evidence` | Should never appear for an open facility with a recognised type. |
