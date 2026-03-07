from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Iterable

from database import Base, engine, SessionLocal
import models  # noqa: F401
import wait_times.models  # noqa: F401
from seed import seed
from wait_times.live_sources import THP_LOCATION_REGISTRY
from wait_times.repository import list_care_locations
from wait_times.service import refresh_wait_times_for_locations


DEMO_LOCATIONS = [
    "Credit Valley Hospital",
    "Trillium Health Partners — Mississauga",
    "Bay-College Medical Centre",
    "Toronto General Hospital",
]


def _print_header(title: str) -> None:
    print()
    print("=" * 88)
    print(title)
    print("=" * 88)


def _print_block(title: str, lines: Iterable[str]) -> None:
    print(f"\n[{title}]")
    for line in lines:
        print(f"  {line}")


def _print_summary_table(locations, snapshots) -> None:
    headers = [
        ("Location", 34),
        ("Source", 24),
        ("Evidence", 24),
        ("Wait", 10),
        ("Range", 15),
        ("Conf", 6),
        ("Updated", 19),
    ]
    line = " | ".join(label.ljust(width) for label, width in headers)
    print(line)
    print("-" * len(line))
    for location in locations:
        snapshot = snapshots[location.id]
        metadata = {}
        if snapshot.source_records:
            primary = next(
                (record for record in snapshot.source_records if record.source_kind == snapshot.source_kind),
                snapshot.source_records[0],
            )
            metadata = json.loads(primary.metadata_json) if primary.metadata_json else {}
        wait_text = "closed" if snapshot.status == "closed" else (f"{snapshot.overall_wait_minutes}m" if snapshot.overall_wait_minutes is not None else "n/a")
        range_text = (
            "n/a"
            if snapshot.overall_wait_min_minutes is None or snapshot.overall_wait_max_minutes is None
            else f"{snapshot.overall_wait_min_minutes}-{snapshot.overall_wait_max_minutes}m"
        )
        updated_text = snapshot.last_reported_at.strftime("%Y-%m-%d %H:%M")
        values = [
            location.name[:34].ljust(34),
            snapshot.source_kind[:24].ljust(24),
            str(metadata.get("evidence_tier", "unknown"))[:24].ljust(24),
            wait_text.ljust(10),
            range_text.ljust(15),
            f"{float(snapshot.confidence_score):.2f}".ljust(6),
            updated_text.ljust(19),
        ]
        print(" | ".join(values))


def _trust_verdict(metadata: dict, record_status: str) -> str:
    evidence_tier = metadata.get("evidence_tier")
    match_strategy = metadata.get("match_strategy")
    if evidence_tier == "official_api_feed" and match_strategy == "exact":
        return "official exact feed"
    if evidence_tier == "official_browser_dashboard" and match_strategy == "exact":
        return "official browser dashboard"
    if evidence_tier == "public_aggregator_page" and match_strategy == "manual_alias":
        return "public alias match"
    if evidence_tier == "transparent_heuristic":
        return "transparent heuristic fallback"
    return record_status


def run_demo() -> None:
    Base.metadata.create_all(bind=engine)
    seed(reset=False)

    db = SessionLocal()
    try:
        locations = [location for location in list_care_locations(db) if location.name in DEMO_LOCATIONS]
        locations.sort(key=lambda location: DEMO_LOCATIONS.index(location.name))
        snapshots = refresh_wait_times_for_locations(db, locations, force=True)
        db.commit()

        print("ERly wait-time evidence demo")
        print("Live fetches + source proofs + transparent heuristics")
        print(f"generated_at={datetime.now(timezone.utc).replace(microsecond=0).isoformat()}")
        print()
        _print_summary_table(locations, snapshots)
        for location in locations:
            snapshot = snapshots[location.id]
            _print_header(f"{location.name} ({location.type})")
            print(f"location_id={location.id}  address={location.address}, {location.city}")
            print(
                "result="
                + json.dumps(
                    {
                        "source_kind": snapshot.source_kind,
                        "source_name": snapshot.source_name,
                        "status": snapshot.status,
                        "overall_wait_minutes": snapshot.overall_wait_minutes,
                        "overall_wait_range": [
                            snapshot.overall_wait_min_minutes,
                            snapshot.overall_wait_max_minutes,
                        ],
                        "confidence_score": float(snapshot.confidence_score),
                        "confidence_label": snapshot.confidence_label,
                        "queue_length": snapshot.queue_length,
                        "occupancy_probability": float(snapshot.occupancy_probability),
                        "diversion_probability": float(snapshot.diversion_probability),
                        "last_reported_at": snapshot.last_reported_at.isoformat(),
                    },
                    indent=2,
                )
            )

            for record in snapshot.source_records:
                metadata = json.loads(record.metadata_json) if record.metadata_json else {}
                _print_block(
                    f"source:{record.source_kind}",
                    [
                        f"name={record.source_name}",
                        f"status={record.status}",
                        f"trust_verdict={_trust_verdict(metadata, record.status)}",
                        f"confidence={float(record.confidence_score):.3f}",
                        f"reported_at={record.reported_at.isoformat()}",
                        f"wait={record.wait_minutes} range=[{record.wait_min_minutes}, {record.wait_max_minutes}]",
                        f"evidence_tier={metadata.get('evidence_tier')}",
                        f"source_url={metadata.get('source_url')}",
                        f"methodology_url={metadata.get('methodology_url')}",
                        f"source_fingerprint_sha256={metadata.get('source_fingerprint_sha256')}",
                        f"definition_excerpt={metadata.get('definition_excerpt')}",
                        f"methodology_excerpt={metadata.get('methodology_excerpt')}",
                        f"urgency_excerpt={metadata.get('urgency_excerpt')}",
                        f"public_status_text={metadata.get('public_status_text')}",
                        f"wait_card_text={metadata.get('wait_card_text')}",
                        f"match_strategy={metadata.get('match_strategy')}",
                        f"screenshot_path={metadata.get('screenshot_path')}",
                        f"formula_explanation={metadata.get('formula_explanation')}",
                        f"formula_inputs={json.dumps(metadata.get('formula_inputs'), sort_keys=True)}",
                    ],
                )
                raw_payload = metadata.get("raw_payload")
                if raw_payload:
                    _print_block(
                        "evidence:raw_payload",
                        [
                            json.dumps(
                                {
                                    "averageTimeToSeeDoctor": raw_payload.get("averageTimeToSeeDoctor"),
                                    "averageTimeToSeeDoctor80th": raw_payload.get("averageTimeToSeeDoctor80th"),
                                    "patientsWaitingToSeeDoctor": raw_payload.get("patientsWaitingToSeeDoctor"),
                                    "activePatients": raw_payload.get("activePatients"),
                                    "activeNoBedAdmits": raw_payload.get("activeNoBedAdmits"),
                                    "lastUpdated": raw_payload.get("lastUpdated"),
                                    "hour15_prediction": (
                                        raw_payload.get("dataSets", [{}, {}])[1].get("data", [None] * 16)[15]
                                        if len(raw_payload.get("dataSets", [])) > 1
                                        else None
                                    ),
                                },
                                indent=2,
                            )
                        ],
                    )
                raw_dashboard_text = metadata.get("raw_dashboard_text")
                if raw_dashboard_text:
                    _print_block("evidence:dashboard_text", [raw_dashboard_text])
                raw_snippets = metadata.get("raw_snippets")
                if raw_snippets:
                    _print_block("evidence:html_snippets", raw_snippets)

            _print_block(
                "subcases",
                [
                    (
                        f"{scenario.scenario_code}: wait={scenario.wait_minutes} "
                        f"range=[{scenario.wait_min_minutes}, {scenario.wait_max_minutes}] "
                        f"target={scenario.target_minutes} "
                        f"p_within_target={scenario.probability_within_target:.3f} "
                        f"confidence={scenario.confidence_score:.3f} "
                        f"notes={scenario.notes}"
                    )
                    for scenario in snapshot.scenarios
                ],
            )
    finally:
        db.close()


if __name__ == "__main__":
    run_demo()
