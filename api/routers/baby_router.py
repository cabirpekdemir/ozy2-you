# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — Baby Tracker Router"""
import html
import sqlite3
from datetime import date, datetime
from pathlib import Path
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/baby", tags=["Baby"])
_DB = Path(__file__).parent.parent.parent / "data" / "baby.db"


def _s(v):
    return html.escape(v.strip()) if isinstance(v, str) else v

def _sid(request: Request):
    from api.routers.auth_router import COOKIE, get_session_id
    return get_session_id(request.cookies.get(COOKIE))

def _sf(session_id):
    return ("session_id IS NULL", ()) if session_id is None else ("session_id=?", (session_id,))

def _db():
    _DB.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(str(_DB))
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript("""
        CREATE TABLE IF NOT EXISTS baby_profile (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            birth_date TEXT NOT NULL,
            session_id TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS baby_events (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            value      TEXT DEFAULT '',
            note       TEXT DEFAULT '',
            session_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    for tbl in ("baby_profile", "baby_events"):
        cols = [r[1] for r in con.execute(f"PRAGMA table_info({tbl})").fetchall()]
        if "session_id" not in cols:
            con.execute(f"ALTER TABLE {tbl} ADD COLUMN session_id TEXT")
    con.commit()
    return con


class ProfileCreate(BaseModel):
    name: str
    birth_date: str  # YYYY-MM-DD

class EventCreate(BaseModel):
    event_type: str
    value: Optional[str] = ""
    note: Optional[str] = ""


@router.get("/profile")
async def get_profile(request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        row = con.execute(
            f"SELECT * FROM baby_profile WHERE {sc} ORDER BY id DESC LIMIT 1", sp
        ).fetchone()
    return {"ok": True, "profile": dict(row) if row else None}


@router.post("/profile")
async def save_profile(request: Request, req: ProfileCreate):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        existing = con.execute(
            f"SELECT id FROM baby_profile WHERE {sc}", sp
        ).fetchone()
        if existing:
            con.execute(
                f"UPDATE baby_profile SET name=?, birth_date=?, updated_at=datetime('now') WHERE {sc}",
                (_s(req.name), req.birth_date, *sp)
            )
        else:
            con.execute(
                "INSERT INTO baby_profile (name, birth_date, session_id) VALUES (?,?,?)",
                (_s(req.name), req.birth_date, sid)
            )
        con.commit()
    return {"ok": True}


@router.get("/events")
async def list_events(request: Request, limit: int = 50):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        rows = con.execute(
            f"SELECT * FROM baby_events WHERE {sc} ORDER BY created_at DESC LIMIT ?",
            (*sp, min(limit, 200))
        ).fetchall()
    return {"ok": True, "events": [dict(r) for r in rows]}


@router.post("/event")
async def add_event(request: Request, req: EventCreate):
    sid = _sid(request)
    with _db() as con:
        cur = con.execute(
            "INSERT INTO baby_events (event_type, value, note, session_id) VALUES (?,?,?,?)",
            (_s(req.event_type), _s(req.value) or "", _s(req.note) or "", sid)
        )
        con.commit()
    return {"ok": True, "id": cur.lastrowid}


@router.delete("/event/{event_id}")
async def delete_event(event_id: int, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        con.execute(f"DELETE FROM baby_events WHERE {sc} AND id=?", (*sp, event_id))
        con.commit()
    return {"ok": True}


@router.get("/stats")
async def stats(request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    today_str = str(date.today())
    with _db() as con:
        last_feed = con.execute(
            f"SELECT created_at FROM baby_events WHERE {sc} AND event_type='feed' ORDER BY created_at DESC LIMIT 1",
            sp
        ).fetchone()
        last_diaper = con.execute(
            f"SELECT created_at FROM baby_events WHERE {sc} AND event_type='diaper' ORDER BY created_at DESC LIMIT 1",
            sp
        ).fetchone()
        feed_count = con.execute(
            f"SELECT COUNT(*) as c FROM baby_events WHERE {sc} AND event_type='feed' AND date(created_at)=?",
            (*sp, today_str)
        ).fetchone()["c"]
        diaper_count = con.execute(
            f"SELECT COUNT(*) as c FROM baby_events WHERE {sc} AND event_type='diaper' AND date(created_at)=?",
            (*sp, today_str)
        ).fetchone()["c"]
        # Sleep: pair sleep_start / sleep_end events today
        sleep_starts = con.execute(
            f"SELECT created_at FROM baby_events WHERE {sc} AND event_type='sleep_start' AND date(created_at)=?",
            (*sp, today_str)
        ).fetchall()
        sleep_ends = con.execute(
            f"SELECT created_at FROM baby_events WHERE {sc} AND event_type='sleep_end' AND date(created_at)=?",
            (*sp, today_str)
        ).fetchall()
    # Simple sleep calc: sum each paired start/end
    total_sleep_min = 0
    for i, start_row in enumerate(sleep_starts):
        if i < len(sleep_ends):
            try:
                s = datetime.fromisoformat(start_row["created_at"])
                e = datetime.fromisoformat(sleep_ends[i]["created_at"])
                total_sleep_min += max(0, int((e - s).total_seconds() / 60))
            except Exception:
                pass
    return {
        "ok": True,
        "last_feed": last_feed["created_at"] if last_feed else None,
        "last_diaper": last_diaper["created_at"] if last_diaper else None,
        "today_feed_count": feed_count,
        "today_diaper_count": diaper_count,
        "total_sleep_today_min": total_sleep_min,
    }
