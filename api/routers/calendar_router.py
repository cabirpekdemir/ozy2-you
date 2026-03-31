# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Calendar API Router"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


class EventCreate(BaseModel):
    title:       str
    start:       str
    end:         str
    description: Optional[str] = ""
    location:    Optional[str] = ""


@router.get("/events")
async def list_events(days: int = 7, limit: int = 20):
    try:
        from integrations.calendar_google import list_events
        events = list_events(days_ahead=days, max_results=limit)
        return {"ok": True, "events": events}
    except Exception as e:
        return {"ok": False, "error": str(e), "events": []}


@router.get("/today")
async def today():
    try:
        from integrations.calendar_google import today_events
        events = today_events()
        return {"ok": True, "events": events}
    except Exception as e:
        return {"ok": False, "error": str(e), "events": []}


@router.post("/events")
async def create_event(req: EventCreate):
    try:
        from integrations.calendar_google import create_event
        ev = create_event(
            title=req.title, start=req.start, end=req.end,
            description=req.description, location=req.location
        )
        return {"ok": bool(ev), "event": ev}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    try:
        from integrations.calendar_google import delete_event
        ok = delete_event(event_id)
        return {"ok": ok}
    except Exception as e:
        return {"ok": False, "error": str(e)}
