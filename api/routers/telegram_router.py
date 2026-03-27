"""OZY2 — Telegram API Router"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/telegram", tags=["Telegram"])


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
        if ok:
            return {"ok": True}
        return {"ok": False, "error": "Message not delivered — check token and chat ID in Settings"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/status")
async def status():
    try:
        from integrations.telegram import get_me
        me = await get_me()
        if me:
            return {"ok": True, "username": me.get("username"), "name": me.get("first_name")}
        return {"ok": False, "error": "Bot not reachable"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
