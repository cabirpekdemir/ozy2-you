"""OZY2 — Tasks (SQLite)"""
import sqlite3
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

DB = Path(__file__).parent.parent / "data" / "tasks.db"


def _conn():
    DB.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(str(DB))
    con.row_factory = sqlite3.Row
    con.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL,
            notes       TEXT    DEFAULT '',
            status      TEXT    DEFAULT 'todo',
            priority    TEXT    DEFAULT 'normal',
            due_date    TEXT,
            created_at  TEXT    DEFAULT (datetime('now')),
            updated_at  TEXT    DEFAULT (datetime('now'))
        )
    """)
    con.commit()
    return con


def list_tasks(status: Optional[str] = None) -> list:
    with _conn() as con:
        if status:
            rows = con.execute(
                "SELECT * FROM tasks WHERE status=? ORDER BY priority DESC, created_at DESC",
                (status,)
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT * FROM tasks ORDER BY priority DESC, created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def add_task(title: str, notes: str = "", priority: str = "normal",
             due_date: Optional[str] = None) -> int:
    with _conn() as con:
        cur = con.execute(
            "INSERT INTO tasks (title,notes,priority,due_date) VALUES (?,?,?,?)",
            (title, notes, priority, due_date)
        )
        return cur.lastrowid


def update_task(task_id: int, **kwargs) -> bool:
    allowed = {"title", "notes", "status", "priority", "due_date"}
    data    = {k: v for k, v in kwargs.items() if k in allowed}
    if not data:
        return False
    data["updated_at"] = datetime.now().isoformat()
    sets   = ", ".join(f"{k}=?" for k in data)
    values = list(data.values()) + [task_id]
    with _conn() as con:
        con.execute(f"UPDATE tasks SET {sets} WHERE id=?", values)
    return True


def delete_task(task_id: int) -> bool:
    with _conn() as con:
        con.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    return True


def complete_task(task_id: int) -> bool:
    return update_task(task_id, status="done")
