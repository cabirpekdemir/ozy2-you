# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Reminders API Router"""
import sqlite3
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "reminders.db"


def _get_db() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            due_date TEXT,
            done INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    return conn


class ReminderCreate(BaseModel):
    title:    str
    notes:    Optional[str] = ""
    due_date: Optional[str] = None


@router.get("")
async def list_reminders(done: Optional[int] = None):
    conn = _get_db()
    try:
        if done is not None:
            rows = conn.execute(
                "SELECT * FROM reminders WHERE done = ? ORDER BY due_date ASC, created_at ASC",
                (done,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM reminders ORDER BY due_date ASC, created_at ASC"
            ).fetchall()
        return {"ok": True, "reminders": [dict(r) for r in rows]}
    finally:
        conn.close()


@router.post("")
async def create_reminder(req: ReminderCreate):
    conn = _get_db()
    try:
        cur = conn.execute(
            "INSERT INTO reminders (title, notes, due_date) VALUES (?, ?, ?)",
            (req.title, req.notes or "", req.due_date)
        )
        conn.commit()
        return {"ok": True, "id": cur.lastrowid}
    finally:
        conn.close()


@router.post("/{reminder_id}/done")
async def mark_done(reminder_id: int):
    conn = _get_db()
    try:
        conn.execute(
            "UPDATE reminders SET done = 1 WHERE id = ?",
            (reminder_id,)
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: int):
    conn = _get_db()
    try:
        conn.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()
