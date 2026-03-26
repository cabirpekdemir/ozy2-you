"""OZY2 — Telegram API Router"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


class SendRequest(BaseModel):
    text:    str
    chat_id: Optional[int] = None


@router.get("/updates")
async def get_updates(limit: int = 20, offset: int = 0):
    try:
        from integrations.telegram import get_updates
        updates = await get_updates(limit=limit, offset=offset)
        return {"ok": True, "messages": updates}
    except Exception as e:
        return {"ok": False, "error": str(e), "messages": []}


@router.post("/send")
async def send(req: SendRequest):
    try:
        from integrations.telegram import send_message
        ok = await send_message(req.text, chat_id=req.chat_id)
        return {"ok": ok}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/status")
async def status():
    try:
        import telegram
        from integrations.telegram import _get_token
        token = _get_token()
        bot   = telegram.Bot(token=token)
        me    = await bot.get_me()
        return {"ok": True, "username": me.username, "name": me.first_name}
    except Exception as e:
        return {"ok": False, "error": str(e)}
