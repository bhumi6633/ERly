from __future__ import annotations

import hashlib
import html
import re
from datetime import datetime
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx


THP_VISIT_PAGE_URL = "https://www.thp.ca/emergency/A/visit.html"
THP_STATS_URL_TEMPLATE = "https://edwt-prd.thp.ca/waittimes/stats/{site_code}"
UHN_WAIT_TIMES_PAGE_URL = "https://www.uhn.ca/PatientsFamilies/Visit_UHN/Emergency/Pages/ED_wait_times.aspx"
UHN_POWERBI_URL = (
    "https://app.powerbi.com/view?r="
    "eyJrIjoiYjdmYTA2ZGEtZjIyOS00MzZhLThjMzQtNmIxYjgyODA3NmI2IiwidCI6ImQ5MGRjZTA1LTA2M2QtNDE0Zi1hZWZlLWMyOTJmZjE4ZDhiMCJ9"
)

THP_LOCATION_REGISTRY = {
    "Credit Valley Hospital": {"site_code": "CVH", "facility_label": "Credit Valley Hospital ED"},
    "Trillium Health Partners — Mississauga": {"site_code": "MH", "facility_label": "Mississauga Hospital ED"},
}

UHN_LOCATION_REGISTRY = {
    "Toronto General Hospital": {
        "facility_label": "Toronto General Hospital",
        "page_url": UHN_WAIT_TIMES_PAGE_URL,
    },
}

MEDIMAP_LOCATION_REGISTRY = {
    "Bay-College Medical Centre": {
        "page_url": "https://medimap.ca/clinic/walk-in-clinics/on/toronto/bay-college-medical-and-lockwood-diagnostic",
        "expected_name": "Bay College Medical & Lockwood Diagnostic",
        "match_strategy": "manual_alias",
        "notes": "Closest public Medimap listing by name and Bay Street address; verify manually before treating as exact same practice.",
    },
}

SUNNYBROOK_ED_URL = "https://sunnybrook.ca/content/?page=emergency-dept-wait-times"

SUNNYBROOK_LOCATION_REGISTRY = {
    "Sunnybrook Health Sciences Centre": {
        "facility_label": "Sunnybrook Health Sciences Centre",
        "page_url": SUNNYBROOK_ED_URL,
        "methodology_url": "https://sunnybrook.ca/content/?page=emergency-dept-wait-times",
    },
}


@dataclass
class ThpStatsRecord:
    site_code: str
    facility_label: str
    average_hours: float | None
    average_80th_hours: float | None
    patients_waiting: int | None
    active_patients: int | None
    active_no_bed_admits: int | None
    last_updated: str | None
    hourly_labels: list[str]
    hourly_predicted_hours: list[float]
    raw_payload: dict[str, Any]


@dataclass
class ThpMethodologyRecord:
    api_url: str | None
    definition_excerpt: str | None
    methodology_excerpt: str | None
    urgency_excerpt: str | None
    raw_evidence: list[str]


@dataclass
class MedimapStatusRecord:
    page_url: str
    clinic_name: str | None
    address: str | None
    status_text: str | None
    wait_card_text: str | None
    join_waitlist_available: bool
    sign_in_required_for_wait_times: bool
    raw_snippets: list[str]


@dataclass
class UhnMethodologyRecord:
    update_excerpt: str | None
    description_excerpt: str | None
    powerbi_url: str | None
    raw_evidence: list[str]


@dataclass
class UhnDashboardRecord:
    facility_name: str
    majority_seen_within_minutes: int
    average_wait_minutes: int
    waiting_patients: int
    being_treated_patients: int
    last_updated_text: str
    last_updated_iso: str | None
    raw_block_text: str
    evidence_sha256: str
    screenshot_path: str | None = None


@dataclass
class SunnybrookRecord:
    """
    Parsed from Sunnybrook Health Sciences Centre ED wait times page.
    Source: https://sunnybrook.ca/content/?page=emergency-dept-wait-times
    """
    facility_name: str
    patients_waiting: int | None
    average_wait_minutes: int | None
    last_updated_text: str | None
    raw_block_text: str
    evidence_sha256: str
    source_url: str


def fetch_text(url: str, timeout_seconds: float = 20.0) -> str:
    with httpx.Client(timeout=timeout_seconds, follow_redirects=True, headers={"User-Agent": "ERly/0.1"}) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.text


def fetch_json(url: str, timeout_seconds: float = 20.0) -> dict[str, Any]:
    with httpx.Client(timeout=timeout_seconds, follow_redirects=True, headers={"User-Agent": "ERly/0.1"}) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.json()


def fetch_thp_stats(site_code: str, facility_label: str) -> ThpStatsRecord:
    payload = fetch_json(THP_STATS_URL_TEMPLATE.format(site_code=site_code))
    predicted = payload.get("dataSets", [{}, {}])[1]
    return parse_thp_stats(payload, site_code=site_code, facility_label=facility_label)


def parse_thp_stats(payload: dict[str, Any], *, site_code: str, facility_label: str) -> ThpStatsRecord:
    predicted = payload.get("dataSets", [{}, {}])[1] if payload.get("dataSets") else {}
    return ThpStatsRecord(
        site_code=site_code,
        facility_label=facility_label,
        average_hours=_as_float(payload.get("averageTimeToSeeDoctor")),
        average_80th_hours=_as_float(payload.get("averageTimeToSeeDoctor80th")),
        patients_waiting=_as_int(payload.get("patientsWaitingToSeeDoctor")),
        active_patients=_as_int(payload.get("activePatients")),
        active_no_bed_admits=_as_int(payload.get("activeNoBedAdmits")),
        last_updated=payload.get("lastUpdated"),
        hourly_labels=[str(value) for value in predicted.get("labels", [])],
        hourly_predicted_hours=[float(value) for value in predicted.get("data", [])],
        raw_payload=payload,
    )


def fetch_thp_methodology() -> ThpMethodologyRecord:
    return parse_thp_methodology(fetch_text(THP_VISIT_PAGE_URL))


def parse_thp_methodology(page_html: str) -> ThpMethodologyRecord:
    definition = _first_clean_match(
        page_html,
        r"Definition:\s*</span>\s*80% of patients will be seen by a doctor within this time period\.",
    )
    methodology = _first_clean_match(
        page_html,
        r"The Wait Time Dashboard provides real-time and predicted data \(based on last 30 days of data\).*?EDs\.",
    )
    urgency = _first_clean_match(
        page_html,
        r"Patients are seen based on their medical condition and the urgency of their situation .*? Posted wait times are estimates and may change\.",
    )
    api_url_match = re.search(r"const apiUrl = '([^']+)'", page_html)
    evidence = [snippet for snippet in [definition, methodology, urgency] if snippet]
    return ThpMethodologyRecord(
        api_url=(api_url_match.group(1) if api_url_match else None),
        definition_excerpt=definition,
        methodology_excerpt=methodology,
        urgency_excerpt=urgency,
        raw_evidence=evidence,
    )


def fetch_medimap_status(page_url: str) -> MedimapStatusRecord:
    return parse_medimap_status(fetch_text(page_url), page_url=page_url)


def parse_medimap_status(page_html: str, *, page_url: str) -> MedimapStatusRecord:
    clinic_name = _first_group(page_html, r"<h1[^>]*>(.*?)</h1>")
    address = _first_group(page_html, r"<span class=\"text-sm text-gray-700 truncate\">(.*?)</span>")
    status_text = _first_group(
        page_html,
        r"<span class=\"text-xs font-medium text-(?:blue|green|red)-600\">(.*?)</span>",
    )
    wait_card_text = _first_group(
        page_html,
        r"Wait Time</div>\s*<div[^>]*>(.*?)</div>",
    )
    sign_in_required = "Sign in to view<br/>wait times" in page_html or "Sign in to view wait times" in page_html
    join_waitlist_available = "Join Waitlist" in page_html

    snippets = []
    for pattern in [
        r"<h1[^>]*>.*?</h1>",
        r"<span class=\"text-xs font-medium text-(?:blue|green|red)-600\">.*?</span>",
        r"<div class=\"text-xs text-gray-500 mb-1 font-medium\">Wait Time</div><div[^>]*>.*?</div>",
        r">Join Waitlist<",
        r">Sign in to view<br/>wait times<",
    ]:
        match = re.search(pattern, page_html, flags=re.DOTALL)
        if match:
            snippets.append(_clean_html(match.group(0)))

    return MedimapStatusRecord(
        page_url=page_url,
        clinic_name=_clean_html(clinic_name) if clinic_name else None,
        address=_clean_html(address) if address else None,
        status_text=_clean_html(status_text) if status_text else None,
        wait_card_text=_clean_html(wait_card_text) if wait_card_text else None,
        join_waitlist_available=join_waitlist_available,
        sign_in_required_for_wait_times=sign_in_required,
        raw_snippets=snippets,
    )


def fetch_uhn_methodology() -> UhnMethodologyRecord:
    return parse_uhn_methodology(fetch_text(UHN_WAIT_TIMES_PAGE_URL))


def parse_uhn_methodology(page_html: str) -> UhnMethodologyRecord:
    update_excerpt = _first_clean_match(
        page_html,
        r"The wait time information presented on this webpage is updated every 1 hour and may vary from the real-time information displayed at the Emergency Department\.",
    )
    description_excerpt = _first_group(page_html, r'<meta name="description" content="(.*?)"')
    powerbi_url_match = re.search(r'<iframe[^>]+src="([^"]+app\.powerbi\.com/view\?r=[^"]+)"', page_html, flags=re.I)
    evidence = [snippet for snippet in [update_excerpt, _clean_html(description_excerpt)] if snippet]
    return UhnMethodologyRecord(
        update_excerpt=update_excerpt,
        description_excerpt=_clean_html(description_excerpt) if description_excerpt else None,
        powerbi_url=html.unescape(powerbi_url_match.group(1)) if powerbi_url_match else None,
        raw_evidence=evidence,
    )


def fetch_uhn_dashboard(*, artifact_dir: str | None = None) -> dict[str, UhnDashboardRecord]:
    return _fetch_uhn_dashboard_cached(datetime.utcnow().strftime("%Y-%m-%dT%H"), artifact_dir or "")


@lru_cache(maxsize=8)
def _fetch_uhn_dashboard_cached(cache_bucket: str, artifact_dir: str) -> dict[str, UhnDashboardRecord]:
    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:  # pragma: no cover - depends on local optional package
        raise RuntimeError("playwright is required for UHN browser probes") from exc

    target_dir: Path | None = Path(artifact_dir) if artifact_dir else None
    if target_dir:
        target_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 1400})
            page.goto(UHN_POWERBI_URL, wait_until="domcontentloaded", timeout=60_000)
            page.wait_for_timeout(8_000)
            try:
                page.get_by_text("Toronto General Hospital", exact=True).wait_for(timeout=20_000)
            except PlaywrightTimeoutError:
                pass
            page.wait_for_timeout(2_000)
            body_text = page.locator("body").inner_text(timeout=20_000)

            screenshot_path = None
            if target_dir:
                screenshot_path = str(target_dir / f"uhn-dashboard-{cache_bucket}.png")
                page.screenshot(path=screenshot_path, full_page=True)
        finally:
            browser.close()

    parsed = parse_uhn_dashboard_text(body_text)
    if screenshot_path:
        for record in parsed.values():
            record.screenshot_path = screenshot_path
    return parsed


def parse_uhn_dashboard_text(body_text: str) -> dict[str, UhnDashboardRecord]:
    text = re.sub(r"\r", "", body_text)
    pattern = re.compile(
        r"(?P<facility>Toronto (?:General|Western) Hospital)\s+"
        r"Number of Patients\s+"
        r"(?P<majority>\d{1,2}:\d{2})\s+hours\s+"
        r"The majority of patients will be seen within:\s+"
        r"(?P<waiting>\d+)\s+Waiting\s+"
        r"(?P<treated>\d+)\s+Being Treated\s+"
        r"Average Wait Time to See a Provider\s+"
        r"Last updated at:\s+"
        r"(?P<average>\d{1,2}:\d{2})\s+hours\s+"
        r"(?P<updated>\d{1,2}/\d{1,2}/\d{2} \d{1,2}:\d{2} [AP]M)",
        flags=re.S,
    )

    results: dict[str, UhnDashboardRecord] = {}
    for match in pattern.finditer(text):
        facility_name = match.group("facility")
        raw_block = re.sub(r"\s+", " ", match.group(0)).strip()
        results[facility_name] = UhnDashboardRecord(
            facility_name=facility_name,
            majority_seen_within_minutes=_clock_to_minutes(match.group("majority")),
            average_wait_minutes=_clock_to_minutes(match.group("average")),
            waiting_patients=int(match.group("waiting")),
            being_treated_patients=int(match.group("treated")),
            last_updated_text=match.group("updated"),
            last_updated_iso=_parse_slash_datetime(match.group("updated")),
            raw_block_text=raw_block,
            evidence_sha256=hashlib.sha256(raw_block.encode("utf-8")).hexdigest(),
        )

    return results


def fetch_sunnybrook_ed() -> SunnybrookRecord | None:
    """
    Fetch and parse Sunnybrook ED wait time data from their public page.
    Returns None on network failure or if no recognizable wait data is found.
    Source: https://sunnybrook.ca/content/?page=emergency-dept-wait-times
    """
    try:
        page_html = fetch_text(SUNNYBROOK_ED_URL)
    except Exception:
        return None
    return parse_sunnybrook_page(page_html)


def parse_sunnybrook_page(page_html: str) -> SunnybrookRecord | None:
    """
    Parse Sunnybrook ED wait times from HTML.
    Sunnybrook publishes ED wait time information at:
    https://sunnybrook.ca/content/?page=emergency-dept-wait-times
    Tries multiple pattern variants; returns None if no numeric evidence found.
    """
    text = re.sub(r"\r", "", page_html)

    wait_minutes: int | None = None
    patients_waiting: int | None = None
    last_updated: str | None = None

    # Pattern 1: "X hours Y minutes" near wait/doctor keyword (e.g., "2 hours 15 minutes")
    hm_match = re.search(
        r"(?:average\s+wait|wait\s+time|see\s+a\s+(?:doctor|physician))[^0-9<]{0,80}"
        r"(\d{1,2})\s+hour[s]?\s+(\d{1,2})\s+minute[s]?",
        text, re.I | re.S,
    )
    if hm_match:
        wait_minutes = int(hm_match.group(1)) * 60 + int(hm_match.group(2))

    # Pattern 2: clock format "X:YY hours" (e.g., "2:15 hours")
    if wait_minutes is None:
        clock_match = re.search(r"(\d{1,2}):(\d{2})\s*hour[s]?", text, re.I)
        if clock_match:
            wait_minutes = int(clock_match.group(1)) * 60 + int(clock_match.group(2))

    # Pattern 3: "N minutes" explicitly stated near wait keyword
    if wait_minutes is None:
        min_match = re.search(
            r"(?:average\s+wait|wait\s+time|current\s+wait)[^0-9<]{0,60}(\d{1,4})\s*min",
            text, re.I | re.S,
        )
        if min_match:
            wait_minutes = int(min_match.group(1))

    # Pattern 4: patients waiting count
    patients_match = re.search(
        r"(?:(\d{1,4})\s+patients?\s+(?:currently\s+)?waiting|"
        r"(?:patients?\s+waiting|waiting)[:\s]+(\d{1,4}))",
        text, re.I,
    )
    if patients_match:
        raw = patients_match.group(1) or patients_match.group(2)
        if raw:
            patients_waiting = int(raw)

    # Pattern 5: last updated timestamp
    updated_match = re.search(
        r"(?:last\s+updated|as\s+of|updated)[:\s]+([A-Za-z0-9,: ]+(?:AM|PM|am|pm)?)",
        text, re.I,
    )
    if updated_match:
        last_updated = updated_match.group(1).strip()[:60]

    # Build a compact raw block from stripped page text for evidence artifact
    raw_block = re.sub(r"<[^>]+>", " ", text)
    raw_block = re.sub(r"\s+", " ", raw_block).strip()[:600]

    if wait_minutes is None and patients_waiting is None:
        return None

    return SunnybrookRecord(
        facility_name="Sunnybrook Health Sciences Centre",
        patients_waiting=patients_waiting,
        average_wait_minutes=wait_minutes,
        last_updated_text=last_updated,
        raw_block_text=raw_block,
        evidence_sha256=hashlib.sha256(raw_block.encode("utf-8")).hexdigest(),
        source_url=SUNNYBROOK_ED_URL,
    )


def _clean_html(value: str | None) -> str | None:
    text = re.sub(r"<br\s*/?>", " ", value)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _first_group(value: str, pattern: str) -> str | None:
    match = re.search(pattern, value, flags=re.DOTALL)
    return match.group(1) if match else None


def _first_clean_match(value: str, pattern: str) -> str | None:
    match = re.search(pattern, value, flags=re.DOTALL)
    return _clean_html(match.group(0)) if match else None


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _clock_to_minutes(value: str) -> int:
    hours_text, minutes_text = value.split(":", 1)
    return int(hours_text) * 60 + int(minutes_text)


def _parse_slash_datetime(value: str) -> str | None:
    try:
        parsed = datetime.strptime(value, "%m/%d/%y %I:%M %p")
    except ValueError:
        return None
    return parsed.isoformat()
