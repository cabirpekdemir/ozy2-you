"""OZY2 — Text-to-Speech Router (Microsoft Edge TTS)"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional
import io

router = APIRouter(prefix="/api/tts", tags=["TTS"])


class SpeakRequest(BaseModel):
    text:  str
    voice: Optional[str] = None  # None = settings'ten al


@router.get("/voices")
async def get_voices(featured_only: bool = False):
    """Kullanılabilir sesler. featured_only=true → sadece popüler sesler."""
    try:
        from integrations.tts import list_all_voices, FEATURED_VOICES
        if featured_only:
            return {"ok": True, "voices": FEATURED_VOICES}
        voices = await list_all_voices()
        return {"ok": True, "voices": voices, "total": len(voices)}
    except Exception as e:
        from integrations.tts import FEATURED_VOICES
        return {"ok": True, "voices": FEATURED_VOICES, "fallback": True}


@router.get("/config")
async def get_config():
    from integrations.tts import get_selected_voice, tts_enabled
    return {
        "ok":      True,
        "enabled": tts_enabled(),
        "voice":   get_selected_voice(),
    }


@router.post("/speak")
async def speak(req: SpeakRequest):
    """Metni sese çevir, MP3 döndür (chat UI için)."""
    try:
        from integrations.tts import synthesize
        audio = await synthesize(req.text[:2000], req.voice)
        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=ozy2_tts.mp3"},
        )
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/test")
async def test_voice(req: SpeakRequest):
    """Ses testi — seçilen sesle kısa bir cümle söyler."""
    try:
        from integrations.tts import synthesize
        sample = req.text or "Merhaba! Ben OZY2, senin kişisel yapay zeka asistanınım."
        audio  = await synthesize(sample[:300], req.voice)
        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=ozy2_test.mp3"},
        )
    except Exception as e:
        return {"ok": False, "error": str(e)}
