# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Notes API Router"""
import html
import sqlite3
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional


def _s(v: str | None) -> str | None:
    return html.escape(v.strip()) if isinstance(v, str) else v

router = APIRouter(prefix="/api/notes", tags=["Notes"])

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "notes.db"


def _get_db() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            pinned INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    return conn


class NoteCreate(BaseModel):
    title:   str
    content: Optional[str] = ""


class NoteUpdate(BaseModel):
    title:   Optional[str] = None
    content: Optional[str] = None
    pinned:  Optional[int] = None


@router.get("")
async def list_notes(q: Optional[str] = None):
    conn = _get_db()
    try:
        if q:
            rows = conn.execute(
                "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC",
                (f"%{q}%", f"%{q}%")
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"
            ).fetchall()
        return {"ok": True, "notes": [dict(r) for r in rows]}
    finally:
        conn.close()


@router.post("")
async def create_note(req: NoteCreate):
    conn = _get_db()
    try:
        cur = conn.execute(
            "INSERT INTO notes (title, content) VALUES (?, ?)",
            (_s(req.title), _s(req.content) or "")
        )
        conn.commit()
        return {"ok": True, "id": cur.lastrowid}
    finally:
        conn.close()


@router.patch("/{note_id}")
async def update_note(note_id: int, req: NoteUpdate):
    data = req.dict(exclude_none=True)
    if not data:
        return {"ok": True}
    conn = _get_db()
    try:
        data["updated_at"] = "datetime('now')"
        set_clauses = ", ".join(
            f"{k} = datetime('now')" if k == "updated_at" else f"{k} = ?"
            for k in data
        )
        values = [v for k, v in data.items() if k != "updated_at"]
        values.append(note_id)
        conn.execute(
            f"UPDATE notes SET {set_clauses} WHERE id = ?",
            values
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.delete("/{note_id}")
async def delete_note(note_id: int):
    conn = _get_db()
    try:
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()
