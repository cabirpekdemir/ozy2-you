"""OZY2 — Telegram Integration
- Sesli mesaj desteği (OpenAI Whisper transkripsiyon)
- Otomatik AI cevabı (backend poller, scheduler)
- Frontend local store'dan okur — Telegram API ile çakışma yok
"""
import logging
import json
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── Local message store ───────────────────────────────────────────────────────
_message_store: list[dict] = []   # Son 200 mesaj, RAM'de
_store_max     = 200
_poller_offset: int       = 0     # Backend'in kendi Telegram offseti
_replied_ids:  set        = set() # Cevaplanmış update_id seti


# ── Config ────────────────────────────────────────────────────────────────────

def _cfg() -> dict:
    cfg = Path(__file__).parent.parent / "config" / "settings.json"
    try:
        return json.loads(cfg.read_text())
    except Exception:
        return {}


def _get_token() -> str:
    token = _cfg().get("telegram_token", "")
    if not token:
        raise ValueError("telegram_token not set in settings.json")
    return token


def _get_allowed_users() -> list:
    raw = _cfg().get("telegram_users", "")
    return [int(u.strip()) for u in str(raw).split(",") if u.strip().isdigit()]


def _url(method: str) -> str:
    return f"https://api.telegram.org/bot{_get_token()}/{method}"


# ── Mesaj gönderme ────────────────────────────────────────────────────────────

async def send_message(text: str, chat_id: Optional[int] = None,
                       parse_mode: str = "HTML") -> bool:
    try:
        users  = _get_allowed_users()
        target = chat_id or (users[0] if users else None)
        if not target:
            raise ValueError("No target chat_id configured")
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(_url("sendMessage"), json={
                "chat_id":    target,
                "text":       text,
                "parse_mode": parse_mode,
            })
        data = r.json()
        if not data.get("ok"):
            logger.error(f"Telegram sendMessage error: {data.get('description')}")
            return False
        return True
    except Exception as e:
        logger.error(f"Telegram send_message error: {e}")
        return False


# ── Sesli mesaj transkripsiyon ────────────────────────────────────────────────

async def _get_file_url(file_id: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(_url("getFile"), params={"file_id": file_id})
        data = r.json()
        if data.get("ok"):
            fp = data["result"]["file_path"]
            return f"https://api.telegram.org/file/bot{_get_token()}/{fp}"
    except Exception as e:
        logger.error(f"getFile error: {e}")
    return None


async def _transcribe_voice(file_id: str, duration: int) -> str:
    """OpenAI Whisper ile transkripsiyon. API yoksa süreyi döndürür."""
    try:
        cfg      = _cfg()
        provider = cfg.get("provider", "")
        api_key  = cfg.get("api_key", "")

        if provider == "openai" and api_key:
            file_url = await _get_file_url(file_id)
            if not file_url:
                return f"🎤 Sesli mesaj ({duration}s)"
            async with httpx.AsyncClient(timeout=30) as client:
                audio_r = await client.get(file_url)
                r = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={"file": ("voice.ogg", audio_r.content, "audio/ogg")},
                    data={"model": "whisper-1"},
                    timeout=30,
                )
            text = r.json().get("text", "").strip()
            if text:
                return text
    except Exception as e:
        logger.warning(f"Transcription error: {e}")
    return f"🎤 Sesli mesaj ({duration}s)"


# ── Mesaj parse ───────────────────────────────────────────────────────────────

async def _parse_message(msg: dict, update_id: int) -> Optional[dict]:
    from datetime import datetime, timezone

    allowed   = _get_allowed_users()
    from_user = msg.get("from", {})
    uid       = from_user.get("id", 0)
    if allowed and uid not in allowed:
        return None

    ts       = msg.get("date", 0)
    date_str = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else ""
    chat_id  = msg.get("chat", {}).get("id", uid)

    msg_type = "text"
    text     = msg.get("text", "")
    duration = 0
    file_id  = ""

    if msg.get("voice"):
        msg_type = "voice"
        file_id  = msg["voice"].get("file_id", "")
        duration = msg["voice"].get("duration", 0)
        text     = await _transcribe_voice(file_id, duration)

    elif msg.get("audio"):
        msg_type = "audio"
        file_id  = msg["audio"].get("file_id", "")
        duration = msg["audio"].get("duration", 0)
        text     = f"🎵 Ses dosyası ({duration}s)"

    elif msg.get("photo"):
        msg_type = "photo"
        text     = msg.get("caption", "📷 Fotoğraf")

    elif msg.get("document"):
        msg_type = "document"
        text     = f"📎 {msg['document'].get('file_name', 'Dosya')}"

    elif msg.get("sticker"):
        msg_type = "sticker"
        text     = f"🎭 {msg['sticker'].get('emoji', 'Sticker')}"

    return {
        "update_id": update_id,
        "from":      from_user.get("first_name", "Unknown"),
        "user_id":   uid,
        "chat_id":   chat_id,
        "text":      text,
        "type":      msg_type,
        "duration":  duration,
        "file_id":   file_id,
        "date":      date_str,
        "ts":        ts,
    }


# ── Otomatik AI cevabı ────────────────────────────────────────────────────────

async def _auto_reply(msg: dict):
    """Gelen mesajı AI agent'a ilet, cevabı Telegram'a gönder."""
    text     = msg["text"]
    chat_id  = msg["chat_id"]
    msg_type = msg["type"]

    # Transkripsiyon başarısız sesli mesaj
    if msg_type == "voice" and text.startswith("🎤"):
        await send_message(
            "🎤 <i>Sesli mesajı transkribe edemedim.\n"
            "OpenAI sağlayıcısı seçiliyse otomatik çalışır.</i>",
            chat_id=chat_id
        )
        return

    if not text.strip():
        return

    try:
        from api.state import get_agent
        agent    = get_agent()
        response = await agent.think(text)
        if len(response) > 4000:
            response = response[:3997] + "..."
        await send_message(response, chat_id=chat_id)
        logger.info(f"[Telegram] Auto-reply sent ({msg_type}) to {chat_id}")
    except Exception as e:
        logger.error(f"[Telegram] Auto-reply error: {e}")
        await send_message(f"❌ <i>Hata: {str(e)[:100]}</i>", chat_id=chat_id)


# ── Backend poller (scheduler çağırır) ───────────────────────────────────────

async def poll_and_reply():
    """
    Scheduler her 8-10 saniyede bir çağırır.
    Telegram'dan yeni mesajları çeker → store'a kaydeder → AI ile cevaplar.
    """
    global _poller_offset, _message_store, _replied_ids

    try:
        _get_token()  # token yoksa sessizce çık
    except ValueError:
        return

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(_url("getUpdates"), params={
                "limit":   20,
                "offset":  _poller_offset,
                "timeout": 0,
            })
        data = r.json()

        if not data.get("ok"):
            if data.get("error_code") == 409:
                logger.warning("[Telegram] 409 çakışma — diğer instance çalışıyor olabilir")
            return

        updates = data.get("result", [])
        if not updates:
            return

        _poller_offset = updates[-1]["update_id"] + 1

        existing_ids = {m["update_id"] for m in _message_store}
        for u in updates:
            uid_val = u.get("update_id", 0)
            msg = u.get("message") or u.get("edited_message")
            if not msg:
                continue

            parsed = await _parse_message(msg, uid_val)
            if not parsed:
                continue

            # Store'a ekle
            if uid_val not in existing_ids:
                _message_store.append(parsed)
                existing_ids.add(uid_val)
                if len(_message_store) > _store_max:
                    _message_store = _message_store[-_store_max:]

            # Otomatik cevap (bir kere)
            if uid_val not in _replied_ids and parsed["text"]:
                _replied_ids.add(uid_val)
                await _auto_reply(parsed)

    except Exception as e:
        logger.error(f"[Telegram] poll_and_reply error: {e}")


# ── Frontend için store okuma ─────────────────────────────────────────────────

def get_stored_messages(limit: int = 50) -> list:
    return _message_store[-limit:]


# ── Geriye dönük uyumluluk ────────────────────────────────────────────────────

async def get_updates(limit: int = 20, offset: int = 0) -> list:
    """Frontend bu fonksiyonu çağırır — artık local store döner."""
    return get_stored_messages(limit)


async def get_me() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(_url("getMe"))
        data = r.json()
        return data["result"] if data.get("ok") else {}
    except Exception as e:
        logger.error(f"Telegram getMe error: {e}")
        return {}


async def send_photo(photo_path: str, caption: str = "",
                     chat_id: Optional[int] = None) -> bool:
    try:
        users  = _get_allowed_users()
        target = chat_id or (users[0] if users else None)
        if not target:
            return False
        with open(photo_path, "rb") as f:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(_url("sendPhoto"), data={
                    "chat_id": target,
                    "caption": caption,
                }, files={"photo": f})
        return r.json().get("ok", False)
    except Exception as e:
        logger.error(f"Telegram send_photo error: {e}")
        return False
