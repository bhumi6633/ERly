"""
ElevenLabs Speech-to-Text proxy. Keeps API key server-side.
"""
import os
from fastapi import APIRouter, File, HTTPException, UploadFile
import httpx

router = APIRouter(prefix="/speech-to-text", tags=["speech-to-text"])

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


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
            detail = body.get("detail", body.get("message", response.text))
        except Exception:
            pass
        raise HTTPException(status_code=response.status_code, detail=detail)

    data = response.json()
    # Single transcript response has "text"; multichannel has "transcripts"
    text = data.get("text")
    if text is None and "transcripts" in data and len(data["transcripts"]) > 0:
        text = data["transcripts"][0].get("text", "")
    return {"text": text or ""}
