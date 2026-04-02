# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — Daily Diary Router (photo + text journal, calendar-based)"""
import html
import sqlite3
from pathlib import Path
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/daily", tags=["Daily"])
_DB = Path(__file__).parent.parent.parent / "data" / "daily.db"


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
        CREATE TABLE IF NOT EXISTS diary_entries (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_date  TEXT NOT NULL,
            photo_data  TEXT DEFAULT '',
            note        TEXT DEFAULT '',
            session_id  TEXT,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        );
    """)
    con.commit()
    return con


class DiaryEntryCreate(BaseModel):
    entry_date: str           # YYYY-MM-DD
    photo_data: Optional[str] = ""   # base64 data URL
    note: Optional[str] = ""


@router.get("/entry/{day_str}")
async def get_entry(day_str: str, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        row = con.execute(
            f"SELECT * FROM diary_entries WHERE {sc} AND entry_date=?",
            (*sp, day_str)
        ).fetchone()
    return {"ok": True, "entry": dict(row) if row else None}


@router.post("/entry")
async def save_entry(request: Request, req: DiaryEntryCreate):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        existing = con.execute(
            f"SELECT id FROM diary_entries WHERE {sc} AND entry_date=?",
            (*sp, req.entry_date)
        ).fetchone()
        if existing:
            con.execute(
                f"UPDATE diary_entries SET photo_data=?, note=?, updated_at=datetime('now') "
                f"WHERE {sc} AND entry_date=?",
                (req.photo_data or "", _s(req.note) or "", *sp, req.entry_date)
            )
        else:
            con.execute(
                "INSERT INTO diary_entries (entry_date, photo_data, note, session_id) VALUES (?,?,?,?)",
                (req.entry_date, req.photo_data or "", _s(req.note) or "", sid)
            )
        con.commit()
    return {"ok": True}


@router.delete("/entry/{day_str}")
async def delete_entry(day_str: str, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        con.execute(f"DELETE FROM diary_entries WHERE {sc} AND entry_date=?", (*sp, day_str))
        con.commit()
    return {"ok": True}


@router.get("/calendar/{year}/{month}")
async def calendar_summary(year: int, month: int, request: Request):
    """Which days have entries (with small photo_data for thumbnail)."""
    sid = _sid(request)
    sc, sp = _sf(sid)
    month_str = f"{year:04d}-{month:02d}"
    with _db() as con:
        rows = con.execute(
            f"SELECT entry_date, note, "
            f"CASE WHEN photo_data != '' THEN 1 ELSE 0 END as has_photo "
            f"FROM diary_entries WHERE {sc} AND strftime('%Y-%m', entry_date)=? "
            f"ORDER BY entry_date",
            (*sp, month_str)
        ).fetchall()
    summary = {r["entry_date"]: {"has_photo": bool(r["has_photo"]), "note": r["note"][:60]} for r in rows}
    return {"ok": True, "summary": summary}
