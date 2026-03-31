# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — Memory
Single responsibility: store and retrieve facts & conversation history.
"""
import json
import sqlite3
import logging
from datetime import datetime
from pathlib import Path

logger  = logging.getLogger(__name__)
DB_PATH = Path(__file__).parent.parent / "data" / "memory.db"


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with _conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS facts (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                key       TEXT NOT NULL,
                value     TEXT NOT NULL,
                category  TEXT DEFAULT 'general',
                source    TEXT DEFAULT 'user',
                created   TEXT DEFAULT (datetime('now')),
                updated   TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS history (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                role     TEXT NOT NULL,
                content  TEXT NOT NULL,
                ts       TEXT DEFAULT (datetime('now'))
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_facts_key ON facts(key);
        """)


# ── Facts ─────────────────────────────────────────────────────────────────────

def save_fact(key: str, value: str, category: str = "general", source: str = "user"):
    with _conn() as c:
        c.execute("""
            INSERT INTO facts (key, value, category, source)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value=excluded.value,
                updated=datetime('now')
        """, (key, value, category, source))


def get_fact(key: str) -> str | None:
    with _conn() as c:
        row = c.execute("SELECT value FROM facts WHERE key=?", (key,)).fetchone()
        return row["value"] if row else None


def get_all_facts(category: str | None = None) -> list[dict]:
    with _conn() as c:
        if category:
            rows = c.execute(
                "SELECT * FROM facts WHERE category=? ORDER BY updated DESC", (category,)
            ).fetchall()
        else:
            rows = c.execute("SELECT * FROM facts ORDER BY updated DESC").fetchall()
        return [dict(r) for r in rows]


def delete_fact(key: str):
    with _conn() as c:
        c.execute("DELETE FROM facts WHERE key=?", (key,))


def clear_facts():
    with _conn() as c:
        c.execute("DELETE FROM facts")


# ── Conversation History ───────────────────────────────────────────────────────

def add_message(role: str, content: str):
    with _conn() as c:
        c.execute("INSERT INTO history (role, content) VALUES (?, ?)", (role, content))
    _trim_history()


def get_history(limit: int = 30) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT role, content, ts FROM history ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


def clear_history():
    with _conn() as c:
        c.execute("DELETE FROM history")


def _trim_history(keep: int = 200):
    with _conn() as c:
        c.execute("""
            DELETE FROM history WHERE id NOT IN (
                SELECT id FROM history ORDER BY id DESC LIMIT ?
            )
        """, (keep,))


def build_memory_block() -> str:
    """Returns a formatted string of facts for system prompt injection."""
    facts = get_all_facts()
    if not facts:
        return ""
    lines = ["📋 What I know about you:"]
    for f in facts[:20]:
        lines.append(f"  • {f['key']}: {f['value']}")
    return "\n".join(lines)


# Init on import
init_db()
