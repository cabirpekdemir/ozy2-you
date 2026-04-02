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
from api.routers.auth_router import (
    get_session_permissions, COOKIE,
    increment_query_count, get_query_count,
    is_demo_session, get_demo_info, log_access,
    DEMO_QUERY_LIMIT, _get_ip, get_session_id,
)

router = APIRouter(tags=["Chat"])


def _check_demo_limit(token: str) -> dict | None:
    """Returns an error dict if demo user exceeded query limit, else None."""
    if not is_demo_session(token):
        return None
    count = get_query_count(token)
    if count >= DEMO_QUERY_LIMIT:
        return {
            "ok": False,
            "error": f"You have reached the demo limit ({DEMO_QUERY_LIMIT} queries). "
                     f"Contact us for full access.",
            "demo_limit_reached": True,
            "query_count": count,
            "query_limit": DEMO_QUERY_LIMIT,
        }
    return None


@router.post("/api/chat")
async def chat(request: Request):
    """Single-shot chat — returns full response."""
    data    = await request.json()
    message = data.get("message", "").strip()
    if not message:
        return JSONResponse({"ok": False, "error": "Empty message"})

    token = request.cookies.get(COOKIE)

    # Demo query limit check
    limit_err = _check_demo_limit(token)
    if limit_err:
        return JSONResponse(limit_err, status_code=429)

    agent       = get_agent()
    permissions = get_session_permissions(token)
    sid         = get_session_id(token)

    try:
        response = await agent.think(message, permissions=permissions, session_id=sid)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[chat] agent error: {e}", exc_info=True)
        return JSONResponse({"ok": False, "error": "Agent error. Please try again."}, status_code=500)

    # Log + count — only after a successful response
    if is_demo_session(token):
        new_count = increment_query_count(token)
        info = get_demo_info(token)
        log_access(
            ip=_get_ip(request),
            action="DEMO_QUERY",
            first_name=info.get("first_name", ""),
            last_name=info.get("last_name", ""),
            email=info.get("email", ""),
            session=token[:12],
            detail=f"query #{new_count}: {message[:80]}",
        )

    return {"ok": True, "response": response}


@router.get("/api/chat/stream")
async def chat_stream(request: Request, message: str = ""):
    """SSE streaming chat — yields chunks as Server-Sent Events."""
    if not message.strip():
        return JSONResponse({"ok": False, "error": "Empty message"})

    token = request.cookies.get(COOKIE)

    # Demo query limit check
    limit_err = _check_demo_limit(token)
    if limit_err:
        return JSONResponse(limit_err, status_code=429)

    agent       = get_agent()
    permissions = get_session_permissions(token)
    is_demo     = is_demo_session(token)
    sid         = get_session_id(token)

    async def event_stream():
        success = False
        try:
            async for chunk in agent.stream_think(message, permissions=permissions, session_id=sid):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            success = True
        except asyncio.CancelledError:
            pass
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[chat/stream] error: {e}", exc_info=True)
            yield f"data: {json.dumps({'chunk': f'[Error] {e}'})}\n\n"
        finally:
            # Count only after a successful stream — errors don't burn quota
            if success and is_demo:
                new_count = increment_query_count(token)
                info = get_demo_info(token)
                log_access(
                    ip=_get_ip(request),
                    action="DEMO_QUERY_STREAM",
                    first_name=info.get("first_name", ""),
                    last_name=info.get("last_name", ""),
                    email=info.get("email", ""),
                    session=token[:12],
                    detail=f"query #{new_count}: {message[:80]}",
                )
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
async def history(request: Request):
    sid = get_session_id(request.cookies.get(COOKIE))
    return {"ok": True, "history": get_history(limit=50, session_id=sid)}


@router.delete("/api/chat/history")
async def clear(request: Request):
    sid = get_session_id(request.cookies.get(COOKIE))
    clear_history(session_id=sid)
    return {"ok": True}
