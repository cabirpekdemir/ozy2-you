"""OZY2 — Telegram Integration"""
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

_bot = None


def _get_token() -> str:
    from pathlib import Path
    import json
    cfg = Path(__file__).parent.parent / "config" / "settings.json"
    data = json.loads(cfg.read_text())
    token = data.get("telegram_token", "")
    if not token:
        raise ValueError("telegram_token not configured in settings.json")
    return token


def _get_allowed_users() -> list:
    from pathlib import Path
    import json
    cfg = Path(__file__).parent.parent / "config" / "settings.json"
    data = json.loads(cfg.read_text())
    raw  = data.get("telegram_users", "")
    return [int(u.strip()) for u in str(raw).split(",") if u.strip()]


async def send_message(text: str, chat_id: Optional[int] = None,
                       parse_mode: str = "HTML") -> bool:
    """Send a message. chat_id defaults to first allowed user."""
    try:
        import telegram
        token   = _get_token()
        users   = _get_allowed_users()
        target  = chat_id or (users[0] if users else None)
        if not target:
            raise ValueError("No target chat_id")

        bot = telegram.Bot(token=token)
        await bot.send_message(
            chat_id=target,
            text=text,
            parse_mode=parse_mode,
        )
        return True
    except Exception as e:
        logger.error(f"Telegram send_message error: {e}")
        return False


async def get_updates(limit: int = 10, offset: int = 0) -> list:
    """Get recent messages."""
    try:
        import telegram
        token   = _get_token()
        bot     = telegram.Bot(token=token)
        updates = await bot.get_updates(limit=limit, offset=offset)
        result  = []
        allowed = _get_allowed_users()
        for u in updates:
            if not u.message:
                continue
            uid  = u.message.from_user.id if u.message.from_user else 0
            if allowed and uid not in allowed:
                continue
            result.append({
                "update_id": u.update_id,
                "from":      u.message.from_user.first_name if u.message.from_user else "Unknown",
                "text":      u.message.text or "",
                "date":      u.message.date.isoformat() if u.message.date else "",
            })
        return result
    except Exception as e:
        logger.error(f"Telegram get_updates error: {e}")
        return []


async def send_photo(photo_path: str, caption: str = "",
                     chat_id: Optional[int] = None) -> bool:
    """Send a photo file."""
    try:
        import telegram
        token  = _get_token()
        users  = _get_allowed_users()
        target = chat_id or (users[0] if users else None)
        if not target:
            return False
        bot = telegram.Bot(token=token)
        with open(photo_path, "rb") as f:
            await bot.send_photo(chat_id=target, photo=f, caption=caption)
        return True
    except Exception as e:
        logger.error(f"Telegram send_photo error: {e}")
        return False
