# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Tasks (SQLite) — multi-user session isolation"""
import sqlite3
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

DB = Path(__file__).parent.parent / "data" / "tasks.db"


def _sid_filter(session_id):
    if session_id is None:
        return "session_id IS NULL", ()
    return "session_id=?", (session_id,)


def _conn():
    DB.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(str(DB))
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL,
            notes       TEXT    DEFAULT '',
            status      TEXT    DEFAULT 'todo',
            priority    TEXT    DEFAULT 'normal',
            due_date    TEXT,
            session_id  TEXT,
            created_at  TEXT    DEFAULT (datetime('now')),
            updated_at  TEXT    DEFAULT (datetime('now'))
        )
    """)
    # Migration: add session_id if missing
    cols = [r[1] for r in con.execute("PRAGMA table_info(tasks)").fetchall()]
    if "session_id" not in cols:
        con.execute("ALTER TABLE tasks ADD COLUMN session_id TEXT")
    con.commit()
    return con


def list_tasks(status: Optional[str] = None, session_id: str = None) -> list:
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as con:
        if status:
            rows = con.execute(
                f"SELECT * FROM tasks WHERE {sid_cond} AND status=? "
                f"ORDER BY priority DESC, created_at DESC",
                (*sid_params, status)
            ).fetchall()
        else:
            rows = con.execute(
                f"SELECT * FROM tasks WHERE {sid_cond} "
                f"ORDER BY priority DESC, created_at DESC",
                sid_params
            ).fetchall()
        return [dict(r) for r in rows]


def add_task(title: str, notes: str = "", priority: str = "normal",
             due_date: Optional[str] = None, session_id: str = None) -> int:
    with _conn() as con:
        cur = con.execute(
            "INSERT INTO tasks (title, notes, priority, due_date, session_id) VALUES (?,?,?,?,?)",
            (title, notes, priority, due_date, session_id)
        )
        return cur.lastrowid


def update_task(task_id: int, session_id: str = None, **kwargs) -> bool:
    allowed = {"title", "notes", "status", "priority", "due_date"}
    data    = {k: v for k, v in kwargs.items() if k in allowed}
    if not data:
        return False
    data["updated_at"] = datetime.now().isoformat()
    sid_cond, sid_params = _sid_filter(session_id)
    sets   = ", ".join(f"{k}=?" for k in data)
    values = list(data.values()) + list(sid_params) + [task_id]
    with _conn() as con:
        con.execute(f"UPDATE tasks SET {sets} WHERE {sid_cond} AND id=?", values)
    return True


def delete_task(task_id: int, session_id: str = None) -> bool:
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as con:
        con.execute(f"DELETE FROM tasks WHERE {sid_cond} AND id=?", (*sid_params, task_id))
    return True


def complete_task(task_id: int, session_id: str = None) -> bool:
    return update_task(task_id, session_id=session_id, status="done")
