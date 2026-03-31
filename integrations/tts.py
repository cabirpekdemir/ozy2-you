# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Text-to-Speech (Microsoft Edge Neural TTS)
Ücretsiz, API anahtarı gerektirmez, 400+ ses destekler.
"""
import asyncio
import logging
import json
import tempfile
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Varsayılan ses
DEFAULT_VOICE = "tr-TR-EmelNeural"

# En popüler sesler (hızlı seçim için)
FEATURED_VOICES = [
    # Türkçe
    {"name": "tr-TR-EmelNeural",    "lang": "tr", "locale": "Türkçe",  "gender": "Kadın",  "style": "Genel"},
    {"name": "tr-TR-AhmetNeural",   "lang": "tr", "locale": "Türkçe",  "gender": "Erkek",  "style": "Genel"},
    # İngilizce (US)
    {"name": "en-US-AriaNeural",    "lang": "en", "locale": "İngilizce (US)", "gender": "Kadın", "style": "Sohbet"},
    {"name": "en-US-JennyNeural",   "lang": "en", "locale": "İngilizce (US)", "gender": "Kadın", "style": "Asistan"},
    {"name": "en-US-GuyNeural",     "lang": "en", "locale": "İngilizce (US)", "gender": "Erkek", "style": "Haber"},
    {"name": "en-US-DavisNeural",   "lang": "en", "locale": "İngilizce (US)", "gender": "Erkek", "style": "Rahat"},
    # İngilizce (GB)
    {"name": "en-GB-SoniaNeural",   "lang": "en", "locale": "İngilizce (UK)", "gender": "Kadın", "style": "Genel"},
    {"name": "en-GB-RyanNeural",    "lang": "en", "locale": "İngilizce (UK)", "gender": "Erkek", "style": "Genel"},
    # Almanca
    {"name": "de-DE-KatjaNeural",   "lang": "de", "locale": "Almanca",  "gender": "Kadın",  "style": "Genel"},
    {"name": "de-DE-ConradNeural",  "lang": "de", "locale": "Almanca",  "gender": "Erkek",  "style": "Genel"},
    # Fransızca
    {"name": "fr-FR-DeniseNeural",  "lang": "fr", "locale": "Fransızca","gender": "Kadın",  "style": "Genel"},
    {"name": "fr-FR-HenriNeural",   "lang": "fr", "locale": "Fransızca","gender": "Erkek",  "style": "Genel"},
    # İspanyolca
    {"name": "es-ES-ElviraNeural",  "lang": "es", "locale": "İspanyolca","gender": "Kadın", "style": "Genel"},
    # Arapça
    {"name": "ar-SA-ZariyahNeural", "lang": "ar", "locale": "Arapça",   "gender": "Kadın",  "style": "Genel"},
    # Japonca
    {"name": "ja-JP-NanamiNeural",  "lang": "ja", "locale": "Japonca",  "gender": "Kadın",  "style": "Genel"},
]


def _cfg() -> dict:
    cfg = Path(__file__).parent.parent / "config" / "settings.json"
    try:
        return json.loads(cfg.read_text())
    except Exception:
        return {}


def get_selected_voice() -> str:
    return _cfg().get("tts_voice", DEFAULT_VOICE)


def tts_enabled() -> bool:
    return _cfg().get("tts_enabled", False)


async def list_all_voices() -> list:
    """Edge TTS'deki tüm sesleri döndür (400+)."""
    try:
        import edge_tts
        voices = await edge_tts.list_voices()
        result = []
        for v in voices:
            result.append({
                "name":       v["Name"],
                "short_name": v["ShortName"],
                "gender":     v["Gender"],
                "locale":     v["Locale"],
                "lang":       v["Locale"].split("-")[0],
            })
        return sorted(result, key=lambda x: (x["lang"], x["locale"], x["gender"]))
    except Exception as e:
        logger.error(f"TTS list_voices error: {e}")
        return FEATURED_VOICES


async def synthesize(text: str, voice: Optional[str] = None) -> bytes:
    """Metni sese çevir, MP3 bytes döndür."""
    import edge_tts

    selected = voice or get_selected_voice()
    # Markdown temizle
    import re
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # bold
    text = re.sub(r'\*(.+?)\*',     r'\1', text)  # italic
    text = re.sub(r'`(.+?)`',       r'\1', text)  # code
    text = re.sub(r'#{1,6}\s',      '',    text)  # headers
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)  # links
    text = text.strip()

    if not text:
        raise ValueError("Boş metin")

    audio_data = b""
    communicate = edge_tts.Communicate(text, selected)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]

    if not audio_data:
        raise ValueError("Ses üretilemedi")

    return audio_data


async def synthesize_to_file(text: str, voice: Optional[str] = None) -> str:
    """Sesi geçici dosyaya yaz, dosya yolunu döndür. (Telegram için)"""
    audio = await synthesize(text, voice)
    tmp   = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3", prefix="ozy2_tts_")
    tmp.write(audio)
    tmp.close()
    return tmp.name
