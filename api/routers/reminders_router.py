# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Reminders API Router — multi-user session isolation"""
import html
import sqlite3
from pathlib import Path
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional


def _s(v: str | None) -> str | None:
    return html.escape(v.strip()) if isinstance(v, str) else v


def _sid(request: Request) -> str | None:
    from api.routers.auth_router import COOKIE, get_session_id
    return get_session_id(request.cookies.get(COOKIE))


def _sid_filter(session_id):
    if session_id is None:
        return "session_id IS NULL", ()
    return "session_id=?", (session_id,)


router = APIRouter(prefix="/api/reminders", tags=["Reminders"])

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "reminders.db"


def _get_db() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT    NOT NULL,
            notes      TEXT    NOT NULL DEFAULT '',
            due_date   TEXT,
            done       INTEGER NOT NULL DEFAULT 0,
            session_id TEXT,
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)
    # Migration
    cols = [r[1] for r in conn.execute("PRAGMA table_info(reminders)").fetchall()]
    if "session_id" not in cols:
        conn.execute("ALTER TABLE reminders ADD COLUMN session_id TEXT")
    conn.commit()
    return conn


class ReminderCreate(BaseModel):
    title:    str
    notes:    Optional[str] = ""
    due_date: Optional[str] = None


@router.get("")
async def list_reminders(request: Request, done: Optional[int] = None):
    sid = _sid(request)
    sid_cond, sid_params = _sid_filter(sid)
    conn = _get_db()
    try:
        if done is not None:
            rows = conn.execute(
                f"SELECT * FROM reminders WHERE {sid_cond} AND done = ? "
                f"ORDER BY due_date ASC, created_at ASC",
                (*sid_params, done)
            ).fetchall()
        else:
            rows = conn.execute(
                f"SELECT * FROM reminders WHERE {sid_cond} "
                f"ORDER BY due_date ASC, created_at ASC",
                sid_params
            ).fetchall()
        return {"ok": True, "reminders": [dict(r) for r in rows]}
    finally:
        conn.close()


@router.post("")
async def create_reminder(request: Request, req: ReminderCreate):
    sid = _sid(request)
    conn = _get_db()
    try:
        cur = conn.execute(
            "INSERT INTO reminders (title, notes, due_date, session_id) VALUES (?, ?, ?, ?)",
            (_s(req.title), _s(req.notes) or "", req.due_date, sid)
        )
        conn.commit()
        return {"ok": True, "id": cur.lastrowid}
    finally:
        conn.close()


@router.post("/{reminder_id}/done")
async def mark_done(reminder_id: int, request: Request):
    sid = _sid(request)
    sid_cond, sid_params = _sid_filter(sid)
    conn = _get_db()
    try:
        conn.execute(
            f"UPDATE reminders SET done = 1 WHERE {sid_cond} AND id = ?",
            (*sid_params, reminder_id)
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: int, request: Request):
    sid = _sid(request)
    sid_cond, sid_params = _sid_filter(sid)
    conn = _get_db()
    try:
        conn.execute(
            f"DELETE FROM reminders WHERE {sid_cond} AND id = ?",
            (*sid_params, reminder_id)
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()
