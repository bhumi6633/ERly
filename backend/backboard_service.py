"""
backboard_service.py

Drop this in the backend/ folder alongside main.py.

Takes the 3 frontend answers → Backboard AI → returns structured triage result.
Also handles persistent patient memory across visits.
"""

import os
import json
from backboard import BackboardClient
from typing import Dict, Optional

BACKBOARD_API_KEY = os.getenv("BACKBOARD_API_KEY", "")
BACKBOARD_ASST_ID = os.getenv("BACKBOARD_ASSISTANT_ID", "")

# ─────────────────────────────────────────────────────────────────────────────
# Human-readable labels for the 3 frontend inputs
# ─────────────────────────────────────────────────────────────────────────────

CATEGORY_LABELS = {
    "pain":          "Pain (unspecified location or type)",
    "injury":        "Physical injury (trauma, fall, cut, fracture, etc.)",
    "illness":       "Illness (infection, fever, nausea, respiratory, etc.)",
    "mental_health": "Mental health concern (anxiety, crisis, emotional distress)",
    "other":         "Other / unspecified",
}
SEVERITY_LABELS = {
    "mild":     "Mild — barely noticeable, not affecting daily activity",
    "minor":    "Minor — noticeable but manageable",
    "moderate": "Moderate — significantly affecting comfort or function",
    "severe":   "Severe — very painful or debilitating",
    "critical": "Critical — worst possible, potentially life-threatening",
}
DURATION_LABELS = {
    "just_now":     "Just started — within the last hour",
    "few_hours":    "A few hours ago (2–12 hours)",
    "few_days":     "A few days ago (1–4 days)",
    "week_or_more": "A week or more (chronic or recurring)",
}

# ─────────────────────────────────────────────────────────────────────────────
# System prompt — the triage brain
# ─────────────────────────────────────────────────────────────────────────────

TRIAGE_SYSTEM_PROMPT = """
You are ERly's AI triage engine for a Canadian emergency healthcare routing app.
You receive 3 structured inputs from a patient intake form and produce a full triage assessment.

INPUT FORMAT:
  Category:  pain | injury | illness | mental_health | other (<custom text>)
  Severity:  mild | minor | moderate | severe | critical
  Duration:  just_now | few_hours | few_days | week_or_more

YOUR JOB:
  1. Determine urgency priority and numeric score
  2. Identify the correct doctor specialty
  3. Decide where the patient should go for care
  4. Write a clean clinical handoff report the care team reads in 10 seconds
  5. Use any memory of past visits to flag patterns (e.g. "3rd respiratory visit this year")

PRIORITY RULES:
  CRITICAL  severity=critical OR (severe + just_now) OR any mental_health (always min HIGH)
  HIGH      severe + few_hours OR moderate + injury
  MEDIUM    moderate + illness OR minor deteriorating
  LOW       mild or minor, non-urgent

CARE LEVEL:
  pharmacy      LOW only — OTC treatment sufficient
  clinic        LOW-MEDIUM — GP walk-in
  urgent_care   MEDIUM-HIGH — same-day assessment needed
  er            HIGH-CRITICAL — emergency department required
  ambulance     CRITICAL — patient must NOT self-transport

DOCTOR SPECIALTIES — pick the single best match:
  pain          → general_practice or anesthesiology
  injury        → orthopedic (bone/joint), emergency_medicine (trauma), dermatology (skin)
  illness       → general_practice, respirology, gastroenterology, cardiology,
                  neurology, urology, gynecology, ent, dermatology
  mental_health → psychiatry

OUTPUT: return ONLY this exact JSON. No extra text. No markdown fences.
{
  "priority_level": "<LOW | MEDIUM | HIGH | CRITICAL>",
  "priority_score": <1-10>,
  "care_level": "<pharmacy | clinic | urgent_care | er | ambulance>",
  "needs_ambulance": <true | false>,
  "doctor_specialty": "<specialty_key>",
  "doctor_specialty_label": "<Human Readable Specialty Name>",
  "pattern_alert": "<string if recurring pattern found in memory, else null>",
  "report": {
    "chief_complaint": "<1 sentence — what the patient is presenting with>",
    "clinical_picture": "<2-3 sentences synthesizing all 3 inputs clinically>",
    "key_flags": ["<flag1>", "<flag2>"],
    "recommended_action": "<1 sentence — what the care team should do first on arrival>",
    "care_rationale": "<1 sentence — why this care level was chosen>"
  }
}
"""


# ─────────────────────────────────────────────────────────────────────────────
# One-time setup — run once to create your assistant
# ─────────────────────────────────────────────────────────────────────────────

async def create_assistant() -> str:
    """
    Run ONCE to create the Backboard assistant.
    Then paste the printed ID into your .env as BACKBOARD_ASSISTANT_ID.

    Run with:
        python -c "import asyncio; from backboard_service import create_assistant; asyncio.run(create_assistant())"
    """
    client    = BackboardClient(api_key=BACKBOARD_API_KEY)
    assistant = await client.create_assistant(
        name          = "ERly Triage Engine",
        system_prompt = TRIAGE_SYSTEM_PROMPT,
    )
    print(f"\n✅  Assistant created!")
    print(f"    Add to .env → BACKBOARD_ASSISTANT_ID={assistant.assistant_id}\n")
    return assistant.assistant_id


# ─────────────────────────────────────────────────────────────────────────────
# Save a visit to Backboard memory (called after every triage)
# ─────────────────────────────────────────────────────────────────────────────

async def save_visit(
    patient_token:   str,
    category:        str,
    severity:        str,
    duration:        str,
    priority:        str,
    care_level:      str,
    specialty:       str,
    chief_complaint: str,
) -> None:
    """Store this visit in Backboard memory for future recall."""
    if not BACKBOARD_API_KEY or not BACKBOARD_ASST_ID:
        return

    from datetime import datetime
    client = BackboardClient(api_key=BACKBOARD_API_KEY)
    thread = await client.create_thread(BACKBOARD_ASST_ID)

    entry = (
        f"VISIT — {datetime.now().strftime('%B %d, %Y %I:%M %p')}\n"
        f"Patient: {patient_token}\n"
        f"Category: {category} | Severity: {severity} | Duration: {duration}\n"
        f"Chief complaint: {chief_complaint}\n"
        f"Priority: {priority} | Directed to: {care_level} | Specialty: {specialty}"
    )
    await client.add_message(
        thread_id=thread.thread_id,
        content=entry,
        memory="Auto",
        stream=False,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Recall patient history from Backboard memory
# ─────────────────────────────────────────────────────────────────────────────

async def recall_history(patient_token: str) -> Dict:
    """Pull past visit history for this patient from Backboard memory."""
    if not BACKBOARD_API_KEY or not BACKBOARD_ASST_ID:
        return _empty_history()

    client = BackboardClient(api_key=BACKBOARD_API_KEY)
    thread = await client.create_thread(BACKBOARD_ASST_ID)

    query = (
        f"Patient: {patient_token}\n"
        f"Retrieve all past visits for this patient. Output JSON:\n"
        f'{{"has_history": true/false, "visit_count": int, "last_visit": "date or null",'
        f'"patterns": ["pattern1"], "history_summary": "2-3 sentence doctor summary"}}'
    )
    resp = await client.add_message(
        thread_id=thread.thread_id,
        content=query,
        memory="Auto",
        stream=False,
    )
    raw = resp.content.strip()
    try:
        clean = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(clean[clean.index("{"):clean.rindex("}") + 1])
    except Exception:
        return _empty_history()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN FUNCTION — called from triage router
# ─────────────────────────────────────────────────────────────────────────────

async def assess(
    category:      str,
    severity:      str,
    duration:      str,
    custom_text:   str = "",
    patient_token: str = None,
) -> Dict:
    """
    Core triage assessment. 3 inputs in → full structured result out.

    Args:
        category:      "pain" | "injury" | "illness" | "mental_health" | "other"
        severity:      "mild" | "minor" | "moderate" | "severe" | "critical"
        duration:      "just_now" | "few_hours" | "few_days" | "week_or_more"
        custom_text:   patient's typed description (if category = "other")
        patient_token: stable ID from frontend localStorage — enables memory

    Returns full triage dict with priority, specialty, care_level, report, history.
    """
    if not BACKBOARD_API_KEY or not BACKBOARD_ASST_ID:
        return _fallback(severity, category)

    client = BackboardClient(api_key=BACKBOARD_API_KEY)

    # Resolve labels
    cat_label = CATEGORY_LABELS.get(category, category)
    if category == "other" and custom_text:
        cat_label = f"Other — patient describes: {custom_text}"

    # Step 1: recall history if patient_token provided
    history = {}
    if patient_token:
        history = await recall_history(patient_token)

    # Step 2: build message
    message = (
        f"Category:  {cat_label}\n"
        f"Severity:  {SEVERITY_LABELS.get(severity, severity)}\n"
        f"Duration:  {DURATION_LABELS.get(duration, duration)}\n"
    )
    if custom_text and category != "other":
        message += f"Note: {custom_text}\n"
    if history.get("has_history"):
        message += (
            f"\n--- Patient History ---\n"
            f"{history.get('history_summary', '')}\n"
            f"Total visits: {history.get('visit_count', 0)}\n"
            f"Patterns: {', '.join(history.get('patterns', []))}\n"
            f"---\n"
        )

    # Step 3: call Backboard
    thread = await client.create_thread(BACKBOARD_ASST_ID)
    resp   = await client.add_message(
        thread_id = thread.thread_id,
        content   = message,
        memory    = "Auto",
        stream    = False,
    )

    raw = resp.content.strip()
    try:
        clean  = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean[clean.index("{"):clean.rindex("}") + 1])
    except Exception:
        result = _fallback(severity, category)

    # Step 4: save visit to memory
    if patient_token:
        await save_visit(
            patient_token   = patient_token,
            category        = category,
            severity        = severity,
            duration        = duration,
            priority        = result.get("priority_level", ""),
            care_level      = result.get("care_level", ""),
            specialty       = result.get("doctor_specialty", ""),
            chief_complaint = result.get("report", {}).get("chief_complaint", ""),
        )

    result["patient_history"] = history
    result["inputs"] = {"category": category, "severity": severity, "duration": duration}
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _empty_history() -> Dict:
    return {
        "has_history": False, "visit_count": 0,
        "last_visit": None, "patterns": [], "history_summary": "No prior history.",
    }


def _fallback(severity: str, category: str) -> Dict:
    score = {"mild": 2, "minor": 3, "moderate": 5, "severe": 8, "critical": 10}.get(severity, 5)
    if score >= 9 or category == "mental_health":
        priority, care = "CRITICAL", "ambulance"
    elif score >= 7:
        priority, care = "HIGH", "er"
    elif score >= 5:
        priority, care = "MEDIUM", "urgent_care"
    else:
        priority, care = "LOW", "clinic"
    return {
        "priority_level": priority, "priority_score": score,
        "care_level": care, "needs_ambulance": score >= 9,
        "doctor_specialty": "emergency_medicine" if score >= 7 else "general_practice",
        "doctor_specialty_label": "Emergency Medicine" if score >= 7 else "General Practice",
        "pattern_alert": None,
        "report": {
            "chief_complaint": f"Patient presenting with {category} ({severity})",
            "clinical_picture": f"Patient reports {severity} {category}.",
            "key_flags": [f"Severity: {severity}"],
            "recommended_action": "Assess on arrival",
            "care_rationale": "Based on stated severity",
        },
        "patient_history": _empty_history(),
    }
