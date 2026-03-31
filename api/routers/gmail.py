# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Gmail API Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/gmail", tags=["Gmail"])


class SendRequest(BaseModel):
    to:      str
    subject: str
    body:    str


@router.get("/messages")
async def get_messages(q: str = "", label: str = "INBOX", limit: int = 20):
    try:
        from integrations.gmail import list_messages
        msgs = list_messages(max_results=limit, query=q, label=label)
        return {"ok": True, "messages": msgs}
    except Exception as e:
        return {"ok": False, "error": str(e), "messages": []}


@router.get("/messages/{msg_id}")
async def get_message(msg_id: str):
    try:
        from integrations.gmail import get_message
        msg = get_message(msg_id)
        if not msg:
            raise HTTPException(404, "Message not found")
        return {"ok": True, "message": msg}
    except HTTPException:
        raise
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/send")
async def send_email(req: SendRequest):
    try:
        from integrations.gmail import send_message
        ok = send_message(req.to, req.subject, req.body)
        return {"ok": ok}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/messages/{msg_id}/read")
async def mark_read(msg_id: str):
    try:
        from integrations.gmail import mark_read
        ok = mark_read(msg_id)
        return {"ok": ok}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.delete("/messages/{msg_id}")
async def trash_message(msg_id: str):
    try:
        from integrations.gmail import trash_message
        ok = trash_message(msg_id)
        return {"ok": ok}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/unread")
async def unread_count():
    try:
        from integrations.gmail import get_unread_count
        count = get_unread_count()
        return {"ok": True, "count": count}
    except Exception as e:
        return {"ok": False, "error": str(e), "count": 0}
