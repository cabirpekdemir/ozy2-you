# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Notes API Router — multi-user session isolation"""
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


router = APIRouter(prefix="/api/notes", tags=["Notes"])

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "notes.db"


def _get_db() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT    NOT NULL,
            content    TEXT    NOT NULL DEFAULT '',
            pinned     INTEGER NOT NULL DEFAULT 0,
            session_id TEXT,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)
    # Migration
    cols = [r[1] for r in conn.execute("PRAGMA table_info(notes)").fetchall()]
    if "session_id" not in cols:
        conn.execute("ALTER TABLE notes ADD COLUMN session_id TEXT")
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
async def list_notes(request: Request, q: Optional[str] = None):
    sid = _sid(request)
    sid_cond, sid_params = _sid_filter(sid)
    conn = _get_db()
    try:
        if q:
            rows = conn.execute(
                f"SELECT * FROM notes WHERE {sid_cond} AND (title LIKE ? OR content LIKE ?) "
                f"ORDER BY pinned DESC, updated_at DESC",
                (*sid_params, f"%{q}%", f"%{q}%")
            ).fetchall()
        else:
            rows = conn.execute(
                f"SELECT * FROM notes WHERE {sid_cond} ORDER BY pinned DESC, updated_at DESC",
                sid_params
            ).fetchall()
        return {"ok": True, "notes": [dict(r) for r in rows]}
    finally:
        conn.close()


@router.post("")
async def create_note(request: Request, req: NoteCreate):
    sid = _sid(request)
    conn = _get_db()
    try:
        cur = conn.execute(
            "INSERT INTO notes (title, content, session_id) VALUES (?, ?, ?)",
            (_s(req.title), _s(req.content) or "", sid)
        )
        conn.commit()
        return {"ok": True, "id": cur.lastrowid}
    finally:
        conn.close()


@router.patch("/{note_id}")
async def update_note(note_id: int, request: Request, req: NoteUpdate):
    sid = _sid(request)
    sid_cond, sid_params = _sid_filter(sid)
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
        values += list(sid_params) + [note_id]
        conn.execute(
            f"UPDATE notes SET {set_clauses} WHERE {sid_cond} AND id = ?",
            values
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.delete("/{note_id}")
async def delete_note(note_id: int, request: Request):
    sid = _sid(request)
    sid_cond, sid_params = _sid_filter(sid)
    conn = _get_db()
    try:
        conn.execute(f"DELETE FROM notes WHERE {sid_cond} AND id = ?", (*sid_params, note_id))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()
