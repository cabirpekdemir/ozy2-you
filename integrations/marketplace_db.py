# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Skill Marketplace database layer (SQLite)."""
import json
import sqlite3
from pathlib import Path
from typing import Optional

DB = Path(__file__).parent.parent / "data" / "marketplace.db"

COMMISSION_RATE = 0.15  # 15% platform commission


# ── DB setup ──────────────────────────────────────────────────────────────────

def _conn() -> sqlite3.Connection:
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(DB))
    con.row_factory = sqlite3.Row
    con.executescript("""
        CREATE TABLE IF NOT EXISTS skills (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            name             TEXT    NOT NULL,
            slug             TEXT    UNIQUE NOT NULL,
            description      TEXT    NOT NULL DEFAULT '',
            long_description TEXT    DEFAULT '',
            developer_id     TEXT    NOT NULL,
            developer_name   TEXT    NOT NULL,
            category         TEXT    NOT NULL DEFAULT 'Utilities',
            price            REAL    NOT NULL DEFAULT 0,
            version          TEXT    NOT NULL DEFAULT '1.0.0',
            icon             TEXT    DEFAULT '⚡',
            tags             TEXT    DEFAULT '[]',
            manifest         TEXT    DEFAULT '{}',
            status           TEXT    NOT NULL DEFAULT 'pending',
            installs         INTEGER NOT NULL DEFAULT 0,
            rating           REAL    NOT NULL DEFAULT 0,
            created_at       TEXT    DEFAULT (datetime('now')),
            updated_at       TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS installed_skills (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_id     INTEGER NOT NULL,
            installed_at TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_id          INTEGER NOT NULL,
            skill_name        TEXT    NOT NULL,
            developer_id      TEXT    NOT NULL,
            amount            REAL    NOT NULL,
            commission        REAL    NOT NULL,
            developer_payout  REAL    NOT NULL,
            status            TEXT    NOT NULL DEFAULT 'completed',
            created_at        TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (skill_id) REFERENCES skills(id)
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_id   INTEGER NOT NULL,
            rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment    TEXT    DEFAULT '',
            created_at TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );
    """)
    con.commit()
    return con


def _row_to_dict(row) -> dict:
    d = dict(row)
    d["tags"] = json.loads(d.get("tags") or "[]")
    return d


# ── Skills CRUD ───────────────────────────────────────────────────────────────

def list_skills(
    category: Optional[str] = None,
    q: Optional[str] = None,
    status: str = "published",
) -> list:
    con = _conn()
    try:
        sql = "SELECT * FROM skills WHERE status=?"
        params: list = [status]
        if category:
            sql += " AND category=?"
            params.append(category)
        if q:
            sql += " AND (name LIKE ? OR description LIKE ?)"
            params += [f"%{q}%", f"%{q}%"]
        sql += " ORDER BY installs DESC, created_at DESC"
        return [_row_to_dict(r) for r in con.execute(sql, params).fetchall()]
    finally:
        con.close()


def get_skill(skill_id: int) -> Optional[dict]:
    con = _conn()
    try:
        row = con.execute("SELECT * FROM skills WHERE id=?", (skill_id,)).fetchone()
        return _row_to_dict(row) if row else None
    finally:
        con.close()


def publish_skill(
    name: str,
    slug: str,
    description: str,
    long_description: str,
    developer_id: str,
    developer_name: str,
    category: str,
    price: float,
    icon: str,
    tags: list,
    manifest: dict,
    version: str = "1.0.0",
) -> int:
    con = _conn()
    try:
        cur = con.execute(
            """INSERT INTO skills
               (name, slug, description, long_description, developer_id, developer_name,
                category, price, icon, tags, manifest, version, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')""",
            (name, slug, description, long_description, developer_id, developer_name,
             category, price, icon, json.dumps(tags), json.dumps(manifest), version),
        )
        con.commit()
        return cur.lastrowid
    finally:
        con.close()


def approve_skill(skill_id: int) -> bool:
    con = _conn()
    try:
        con.execute("UPDATE skills SET status='published' WHERE id=?", (skill_id,))
        con.commit()
        return True
    finally:
        con.close()


def reject_skill(skill_id: int) -> bool:
    con = _conn()
    try:
        con.execute("UPDATE skills SET status='rejected' WHERE id=?", (skill_id,))
        con.commit()
        return True
    finally:
        con.close()


# ── Install / Uninstall ───────────────────────────────────────────────────────

def install_skill(skill_id: int) -> bool:
    con = _conn()
    try:
        if con.execute("SELECT id FROM installed_skills WHERE skill_id=?", (skill_id,)).fetchone():
            return False  # already installed
        con.execute("INSERT INTO installed_skills (skill_id) VALUES (?)", (skill_id,))
        con.execute("UPDATE skills SET installs=installs+1 WHERE id=?", (skill_id,))
        con.commit()
        return True
    finally:
        con.close()


def uninstall_skill(skill_id: int) -> bool:
    con = _conn()
    try:
        con.execute("DELETE FROM installed_skills WHERE skill_id=?", (skill_id,))
        con.commit()
        return True
    finally:
        con.close()


def list_installed() -> list:
    con = _conn()
    try:
        rows = con.execute(
            """SELECT s.*, ins.installed_at
               FROM skills s
               JOIN installed_skills ins ON s.id = ins.skill_id
               ORDER BY ins.installed_at DESC"""
        ).fetchall()
        return [_row_to_dict(r) for r in rows]
    finally:
        con.close()


# ── Transactions ──────────────────────────────────────────────────────────────

def record_transaction(skill_id: int, skill_name: str, developer_id: str, amount: float) -> int:
    commission = round(amount * COMMISSION_RATE, 2)
    payout     = round(amount - commission, 2)
    con = _conn()
    try:
        cur = con.execute(
            """INSERT INTO transactions
               (skill_id, skill_name, developer_id, amount, commission, developer_payout, status)
               VALUES (?, ?, ?, ?, ?, ?, 'completed')""",
            (skill_id, skill_name, developer_id, amount, commission, payout),
        )
        con.commit()
        return cur.lastrowid
    finally:
        con.close()


def revenue_summary() -> dict:
    con = _conn()
    try:
        row = con.execute(
            """SELECT
               COUNT(*)                    AS total_transactions,
               COALESCE(SUM(amount), 0)    AS total_revenue,
               COALESCE(SUM(commission), 0) AS total_commission,
               COALESCE(SUM(developer_payout), 0) AS total_payouts
               FROM transactions WHERE status='completed'"""
        ).fetchone()
        return dict(row) if row else {}
    finally:
        con.close()


def developer_revenue(developer_id: str) -> dict:
    con = _conn()
    try:
        row = con.execute(
            """SELECT
               COUNT(*)                          AS total_sales,
               COALESCE(SUM(amount), 0)           AS gross_revenue,
               COALESCE(SUM(developer_payout), 0) AS net_payout
               FROM transactions WHERE developer_id=? AND status='completed'""",
            (developer_id,),
        ).fetchone()
        return dict(row) if row else {}
    finally:
        con.close()


def get_developer_skills(developer_id: str) -> list:
    con = _conn()
    try:
        rows = con.execute(
            "SELECT * FROM skills WHERE developer_id=? ORDER BY created_at DESC",
            (developer_id,),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]
    finally:
        con.close()


# ── Reviews ───────────────────────────────────────────────────────────────────

def add_review(skill_id: int, rating: int, comment: str = "") -> bool:
    con = _conn()
    try:
        con.execute(
            "INSERT INTO reviews (skill_id, rating, comment) VALUES (?, ?, ?)",
            (skill_id, rating, comment),
        )
        avg_row = con.execute(
            "SELECT AVG(rating) AS avg FROM reviews WHERE skill_id=?", (skill_id,)
        ).fetchone()
        if avg_row and avg_row["avg"]:
            con.execute(
                "UPDATE skills SET rating=? WHERE id=?",
                (round(avg_row["avg"], 1), skill_id),
            )
        con.commit()
        return True
    finally:
        con.close()


def list_reviews(skill_id: int) -> list:
    con = _conn()
    try:
        rows = con.execute(
            "SELECT * FROM reviews WHERE skill_id=? ORDER BY created_at DESC",
            (skill_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        con.close()
