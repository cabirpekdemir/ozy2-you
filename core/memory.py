# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — Memory
Single responsibility: store and retrieve facts & conversation history.
Supports session_id isolation for multi-user demo mode.
"""
import sqlite3
import logging
from pathlib import Path

logger  = logging.getLogger(__name__)
DB_PATH = Path(__file__).parent.parent / "data" / "memory.db"


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    return c


def _sid_filter(session_id):
    """Returns (sql_condition, params_tuple) for session_id filtering."""
    if session_id is None:
        return "session_id IS NULL", ()
    return "session_id=?", (session_id,)


def init_db():
    with _conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS facts (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                key       TEXT NOT NULL,
                value     TEXT NOT NULL,
                category  TEXT DEFAULT 'general',
                source    TEXT DEFAULT 'user',
                session_id TEXT,
                created   TEXT DEFAULT (datetime('now')),
                updated   TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS history (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                role       TEXT NOT NULL,
                content    TEXT NOT NULL,
                session_id TEXT,
                ts         TEXT DEFAULT (datetime('now'))
            );
        """)
        # Migration: add session_id column if missing (for existing installs)
        for table in ("facts", "history"):
            cols = [r[1] for r in c.execute(f"PRAGMA table_info({table})").fetchall()]
            if "session_id" not in cols:
                c.execute(f"ALTER TABLE {table} ADD COLUMN session_id TEXT")
        # Unique index on (key, session_id) — replaces old idx_facts_key
        c.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_facts_key_sid
            ON facts(key, session_id)
        """)
        c.commit()


# ── Facts ─────────────────────────────────────────────────────────────────────

def save_fact(key: str, value: str, category: str = "general",
              source: str = "user", session_id: str = None):
    with _conn() as c:
        c.execute("""
            INSERT INTO facts (key, value, category, source, session_id)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(key, session_id) DO UPDATE SET
                value=excluded.value,
                updated=datetime('now')
        """, (key, value, category, source, session_id))


def get_fact(key: str, session_id: str = None) -> str | None:
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        row = c.execute(
            f"SELECT value FROM facts WHERE key=? AND {sid_cond}",
            (key, *sid_params)
        ).fetchone()
        return row["value"] if row else None


def get_all_facts(category: str | None = None, session_id: str = None) -> list[dict]:
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        if category:
            rows = c.execute(
                f"SELECT * FROM facts WHERE {sid_cond} AND category=? ORDER BY updated DESC",
                (*sid_params, category)
            ).fetchall()
        else:
            rows = c.execute(
                f"SELECT * FROM facts WHERE {sid_cond} ORDER BY updated DESC",
                sid_params
            ).fetchall()
        return [dict(r) for r in rows]


def delete_fact(key: str, session_id: str = None):
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        c.execute(f"DELETE FROM facts WHERE key=? AND {sid_cond}", (key, *sid_params))


def clear_facts(session_id: str = None):
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        c.execute(f"DELETE FROM facts WHERE {sid_cond}", sid_params)


# ── Conversation History ───────────────────────────────────────────────────────

def add_message(role: str, content: str, session_id: str = None):
    with _conn() as c:
        c.execute(
            "INSERT INTO history (role, content, session_id) VALUES (?, ?, ?)",
            (role, content, session_id)
        )
    _trim_history(session_id=session_id)


def get_history(limit: int = 30, session_id: str = None) -> list[dict]:
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        rows = c.execute(
            f"SELECT role, content, ts FROM history WHERE {sid_cond} ORDER BY id DESC LIMIT ?",
            (*sid_params, limit)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


def clear_history(session_id: str = None):
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        c.execute(f"DELETE FROM history WHERE {sid_cond}", sid_params)


def count_history(session_id: str = None) -> int:
    """Return total number of messages in history for a session."""
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        row = c.execute(
            f"SELECT COUNT(*) FROM history WHERE {sid_cond}", sid_params
        ).fetchone()
        return row[0] if row else 0


def get_history_slice(offset: int = 0, limit: int = 8,
                      session_id: str = None) -> list[dict]:
    """Get history messages with an offset, oldest-first (for summary building)."""
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        rows = c.execute(
            f"SELECT role, content, ts FROM history WHERE {sid_cond} "
            f"ORDER BY id ASC LIMIT ? OFFSET ?",
            (*sid_params, limit, offset)
        ).fetchall()
        return [dict(r) for r in rows]


def _trim_history(keep: int = 200, session_id: str = None):
    sid_cond, sid_params = _sid_filter(session_id)
    with _conn() as c:
        c.execute(f"""
            DELETE FROM history WHERE {sid_cond} AND id NOT IN (
                SELECT id FROM history WHERE {sid_cond}
                ORDER BY id DESC LIMIT ?
            )
        """, (*sid_params, *sid_params, keep))


def build_memory_block(session_id: str = None, query: str = "",
                       max_facts: int = 5) -> str:
    """Returns a formatted string of relevant facts for system prompt injection.

    If a query is provided, uses keyword matching to select the most relevant
    facts (up to max_facts). Falls back to most-recently-updated facts.
    """
    all_facts = get_all_facts(session_id=session_id)
    if not all_facts:
        return ""

    if query:
        # Score each fact by how many query words appear in key+value
        words = set(query.lower().split())
        stop = {"the", "a", "an", "is", "are", "was", "were", "i", "my",
                "me", "you", "can", "what", "how", "do", "did", "in", "on",
                "at", "to", "for", "of", "and", "or", "it", "its"}
        words -= stop

        def _score(f):
            text = f"{f['key']} {f['value']}".lower()
            return sum(1 for w in words if w in text)

        scored = sorted(all_facts, key=_score, reverse=True)
        # Take top matches; if not enough, pad with most-recent facts
        relevant = [f for f in scored if _score(f) > 0][:max_facts]
        if len(relevant) < max_facts:
            seen = {f["id"] for f in relevant}
            for f in all_facts:
                if f["id"] not in seen:
                    relevant.append(f)
                if len(relevant) >= max_facts:
                    break
        facts = relevant
    else:
        facts = all_facts[:max_facts]

    lines = ["📋 What I know about you:"]
    for f in facts:
        lines.append(f"  • {f['key']}: {f['value']}")
    return "\n".join(lines)


# Init on import
init_db()
