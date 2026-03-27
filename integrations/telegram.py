"""OZY2 — Telegram Integration (pure httpx, no python-telegram-bot required)"""
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_last_update_id: int = 0  # offset tracker — avoids 409 conflict between instances


def _get_token() -> str:
    from pathlib import Path
    import json
    cfg  = Path(__file__).parent.parent / "config" / "settings.json"
    data = json.loads(cfg.read_text())
    token = data.get("telegram_token", "")
    if not token:
        raise ValueError("telegram_token not set in settings.json")
    return token


def _get_allowed_users() -> list:
    from pathlib import Path
    import json
    cfg  = Path(__file__).parent.parent / "config" / "settings.json"
    data = json.loads(cfg.read_text())
    raw  = data.get("telegram_users", "")
    return [int(u.strip()) for u in str(raw).split(",") if u.strip().isdigit()]


def _url(method: str) -> str:
    return f"https://api.telegram.org/bot{_get_token()}/{method}"


async def send_message(text: str, chat_id: Optional[int] = None,
                       parse_mode: str = "HTML") -> bool:
    """Send a text message via Telegram Bot API."""
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


async def get_updates(limit: int = 20, offset: int = 0) -> list:
    """Fetch recent updates from the bot with offset tracking to avoid 409 conflicts."""
    global _last_update_id
    from datetime import datetime, timezone

    try:
        allowed = _get_allowed_users()
        # Use the tracked offset so multiple instances don't fight
        effective_offset = max(offset, _last_update_id)

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(_url("getUpdates"), params={
                "limit":   limit,
                "offset":  effective_offset,
                "timeout": 0,
            })
        data = r.json()

        # 409 = another instance is polling — return empty gracefully
        if not data.get("ok"):
            err_code = data.get("error_code", 0)
            if err_code == 409:
                logger.warning("Telegram 409: another instance is polling — backing off")
            else:
                logger.error(f"Telegram getUpdates error: {data.get('description')}")
            return []

        result = []
        for u in data.get("result", []):
            uid_val = u.get("update_id", 0)
            if uid_val >= _last_update_id:
                _last_update_id = uid_val + 1  # advance offset

            msg = u.get("message") or u.get("edited_message")
            if not msg:
                continue
            from_user = msg.get("from", {})
            uid = from_user.get("id", 0)
            if allowed and uid not in allowed:
                continue
            ts = msg.get("date", 0)
            date_str = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else ""
            result.append({
                "update_id": uid_val,
                "from":      from_user.get("first_name", "Unknown"),
                "text":      msg.get("text", ""),
                "date":      date_str,
            })
        return result
    except Exception as e:
        logger.error(f"Telegram get_updates error: {e}")
        return []


async def get_me() -> dict:
    """Return bot info (username, name)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(_url("getMe"))
        data = r.json()
        if data.get("ok"):
            return data["result"]
        return {}
    except Exception as e:
        logger.error(f"Telegram getMe error: {e}")
        return {}


async def send_photo(photo_path: str, caption: str = "",
                     chat_id: Optional[int] = None) -> bool:
    """Send a photo file."""
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
