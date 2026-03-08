# ERly API Test Outputs

Generated against `http://localhost:8000` from coordinates 43.49, -80.54 (Kitchener-Waterloo, ON).

| File | Endpoint | Notes |
|------|----------|-------|
| `health.json` | `GET /health` | Service health check |
| `health_db.json` | `GET /health/db` | Database connectivity check |
| `locations.json` | `GET /locations/` | Full seeded location list |
| `care_options_er.json` | `GET /care-options/?types=hospital,er&radius_km=30` | 5 ER/hospital facilities returned, all `status: "estimated"` with wait times |
| `care_options_walkin.json` | `GET /care-options/?types=urgent_care,clinic&radius_km=30` | Walk-in/urgent care facilities |
| `wait_times.json` | `GET /wait-times/` | All wait-time snapshots |

## Key Findings

- `/care-options/` returns `status: "estimated"` (not `"closed"`) for all open facilities — closed ones are filtered out client-side
- Wait times use `source_kind: "provincial_benchmark"` (Tier 3 CIHI proxy) — confidence scores ~0.4–0.5
- `total_time_minutes` = `travel_time_minutes` + `wait_time_minutes` — always populated for open facilities
- 5 ER/hospital facilities within 30km of Kitchener-Waterloo
