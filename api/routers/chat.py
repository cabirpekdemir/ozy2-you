# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Chat router. SSE streaming + single-shot endpoint."""
import asyncio
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, JSONResponse
from api.state import get_agent
from core.memory import get_history, clear_history
from api.routers.auth_router import get_session_permissions, COOKIE

router = APIRouter(tags=["Chat"])


@router.post("/api/chat")
async def chat(request: Request):
    """Single-shot chat — returns full response."""
    data    = await request.json()
    message = data.get("message", "").strip()
    if not message:
        return JSONResponse({"ok": False, "error": "Empty message"})
    agent       = get_agent()
    permissions = get_session_permissions(request.cookies.get(COOKIE))
    response    = await agent.think(message, permissions=permissions)
    return {"ok": True, "response": response}


@router.get("/api/chat/stream")
async def chat_stream(request: Request, message: str = ""):
    """SSE streaming chat — yields chunks as Server-Sent Events."""
    if not message.strip():
        return JSONResponse({"ok": False, "error": "Empty message"})

    agent       = get_agent()
    permissions = get_session_permissions(request.cookies.get(COOKIE))

    async def event_stream():
        try:
            async for chunk in agent.stream_think(message, permissions=permissions):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except asyncio.CancelledError:
            pass
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[chat/stream] error: {e}", exc_info=True)
            yield f"data: {json.dumps({'chunk': f'[Error] {e}'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/api/chat/history")
async def history():
    return {"ok": True, "history": get_history(limit=50)}


@router.delete("/api/chat/history")
async def clear():
    clear_history()
    return {"ok": True}
