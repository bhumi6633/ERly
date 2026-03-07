from __future__ import annotations

import io
import json
import math
import os
import types as _types
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = ROOT / "wait_times" / "evidence_artifacts"
REPORT_PATH = ARTIFACT_DIR / "wait_time_judge_report.md"
DB_PATH = ARTIFACT_DIR / "judge_report.db"

# ── Base location for discovery (used in Section B) ───────────────────────────
BASE_LOCATION = {
    "name": "SPUR Campus – Spur Innovation Centre",
    "address": "2240 University Ave, Waterloo, ON N2K 0G3",
    "lat": 43.4997,
    "lng": -80.5392,
}

_OSM_TYPE_MAP = {
    "hospital": "hospital",
    "clinic": "clinic",
    "doctors": "clinic",
    "urgent_care": "urgent_care",
    "pharmacy": "pharmacy",
}


def _configure_environment() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
    os.environ["WAIT_TIME_EVIDENCE_DIR"] = str(ARTIFACT_DIR)


_configure_environment()

import httpx  # noqa: E402

from database import Base, SessionLocal, engine  # noqa: E402
import models  # noqa: F401,E402
import wait_times.models  # noqa: F401,E402
from wait_times.demo import DEMO_LOCATIONS, run_demo  # noqa: E402
from wait_times.providers import ProvincialBenchmarkProvider, confidence_label  # noqa: E402
from wait_times.repository import get_latest_snapshots, list_care_locations  # noqa: E402


def _make_loc_stub(
    name: str,
    facility_type: str,
    lat: float,
    lon: float,
    address: str = "",
) -> _types.SimpleNamespace:
    """Minimal stand-in for a SQLAlchemy CareLocation — safe to pass to providers."""
    return _types.SimpleNamespace(
        id=0,
        name=name,
        type=facility_type,
        latitude=lat,
        longitude=lon,
        address=address,
        city="Waterloo, ON",
        is_open_24_7=(facility_type in ("hospital", "er")),
        opening_time=None,
        closing_time=None,
        accepts_ambulance=(facility_type in ("hospital", "er")),
        has_emergency_department=(facility_type in ("hospital", "er")),
        specialties=[],
    )


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return r * 2 * math.asin(math.sqrt(a))


def _query_overpass_nearby(lat: float, lng: float, radius_metres: int = 10_000) -> list[dict]:
    query = (
        f"[out:json][timeout:20];("
        f'node["amenity"~"hospital|clinic|doctors"](around:{radius_metres},{lat},{lng});'
        f'way["amenity"~"hospital|clinic|doctors"](around:{radius_metres},{lat},{lng});'
        f'node["healthcare"~"urgent_care"](around:{radius_metres},{lat},{lng});'
        f'way["healthcare"~"urgent_care"](around:{radius_metres},{lat},{lng});'
        f");out center tags;"
    )
    try:
        resp = httpx.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query},
            timeout=25.0,
        )
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
        results = []
        for elem in elements:
            tags = elem.get("tags", {})
            name = tags.get("name") or tags.get("operator")
            if not name:
                continue
            amenity = tags.get("amenity") or tags.get("healthcare") or "clinic"
            facility_type = _OSM_TYPE_MAP.get(amenity, "clinic")
            elem_lat = elem.get("lat") or (elem.get("center") or {}).get("lat")
            elem_lon = elem.get("lon") or (elem.get("center") or {}).get("lon")
            if elem_lat is None or elem_lon is None:
                continue
            dist_km = _haversine_km(lat, lng, elem_lat, elem_lon)
            addr = ", ".join(
                filter(
                    None,
                    [
                        tags.get("addr:housenumber"),
                        tags.get("addr:street"),
                        tags.get("addr:city"),
                        tags.get("addr:province"),
                    ],
                )
            )
            results.append(
                {
                    "name": name,
                    "type": facility_type,
                    "lat": elem_lat,
                    "lng": elem_lon,
                    "dist_km": round(dist_km, 2),
                    "osm_id": elem.get("id"),
                    "osm_type": elem.get("type"),
                    "amenity": amenity,
                    "tags": tags,
                    "addr": addr,
                }
            )
        results.sort(key=lambda f: f["dist_km"])
        return results
    except Exception as exc:
        return [{"error": str(exc)}]


def _build_waterloo_section() -> str:
    """Query Overpass for real Waterloo-area facilities; run ProvincialBenchmarkProvider on each."""
    now = datetime.now(timezone.utc).replace(microsecond=0)
    base = BASE_LOCATION
    lat, lng = base["lat"], base["lng"]
    provider = ProvincialBenchmarkProvider()

    lines = [
        "## Section B — Waterloo Region Discovery from SPUR Campus",
        "",
        f"**Base location:** {base['name']}",
        f"**Address:** {base['address']}",
        f"**Coordinates (WGS-84):** `{lat}°N, {lng}°E`",
        f"**Discovery radius:** 10 km  ",
        f"**Discovery method:** OpenStreetMap Overpass API — `overpass-api.de/api/interpreter`",
        f"**Timestamp:** `{now.isoformat()}`",
        "",
        "### Rationale",
        "",
        "For any user location that does not match a known live-adapter registry entry "
        "(THP API, UHN dashboard, Sunnybrook), ERly falls back to the **Ontario Health "
        "Provincial Benchmark Model** using published CIHI/HQO data with full citation chains. "
        "Below, every facility discovered by Overpass within 10 km receives a benchmark-derived "
        "wait estimate with its full formula provenance.",
        "",
    ]

    facilities = _query_overpass_nearby(lat, lng, 10_000)

    if not facilities:
        lines.append("> Overpass returned no results. Check network access.")
        return "\n".join(lines)

    if len(facilities) == 1 and "error" in facilities[0]:
        lines.append(f"> **Overpass error:** `{facilities[0]['error']}`")
        return "\n".join(lines)

    lines.append(f"### {len(facilities)} Facilities Found via OpenStreetMap")
    lines.append("")
    lines.append("| # | Name | OSM type | Distance | Addr |")
    lines.append("|---|------|----------|----------|------|")
    for i, f in enumerate(facilities, 1):
        lines.append(
            f"| {i} | {f['name']} | `{f['amenity']}` ({f['osm_type']}/{f['osm_id']}) "
            f"| {f['dist_km']} km | {f.get('addr') or 'n/a'} |"
        )
    lines.append("")

    lines.append("### Benchmark Evidence — Full Provenance Per Facility")
    lines.append("")
    lines.append(
        "> Wait estimates below use the formula: "
        "`est_wait = ontario_median_physician_wait × size_factor × daypart_multiplier × weekday_multiplier`. "
        "Each input cites its published Ontario Health / CIHI / CAEP source."
    )
    lines.append("")

    for f in facilities:
        if "error" in f:
            continue
        stub = _make_loc_stub(f["name"], f["type"], f["lat"], f["lng"], f.get("addr", ""))
        signal = provider.fetch(stub, now)
        if signal is None:
            lines.append(f"#### {f['name']}")
            lines.append(f"- Facility type `{f['type']}` has no benchmark size factor — skipped.")
            lines.append("")
            continue

        meta = signal.metadata
        conf_lbl = confidence_label(signal.confidence_score)
        lines.extend(
            [
                f"#### {f['name']}",
                f"- **OSM:** `{f['osm_type']}/{f['osm_id']}`, amenity tag: `{f['amenity']}`",
                f"- **Distance from SPUR Campus:** {f['dist_km']} km",
                f"- **Facility type (mapped):** `{f['type']}`",
                f"- **Evidence tier:** `{meta.get('evidence_tier')}`",
                f"- **Confidence:** `{signal.confidence_score}` ({conf_lbl})",
                f"- **Estimated wait:** `{signal.wait_minutes}` min  (range `{signal.wait_min_minutes}–{signal.wait_max_minutes}` min)",
                f"- **Benchmark source:** <{meta.get('benchmark_url')}>",
                f"- **CTAS guidelines source:** <{meta.get('ctas_guidelines_url')}>",
                f"- **Formula:** `{meta.get('formula_explanation')}`",
                "- **Formula inputs (each individually cited):**",
            ]
        )
        for param_name, param_info in (meta.get("formula_inputs") or {}).items():
            if isinstance(param_info, dict):
                lines.append(
                    f"  - `{param_name} = {param_info.get('value')}` — *{param_info.get('source_citation')}*"
                )

        if signal.scenarios:
            lines.append("- **CTAS-level scenarios (published Ontario/CAEP benchmarks):**")
            for sc in signal.scenarios:
                lines.append(
                    f"  - `{sc.scenario_code}` — {sc.label}: "
                    f"est `{sc.wait_minutes}` min, target `{sc.target_minutes}` min, "
                    f"p(within target)=`{sc.probability_within_target}` "
                    f"| *{sc.notes}*"
                )
        lines.append("")

    return "\n".join(lines)


def _run_tests() -> str:
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern="test_wait_times.py")
    stream = io.StringIO()
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    output = stream.getvalue().strip()
    footer = f"\n\nPASSED={result.wasSuccessful()}  RUN={result.testsRun}"
    return output + footer


def _run_demo_capture() -> str:
    stream = io.StringIO()
    with redirect_stdout(stream):
        run_demo()
    return stream.getvalue().strip()


def _primary_record(snapshot):
    if not snapshot.source_records:
        return None, {}
    primary = next(
        (record for record in snapshot.source_records if record.source_kind == snapshot.source_kind),
        snapshot.source_records[0],
    )
    metadata = json.loads(primary.metadata_json) if primary.metadata_json else {}
    return primary, metadata


def _format_metric_provenance(location, snapshot) -> str:
    primary, metadata = _primary_record(snapshot)
    if primary is None:
        return "No source records available."

    source_count = len(snapshot.source_records)
    evidence_tier = metadata.get("evidence_tier")
    lines = [
        f"### {location.name}",
        f"- **Fused headline:** `{snapshot.overall_wait_minutes}` min, "
        f"range `{snapshot.overall_wait_min_minutes}–{snapshot.overall_wait_max_minutes}` min",
        f"- **Active source tiers:** `{source_count}` ({', '.join(r.source_kind for r in snapshot.source_records)})",
        f"- **Primary tier:** `{primary.source_kind}` (confidence `{float(primary.confidence_score):.2f}`)",
        f"- **Evidence tier:** `{evidence_tier}`",
        f"- **Match strategy:** `{metadata.get('match_strategy')}`",
        f"- **Queue length:** `{snapshot.queue_length}` | "
        f"**Occupancy:** `{snapshot.occupancy_probability}` | "
        f"**Diversion:** `{snapshot.diversion_probability}`",
        f"- **Source fingerprint (primary):** `{metadata.get('source_fingerprint_sha256')}`",
    ]

    # ── Per-tier cascade summary (shown whenever multiple sources fire) ────────
    if source_count > 1:
        lines.append("")
        lines.append("#### Active source tiers (all contribute to fused estimate via confidence weighting)")
        for rec in snapshot.source_records:
            rec_meta = json.loads(rec.metadata_json) if rec.metadata_json else {}
            lines.append(
                f"- **`{rec.source_kind}`** | confidence `{float(rec.confidence_score):.2f}` | "
                f"tier `{rec_meta.get('evidence_tier')}` | "
                f"wait `{rec.wait_minutes}` min [`{rec.wait_min_minutes}`–`{rec.wait_max_minutes}`] | "
                f"status `{rec.status}`"
            )

    # ── Primary tier deep provenance ──────────────────────────────────────────
    lines.append("")
    lines.append("#### Primary tier detail")
    if evidence_tier == "official_api_feed":
        lines.extend(
            [
                f"- Wait source field: `averageTimeToSeeDoctor80th` from `{metadata.get('source_url')}`",
                f"- Queue source field: `patientsWaitingToSeeDoctor={metadata.get('patients_waiting')}`",
                f"- Occupancy derivation: `activePatients / (activePatients + 25)` with `activePatients={metadata.get('active_patients')}`",
                f"- Diversion derivation: `activeNoBedAdmits / activePatients` with `activeNoBedAdmits={metadata.get('active_no_bed_admits')}`",
                f"- Methodology source: `{metadata.get('methodology_url')}`",
            ]
        )
    elif evidence_tier == "official_browser_dashboard":
        lines.extend(
            [
                f"- Wait source field: dashboard text `The majority of patients will be seen within: {metadata.get('majority_seen_within_minutes')} minutes`",
                f"- Average wait source field: dashboard text `Average Wait Time to See a Provider: {metadata.get('average_wait_minutes')} minutes`",
                f"- Queue source field: dashboard text `Waiting {metadata.get('patients_waiting')}`",
                f"- Occupancy derivation: `(waiting + being_treated) / 70` with `being_treated={metadata.get('patients_being_treated')}`",
                f"- Diversion derivation: `(waiting - 15) / 80`",
                f"- Dashboard source: `{metadata.get('source_url')}`",
                f"- Methodology source: `{metadata.get('methodology_url')}`",
            ]
        )
    elif evidence_tier == "public_aggregator_page":
        lines.extend(
            [
                f"- Public status text: `{metadata.get('public_status_text')}`",
                f"- Wait-card text: `{metadata.get('wait_card_text')}`",
                "- No numeric queue or wait was exposed by the source; headline wait is suppressed when closed.",
            ]
        )
    elif evidence_tier == "transparent_heuristic":
        lines.extend(
            [
                f"- Formula: `{metadata.get('formula_explanation')}`",
                f"- Formula inputs: `{json.dumps(metadata.get('formula_inputs'), sort_keys=True)}`",
                f"- Queue derivation: estimator based on facility baseline and derived capacity; current headline queue is `{snapshot.queue_length}`.",
                "- This is fallback logic, not a live official feed.",
            ]
        )
    elif evidence_tier == "provincial_benchmark":
        lines.extend(
            [
                "- Model: Ontario Health provincial benchmark model (not a live feed)",
                f"- Benchmark source: `{metadata.get('benchmark_url')}`",
                f"- CTAS guidelines source: `{metadata.get('ctas_guidelines_url')}`",
                f"- Formula: `{metadata.get('formula_explanation')}`",
                f"- Ontario median physician wait (baseline): `{metadata.get('ontario_median_minutes')} minutes`",
                "- Formula inputs (each with source citation):",
            ]
        )
        formula_inputs = metadata.get("formula_inputs") or {}
        for param_name, param_info in formula_inputs.items():
            if isinstance(param_info, dict):
                lines.append(
                    f"  - `{param_name} = {param_info.get('value')}` — {param_info.get('source_citation')}"
                )
        lines.extend(
            [
                f"- Output range: `{metadata.get('range_low')} – {metadata.get('range_high')} minutes`",
                "- No live feed is configured for this location; this estimate is NOT decision-grade.",
            ]
        )
    elif evidence_tier == "care_setting_proxy":
        lines.extend(
            [
                "- Model: ERly CIHI-calibrated care-setting proxy (evidence floor)",
                f"- Calibration source: <{metadata.get('source_url')}>",
                f"- Formula: `{metadata.get('formula_explanation')}`",
                "- Formula inputs (each individually cited):",
            ]
        )
        formula_inputs = metadata.get("formula_inputs") or {}
        for param_name, param_info in formula_inputs.items():
            if isinstance(param_info, dict):
                lines.append(
                    f"  - `{param_name} = {param_info.get('value')}` — {param_info.get('source_citation')}"
                )
        lines.extend(
            [
                "- Confidence: `0.32` (intentionally low — floor signal only)",
                "- This is the absolute evidence floor. A higher-tier source should always be preferred.",
            ]
        )

    raw_payload = metadata.get("raw_payload")
    if raw_payload:
        lines.append("")
        lines.append("```json")
        lines.append(
            json.dumps(
                {
                    "averageTimeToSeeDoctor": raw_payload.get("averageTimeToSeeDoctor"),
                    "averageTimeToSeeDoctor80th": raw_payload.get("averageTimeToSeeDoctor80th"),
                    "patientsWaitingToSeeDoctor": raw_payload.get("patientsWaitingToSeeDoctor"),
                    "activePatients": raw_payload.get("activePatients"),
                    "activeNoBedAdmits": raw_payload.get("activeNoBedAdmits"),
                    "lastUpdated": raw_payload.get("lastUpdated"),
                },
                indent=2,
            )
        )
        lines.append("```")

    raw_dashboard_text = metadata.get("raw_dashboard_text")
    if raw_dashboard_text:
        lines.append("")
        lines.append("```text")
        lines.append(raw_dashboard_text)
        lines.append("```")

    raw_snippets = metadata.get("raw_snippets")
    if raw_snippets:
        lines.append("")
        lines.append("```text")
        lines.extend(raw_snippets)
        lines.append("```")

    screenshot_path = metadata.get("screenshot_path")
    if screenshot_path:
        lines.append("")
        lines.append(f"![Dashboard evidence]({screenshot_path})")

    return "\n".join(lines)


def build_report() -> str:
    if DB_PATH.exists():
        DB_PATH.unlink()

    Base.metadata.create_all(bind=engine)
    test_output = _run_tests()
    demo_output = _run_demo_capture()

    db = SessionLocal()
    try:
        locations = [location for location in list_care_locations(db) if location.name in DEMO_LOCATIONS]
        locations.sort(key=lambda location: DEMO_LOCATIONS.index(location.name))
        snapshots = get_latest_snapshots(db, [location.id for location in locations])
        provenance_sections = [_format_metric_provenance(location, snapshots[location.id]) for location in locations]
    finally:
        db.close()

    waterloo_section = _build_waterloo_section()

    # ── Section B: Waterloo seeded fallback provenance ────────────────────────
    waterloo_names = [
        "Grand River Hospital",
        "Waterloo Walk-in Clinic — University Plaza",
        "UW Campus Health Services",
    ]
    db = SessionLocal()
    try:
        wl_locations = [loc for loc in list_care_locations(db) if loc.name in waterloo_names]
        wl_locations.sort(
            key=lambda l: waterloo_names.index(l.name) if l.name in waterloo_names else 99
        )
        wl_snapshots = get_latest_snapshots(db, [loc.id for loc in wl_locations])
        wl_provenance = [
            _format_metric_provenance(loc, wl_snapshots[loc.id]) for loc in wl_locations
        ]
    finally:
        db.close()

    lines = [
        "# ERly Wait Time Evidence Report",
        "",
        f"Generated at: `{datetime.now(timezone.utc).replace(microsecond=0).isoformat()}`",
        "",
        "---",
        "",
        "## Evidence Cascade Architecture",
        "",
        "ERly uses a **4-tier confidence cascade** to guarantee every open facility always "
        "returns a numeric wait estimate. Higher tiers override lower tiers in the fused signal.",
        "",
        "| Tier | Provider | Confidence | Source |",
        "|------|----------|------------|--------|",
        "| 1 | Official hospital feed (THP API / UHN dashboard / Sunnybrook page) | 0.88–0.94 | Hospital-published endpoint — verified by SHA-256 fingerprint over raw bytes |",
        "| 2 | Public aggregator page (Medimap) | 0.54–0.84 | Public third-party page — open/closed status + wait card text |",
        "| 3 | Ontario Health provincial benchmark (HQO/CIHI/CAEP) | 0.48 | Published Ontario ED statistics with CTAS targets and day/time multipliers — every input individually cited |",
        "| 4 | Care-setting proxy floor (CIHI-calibrated baseline) | 0.32 | ERly FACILITY_BASELINES derived from CIHI NACRS 2022-23 attendance distributions — always fires |",
        "",
        "> **Guarantee:** No open facility returns a null wait time. Tier 4 always fires unless "
        "Tier 1–3 already produced a numeric estimate with higher confidence. The fused output "
        "is a confidence-weighted average across all active tiers.",
        "",
        "---",
        "",
        "## Section A — Live Feed Verification (GTA + Waterloo Seeded)",
        "",
        "> THP locations use hospital-published JSON APIs with SHA-256-fingerprinted payloads. "
        "GTA hospitals without live adapters (Toronto General, Sunnybrook) cascade to Tier 3+4. "
        "Waterloo locations use Tier 3+4 from seeded DB. All 9 locations produce numeric wait times.",
        "",
        "### Reproduction",
        "",
        "```bash",
        "cd /path/to/backend",
        "./venv/bin/python tests/test_wait_times.py   # 8 unit tests",
        "./venv/bin/python -m wait_times.judge_report  # regenerate this file",
        "```",
        "",
        "### Unit Tests",
        "",
        "```text",
        test_output,
        "```",
        "",
        "### Live Demo Run (9 locations — 2 live APIs + 7 benchmark cascade)",
        "",
        "```text",
        demo_output,
        "```",
        "",
        "### Metric Provenance (full cascade per location)",
        "",
        *provenance_sections,
        "",
        "---",
        "",
        "## Section B — Waterloo Region Seeded Fallback (SPUR Campus Pipeline)",
        "",
        "> These locations are in the seeded DB. They demonstrate the **Tier 3+4 benchmark cascade** "
        "that fires for any user at SPUR Campus (2240 University Ave, Waterloo, ON). "
        "No live adapter is registered — the pipeline falls through to provincial benchmark "
        "and CIHI-calibrated baseline, each with full formula provenance.",
        "",
        *wl_provenance,
        "",
        "---",
        "",
        waterloo_section,
        "",
        "---",
        "",
        "## Trust Tier Definitions",
        "",
        "| Tier | Meaning |",
        "|------|---------|",
        "| `official_api_feed` | Hospital-published machine-readable JSON feed — field names and URLs cited per location. SHA-256 over raw bytes. |",
        "| `official_browser_dashboard` | Hospital-published ED dashboard, captured by Playwright browser probe; raw text reproduced verbatim with SHA-256. |",
        "| `public_aggregator_page` | Public third-party page — no numeric wait extracted; presence/absence + status text. SHA-256 over HTML snippets. |",
        "| `provincial_benchmark` | Ontario Health HQO/CIHI/CAEP published statistics — formula and every input individually cited; NOT a live feed. Fires when Tier 1+2 fail or are absent. |",
        "| `care_setting_proxy` | CIHI NACRS 2022-23 calibrated baseline — absolute floor, always fires for open facilities. Confidence 0.32 by design. |",
        "| `transparent_heuristic` | Explicit seeded formula — disabled by default; never presented as official. |",
        "| `insufficient_evidence` | Should never appear for an open facility with a recognised type. |",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    report = build_report()
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote report to {REPORT_PATH}")


if __name__ == "__main__":
    main()
