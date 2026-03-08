"""
ElevenLabs Speech-to-Text proxy. Keeps API key server-side.
"""
import os
from fastapi import APIRouter, File, HTTPException, UploadFile
import httpx

router = APIRouter(prefix="/speech-to-text", tags=["speech-to-text"])

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


@router.get("/status")
def speech_to_text_status():
    """Return whether voice input is configured (no key exposed)."""
    return {"configured": bool(ELEVENLABS_API_KEY and ELEVENLABS_API_KEY.strip())}


@router.post("")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accept an audio file (e.g. webm, mp3, wav), send to ElevenLabs STT,
    return { "text": "transcribed text" }.
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text is not configured (ELEVENLABS_API_KEY missing).",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file.")

    headers = {"xi-api-key": ELEVENLABS_API_KEY}

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                ELEVENLABS_STT_URL,
                headers=headers,
                files={"file": (file.filename or "audio.webm", content, file.content_type or "audio/webm")},
                data={"model_id": "scribe_v2"},
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Speech-to-text service error: {str(e)}")

    if response.status_code != 200:
        detail = response.text
        try:
            body = response.json()
            raw = body.get("detail", body.get("message", body.get("error", response.text)))
            if isinstance(raw, str):
                detail = raw
            elif isinstance(raw, dict):
                detail = raw.get("message", raw.get("detail", str(raw)))
            else:
                detail = str(raw) if raw is not None else response.text
        except Exception:
            pass
        if response.status_code == 401:
            detail = "Invalid ElevenLabs API key. Set ELEVENLABS_API_KEY in Render (or backend .env) with a valid key from elevenlabs.io."
        # User-friendly message when ElevenLabs blocks free tier (VPN/abuse detection)
        check = (detail + " " + response.text).lower()
        if "free tier" in check or "unusual activity" in check or "abuse" in check or "paid plan" in check:
            detail = (
                "Voice input is limited by ElevenLabs (free tier / account policy). "
                "Please type your symptoms in the box below, or use a paid ElevenLabs plan for voice."
            )
        raise HTTPException(status_code=response.status_code, detail=detail)

    data = response.json()
    # Single transcript response has "text"; multichannel has "transcripts"
    text = data.get("text")
    if text is None and "transcripts" in data and len(data["transcripts"]) > 0:
        text = data["transcripts"][0].get("text", "")
    # Ensure we always return a string (API might return text as object in some edge cases)
    if not isinstance(text, str):
        text = str(text) if text is not None else ""
    return {"text": text or ""}
