from __future__ import annotations

import io
import json
import os
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = ROOT / "wait_times" / "evidence_artifacts"
REPORT_PATH = ARTIFACT_DIR / "wait_time_judge_report.md"
DB_PATH = ARTIFACT_DIR / "judge_report.db"


def _configure_environment() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
    os.environ["WAIT_TIME_EVIDENCE_DIR"] = str(ARTIFACT_DIR)


_configure_environment()

from database import Base, SessionLocal, engine  # noqa: E402
import models  # noqa: F401,E402
import wait_times.models  # noqa: F401,E402
from wait_times.demo import DEMO_LOCATIONS, run_demo  # noqa: E402
from wait_times.repository import get_latest_snapshots, list_care_locations  # noqa: E402


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

    evidence_tier = metadata.get("evidence_tier")
    lines = [
        f"### {location.name}",
        f"- Headline source: `{primary.source_kind}`",
        f"- Evidence tier: `{evidence_tier}`",
        f"- Match strategy: `{metadata.get('match_strategy')}`",
        f"- Wait headline: `{snapshot.overall_wait_minutes}` minutes, range `{snapshot.overall_wait_min_minutes}-{snapshot.overall_wait_max_minutes}`",
        f"- Queue length headline: `{snapshot.queue_length}`",
        f"- Occupancy probability headline: `{snapshot.occupancy_probability}`",
        f"- Diversion probability headline: `{snapshot.diversion_probability}`",
        f"- Source fingerprint: `{metadata.get('source_fingerprint_sha256')}`",
    ]

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

    lines = [
        "# ERly Wait Time Evidence Report",
        "",
        f"Generated at: `{datetime.now(timezone.utc).replace(microsecond=0).isoformat()}`",
        "",
        "## Reproduction",
        "",
        "```bash",
        "cd /Users/vishnu/Documents/Triage/HackCanada2026/backend",
        "./venv/bin/python tests/test_wait_times.py",
        "./venv/bin/python -m wait_times.judge_report",
        "```",
        "",
        "## Test Output",
        "",
        "```text",
        test_output,
        "```",
        "",
        "## Live Demo Terminal Output",
        "",
        "```text",
        demo_output,
        "```",
        "",
        "## Metric Provenance",
        "",
        *provenance_sections,
        "",
        "## Trust Rules",
        "",
        "- `official_api_feed`: hospital-published machine-readable feed.",
        "- `official_browser_dashboard`: hospital-published dashboard, captured by browser probe and parsed into text.",
        "- `public_aggregator_page`: public page evidence only; exactness depends on match strategy.",
        "- `transparent_heuristic`: explicit fallback formula, disabled by default and never presented as official.",
        "- `insufficient_evidence`: no decision-grade wait source is configured; the location remains eligible, but wait does not contribute to ranking.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    report = build_report()
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote report to {REPORT_PATH}")


if __name__ == "__main__":
    main()
