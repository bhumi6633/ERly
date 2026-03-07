# ERly Wait Time Evidence Report

Generated at: `2026-03-07T21:41:41+00:00`

## Reproduction

```bash
cd /Users/vishnu/Documents/Triage/HackCanada2026/backend
./venv/bin/python tests/test_wait_times.py
./venv/bin/python -m wait_times.judge_report
```

## Test Output

```text
test_fusion_prefers_official_primary_wait (test_wait_times.WaitTimeFusionTests.test_fusion_prefers_official_primary_wait) ... ok
test_parse_medimap_status (test_wait_times.WaitTimeSourceParsingTests.test_parse_medimap_status) ... ok
test_parse_thp_methodology (test_wait_times.WaitTimeSourceParsingTests.test_parse_thp_methodology) ... ok
test_parse_thp_stats (test_wait_times.WaitTimeSourceParsingTests.test_parse_thp_stats) ... ok
test_parse_uhn_dashboard_text (test_wait_times.WaitTimeSourceParsingTests.test_parse_uhn_dashboard_text) ... ok
test_parse_uhn_methodology (test_wait_times.WaitTimeSourceParsingTests.test_parse_uhn_methodology) ... ok

----------------------------------------------------------------------
Ran 6 tests in 0.002s

OK

PASSED=True  RUN=6
```

## Live Demo Terminal Output

```text
Database already seeded — skipping. Use --reset to wipe and reseed.
ERly wait-time evidence demo
Live fetches + source proofs + strict evidence gating
generated_at=2026-03-07T21:41:41+00:00

Location                           | Source                   | Evidence                 | Wait       | Range           | Conf   | Updated            
------------------------------------------------------------------------------------------------------------------------------------------------------
Credit Valley Hospital             | official_hospital_feed   | official_api_feed        | 204m       | 156-204m        | 0.94   | 2026-03-07 21:40   
Trillium Health Partners — Mississ | official_hospital_feed   | official_api_feed        | 84m        | 54-84m          | 0.94   | 2026-03-07 21:40   
Bay-College Medical Centre         | public_aggregator        | public_aggregator_page   | closed     | n/a             | 0.58   | 2026-03-07 21:41   
Toronto General Hospital           | official_hospital_feed   | official_browser_dashboa | 165m       | 165-194m        | 0.91   | 2026-03-07 15:44   

========================================================================================
Credit Valley Hospital (hospital)
========================================================================================
location_id=17  address=2200 Eglinton Ave W, Mississauga
result={
  "source_kind": "official_hospital_feed",
  "source_name": "Credit Valley Hospital ED official feed",
  "status": "reported",
  "overall_wait_minutes": 204,
  "overall_wait_range": [
    156,
    204
  ],
  "confidence_score": 0.94,
  "confidence_label": "high",
  "queue_length": 62,
  "occupancy_probability": 0.855,
  "diversion_probability": 0.245,
  "last_reported_at": "2026-03-07T21:40:00"
}

[source:official_hospital_feed]
  name=Credit Valley Hospital ED official feed
  status=reported
  trust_verdict=official exact feed
  confidence=0.940
  reported_at=2026-03-07T16:40:09.213173
  wait=204 range=[156, 204]
  evidence_tier=official_api_feed
  source_url=https://edwt-prd.thp.ca/waittimes/stats/CVH
  methodology_url=https://www.thp.ca/emergency/A/visit.html
  source_fingerprint_sha256=862befbaf02ba6608ab41ecd5d72d32610d985187f6b07b441a0cc3e86a5088e
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
  "averageTimeToSeeDoctor": 2.6,
  "averageTimeToSeeDoctor80th": 3.4,
  "patientsWaitingToSeeDoctor": 62,
  "activePatients": 147,
  "activeNoBedAdmits": 36,
  "lastUpdated": "2026-03-07T16:40:09.2131733-05:00",
  "hour15_prediction": 2.6
}

[subcases]
  immediate_emergency: wait=None range=[None, None] target=10 p_within_target=1.000 confidence=0.940 notes=Patients are seen based on their medical condition and the urgency of their situation (e.g., chest pain is prioritized over a minor cut). Posted wait times are estimates and may change.
  predicted_current_hour: wait=120 range=[105, 135] target=90 p_within_target=0.420 confidence=0.940 notes=The Wait Time Dashboard provides real-time and predicted data (based on last 30 days of data) that will help patients have a better understanding of the wait time to see a doctor after being triaged (initial assessment with a nurse). Wait times are shown for both the Credit Valley Hospital and Mississauga Hospital EDs.
  standard_er: wait=204 range=[156, 204] target=120 p_within_target=0.350 confidence=0.940 notes=Definition: 80% of patients will be seen by a doctor within this time period.
  low_acuity_non_urgent: wait=235 range=[156, 255] target=180 p_within_target=0.220 confidence=0.850 notes=Heuristic uplift above the official 80th percentile because the hospital states sicker patients may be seen sooner than the dashboard time.

========================================================================================
Trillium Health Partners — Mississauga (hospital)
========================================================================================
location_id=18  address=100 Queensway W, Mississauga
result={
  "source_kind": "official_hospital_feed",
  "source_name": "Mississauga Hospital ED official feed",
  "status": "reported",
  "overall_wait_minutes": 84,
  "overall_wait_range": [
    54,
    84
  ],
  "confidence_score": 0.94,
  "confidence_label": "high",
  "queue_length": 8,
  "occupancy_probability": 0.764,
  "diversion_probability": 0.173,
  "last_reported_at": "2026-03-07T21:40:00"
}

[source:official_hospital_feed]
  name=Mississauga Hospital ED official feed
  status=reported
  trust_verdict=official exact feed
  confidence=0.940
  reported_at=2026-03-07T16:40:09.213173
  wait=84 range=[54, 84]
  evidence_tier=official_api_feed
  source_url=https://edwt-prd.thp.ca/waittimes/stats/MH
  methodology_url=https://www.thp.ca/emergency/A/visit.html
  source_fingerprint_sha256=cadb827662ba89be49752b79c12682a51c6bcdfa468b5dd28eeb6e235e0a319b
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
  "averageTimeToSeeDoctor": 0.9,
  "averageTimeToSeeDoctor80th": 1.4,
  "patientsWaitingToSeeDoctor": 8,
  "activePatients": 81,
  "activeNoBedAdmits": 14,
  "lastUpdated": "2026-03-07T16:40:09.2131733-05:00",
  "hour15_prediction": 1.4
}

[subcases]
  immediate_emergency: wait=None range=[None, None] target=10 p_within_target=1.000 confidence=0.940 notes=Patients are seen based on their medical condition and the urgency of their situation (e.g., chest pain is prioritized over a minor cut). Posted wait times are estimates and may change.
  predicted_current_hour: wait=78 range=[63, 93] target=90 p_within_target=1.000 confidence=0.940 notes=The Wait Time Dashboard provides real-time and predicted data (based on last 30 days of data) that will help patients have a better understanding of the wait time to see a doctor after being triaged (initial assessment with a nurse). Wait times are shown for both the Credit Valley Hospital and Mississauga Hospital EDs.
  standard_er: wait=84 range=[54, 84] target=120 p_within_target=1.000 confidence=0.940 notes=Definition: 80% of patients will be seen by a doctor within this time period.
  low_acuity_non_urgent: wait=97 range=[54, 105] target=180 p_within_target=0.580 confidence=0.850 notes=Heuristic uplift above the official 80th percentile because the hospital states sicker patients may be seen sooner than the dashboard time.

========================================================================================
Bay-College Medical Centre (urgent_care)
========================================================================================
location_id=11  address=777 Bay St, Toronto
result={
  "source_kind": "public_aggregator",
  "source_name": "Medimap public page",
  "status": "closed",
  "overall_wait_minutes": null,
  "overall_wait_range": [
    null,
    null
  ],
  "confidence_score": 0.58,
  "confidence_label": "low",
  "queue_length": 0,
  "occupancy_probability": 0.2,
  "diversion_probability": 0.0,
  "last_reported_at": "2026-03-07T21:41:00"
}

[source:public_aggregator]
  name=Medimap public page
  status=closed
  trust_verdict=public alias match
  confidence=0.580
  reported_at=2026-03-07T21:41:00
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

[subcases]
  clinic_public_status: wait=None range=[None, None] target=0 p_within_target=0.000 confidence=0.580 notes=Opens 8am Mon

========================================================================================
Toronto General Hospital (hospital)
========================================================================================
location_id=1  address=200 Elizabeth St, Toronto
result={
  "source_kind": "official_hospital_feed",
  "source_name": "Toronto General Hospital official dashboard",
  "status": "reported",
  "overall_wait_minutes": 165,
  "overall_wait_range": [
    165,
    194
  ],
  "confidence_score": 0.91,
  "confidence_label": "high",
  "queue_length": 20,
  "occupancy_probability": 0.786,
  "diversion_probability": 0.062,
  "last_reported_at": "2026-03-07T15:44:00"
}

[source:official_hospital_feed]
  name=Toronto General Hospital official dashboard
  status=reported
  trust_verdict=official browser dashboard
  confidence=0.910
  reported_at=2026-03-07T15:44:00
  wait=165 range=[165, 194]
  evidence_tier=official_browser_dashboard
  source_url=https://app.powerbi.com/view?r=eyJrIjoiYjdmYTA2ZGEtZjIyOS00MzZhLThjMzQtNmIxYjgyODA3NmI2IiwidCI6ImQ5MGRjZTA1LTA2M2QtNDE0Zi1hZWZlLWMyOTJmZjE4ZDhiMCJ9
  methodology_url=https://www.uhn.ca/PatientsFamilies/Visit_UHN/Emergency/Pages/ED_wait_times.aspx
  source_fingerprint_sha256=dad4ab8744ff9b716b087c9410efec5f194a14ad7d20f14f2cfa874aa0ac3819
  definition_excerpt=Official UHN dashboard metric: The majority of patients will be seen within.
  methodology_excerpt=The wait time information presented on this webpage is updated every 1 hour and may vary from the real-time information displayed at the Emergency Department.
  urgency_excerpt=Immediate life-threatening patients are triaged ahead of posted dashboard times.
  public_status_text=None
  wait_card_text=None
  match_strategy=exact
  screenshot_path=/Users/vishnu/Documents/Triage/HackCanada2026/backend/wait_times/evidence_artifacts/uhn-dashboard-2026-03-07T21.png
  formula_explanation=None
  formula_inputs=null

[evidence:dashboard_text]
  Toronto General Hospital Number of Patients 02:45 hours The majority of patients will be seen within: 20 Waiting 35 Being Treated Average Wait Time to See a Provider Last updated at: 3:14 hours 3/07/26 3:44 PM

[subcases]
  immediate_emergency: wait=None range=[None, None] target=10 p_within_target=1.000 confidence=0.910 notes=Immediate life-threatening triage cases are prioritized ahead of posted dashboard wait times.
  majority_seen_within: wait=165 range=[165, 165] target=180 p_within_target=1.000 confidence=0.910 notes=Official UHN dashboard metric shown to arriving ED patients.
  standard_er: wait=194 range=[165, 194] target=180 p_within_target=0.280 confidence=0.890 notes=The wait time information presented on this webpage is updated every 1 hour and may vary from the real-time information displayed at the Emergency Department.
  low_acuity_non_urgent: wait=217 range=[165, 237] target=240 p_within_target=0.620 confidence=0.830 notes=Heuristic uplift above the official dashboard because lower-acuity patients are typically deprioritized behind sicker arrivals.
```

## Metric Provenance

### Credit Valley Hospital
- Headline source: `official_hospital_feed`
- Evidence tier: `official_api_feed`
- Match strategy: `exact`
- Wait headline: `204` minutes, range `156-204`
- Queue length headline: `62`
- Occupancy probability headline: `0.855`
- Diversion probability headline: `0.245`
- Source fingerprint: `862befbaf02ba6608ab41ecd5d72d32610d985187f6b07b441a0cc3e86a5088e`
- Wait source field: `averageTimeToSeeDoctor80th` from `https://edwt-prd.thp.ca/waittimes/stats/CVH`
- Queue source field: `patientsWaitingToSeeDoctor=62`
- Occupancy derivation: `activePatients / (activePatients + 25)` with `activePatients=147`
- Diversion derivation: `activeNoBedAdmits / activePatients` with `activeNoBedAdmits=36`
- Methodology source: `https://www.thp.ca/emergency/A/visit.html`

```json
{
  "averageTimeToSeeDoctor": 2.6,
  "averageTimeToSeeDoctor80th": 3.4,
  "patientsWaitingToSeeDoctor": 62,
  "activePatients": 147,
  "activeNoBedAdmits": 36,
  "lastUpdated": "2026-03-07T16:40:09.2131733-05:00"
}
```
### Trillium Health Partners — Mississauga
- Headline source: `official_hospital_feed`
- Evidence tier: `official_api_feed`
- Match strategy: `exact`
- Wait headline: `84` minutes, range `54-84`
- Queue length headline: `8`
- Occupancy probability headline: `0.764`
- Diversion probability headline: `0.173`
- Source fingerprint: `cadb827662ba89be49752b79c12682a51c6bcdfa468b5dd28eeb6e235e0a319b`
- Wait source field: `averageTimeToSeeDoctor80th` from `https://edwt-prd.thp.ca/waittimes/stats/MH`
- Queue source field: `patientsWaitingToSeeDoctor=8`
- Occupancy derivation: `activePatients / (activePatients + 25)` with `activePatients=81`
- Diversion derivation: `activeNoBedAdmits / activePatients` with `activeNoBedAdmits=14`
- Methodology source: `https://www.thp.ca/emergency/A/visit.html`

```json
{
  "averageTimeToSeeDoctor": 0.9,
  "averageTimeToSeeDoctor80th": 1.4,
  "patientsWaitingToSeeDoctor": 8,
  "activePatients": 81,
  "activeNoBedAdmits": 14,
  "lastUpdated": "2026-03-07T16:40:09.2131733-05:00"
}
```
### Bay-College Medical Centre
- Headline source: `public_aggregator`
- Evidence tier: `public_aggregator_page`
- Match strategy: `manual_alias`
- Wait headline: `None` minutes, range `None-None`
- Queue length headline: `0`
- Occupancy probability headline: `0.2`
- Diversion probability headline: `0.0`
- Source fingerprint: `8470b73f587b2493517a24082c7fa19028633261f6b096dc8660779a3ac8eaee`
- Public status text: `Opens 8am Mon`
- Wait-card text: `Opens 8am Mon`
- No numeric queue or wait was exposed by the source; headline wait is suppressed when closed.

```text
Bay College Medical & Lockwood Diagnostic
Opens 8am Mon
Wait TimeOpens 8am Mon
```
### Toronto General Hospital
- Headline source: `official_hospital_feed`
- Evidence tier: `official_browser_dashboard`
- Match strategy: `exact`
- Wait headline: `165` minutes, range `165-194`
- Queue length headline: `20`
- Occupancy probability headline: `0.786`
- Diversion probability headline: `0.062`
- Source fingerprint: `dad4ab8744ff9b716b087c9410efec5f194a14ad7d20f14f2cfa874aa0ac3819`
- Wait source field: dashboard text `The majority of patients will be seen within: 165 minutes`
- Average wait source field: dashboard text `Average Wait Time to See a Provider: 194 minutes`
- Queue source field: dashboard text `Waiting 20`
- Occupancy derivation: `(waiting + being_treated) / 70` with `being_treated=35`
- Diversion derivation: `(waiting - 15) / 80`
- Dashboard source: `https://app.powerbi.com/view?r=eyJrIjoiYjdmYTA2ZGEtZjIyOS00MzZhLThjMzQtNmIxYjgyODA3NmI2IiwidCI6ImQ5MGRjZTA1LTA2M2QtNDE0Zi1hZWZlLWMyOTJmZjE4ZDhiMCJ9`
- Methodology source: `https://www.uhn.ca/PatientsFamilies/Visit_UHN/Emergency/Pages/ED_wait_times.aspx`

```text
Toronto General Hospital Number of Patients 02:45 hours The majority of patients will be seen within: 20 Waiting 35 Being Treated Average Wait Time to See a Provider Last updated at: 3:14 hours 3/07/26 3:44 PM
```

![Dashboard evidence](/Users/vishnu/Documents/Triage/HackCanada2026/backend/wait_times/evidence_artifacts/uhn-dashboard-2026-03-07T21.png)

## Trust Rules

- `official_api_feed`: hospital-published machine-readable feed.
- `official_browser_dashboard`: hospital-published dashboard, captured by browser probe and parsed into text.
- `public_aggregator_page`: public page evidence only; exactness depends on match strategy.
- `transparent_heuristic`: explicit fallback formula, disabled by default and never presented as official.
- `insufficient_evidence`: no decision-grade wait source is configured; the location remains eligible, but wait does not contribute to ranking.
