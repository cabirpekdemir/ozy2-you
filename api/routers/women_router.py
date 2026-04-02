# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — Women's Health Router (Period Cycle + Pregnancy Tracker)"""
import html
import json
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/women", tags=["Women"])
_DB = Path(__file__).parent.parent.parent / "data" / "women.db"

# Baby size by week (week: [size_label, emoji])
_BABY_SIZE = {
    4:  ["Haşhaş tohumu", "🌱"], 5:  ["Susam tohumu", "🌿"], 6:  ["Mercimek", "🫘"],
    7:  ["Yaban mersini", "🫐"], 8:  ["Böğürtlen", "🫐"], 9:  ["Kiraz", "🍒"],
    10: ["Çilek", "🍓"], 11: ["İncir", "🫒"], 12: ["Kivi", "🥝"],
    13: ["Şeftali", "🍑"], 14: ["Limon", "🍋"], 15: ["Elma", "🍎"],
    16: ["Avokado", "🥑"], 17: ["Armut", "🍐"], 18: ["Tatlı patates", "🍠"],
    19: ["Mango", "🥭"], 20: ["Muz", "🍌"], 21: ["Havuç", "🥕"],
    22: ["Hindistan cevizi", "🥥"], 23: ["Grapefruit", "🍊"], 24: ["Mısır", "🌽"],
    25: ["Karnabahar", "🥦"], 26: ["Lahana", "🥬"], 27: ["Patlıcan", "🍆"],
    28: ["Pırasa", "🫛"], 29: ["Balkabağı", "🎃"], 30: ["Büyük lahana", "🥬"],
    31: ["Ananas", "🍍"], 32: ["Kavun", "🍈"], 33: ["Ananas", "🍍"],
    34: ["Karpuz (küçük)", "🍉"], 35: ["Bal kabağı", "🎃"], 36: ["Papatya kavunu", "🍈"],
    37: ["İsviçre chard", "🥬"], 38: ["Pırasa", "🫛"], 39: ["Karpuz", "🍉"],
    40: ["Küçük balkabağı", "🎃"],
}


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
        CREATE TABLE IF NOT EXISTS period_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            log_date    TEXT NOT NULL,
            flow        TEXT DEFAULT '',
            symptoms    TEXT DEFAULT '[]',
            note        TEXT DEFAULT '',
            session_id  TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS pregnancy (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            lmp_date    TEXT NOT NULL,
            due_date    TEXT,
            session_id  TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS pregnancy_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            log_date    TEXT NOT NULL,
            log_type    TEXT NOT NULL,
            value       TEXT DEFAULT '',
            note        TEXT DEFAULT '',
            session_id  TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );
    """)
    con.commit()
    return con


# ── Period ────────────────────────────────────────────────────────────────────

class PeriodLogCreate(BaseModel):
    log_date: str        # YYYY-MM-DD
    flow: Optional[str] = ""          # start|end|light|medium|heavy|spotting
    symptoms: Optional[List[str]] = []
    note: Optional[str] = ""

@router.get("/period/calendar/{year}/{month}")
async def period_calendar(year: int, month: int, request: Request):
    """Return period log entries for the given month."""
    sid = _sid(request)
    sc, sp = _sf(sid)
    month_str = f"{year:04d}-{month:02d}"
    with _db() as con:
        rows = con.execute(
            f"SELECT id, log_date, flow, symptoms, note FROM period_log "
            f"WHERE {sc} AND strftime('%Y-%m', log_date)=? ORDER BY log_date",
            (*sp, month_str)
        ).fetchall()
    return {"ok": True, "entries": [dict(r) for r in rows]}

@router.get("/period/day/{day_str}")
async def period_day(day_str: str, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        row = con.execute(
            f"SELECT * FROM period_log WHERE {sc} AND log_date=?",
            (*sp, day_str)
        ).fetchone()
    return {"ok": True, "entry": dict(row) if row else None}

@router.post("/period/log")
async def period_log(request: Request, req: PeriodLogCreate):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        existing = con.execute(
            f"SELECT id FROM period_log WHERE {sc} AND log_date=?",
            (*sp, req.log_date)
        ).fetchone()
        if existing:
            con.execute(
                f"UPDATE period_log SET flow=?, symptoms=?, note=? WHERE {sc} AND log_date=?",
                (req.flow, json.dumps(req.symptoms), _s(req.note), *sp, req.log_date)
            )
        else:
            con.execute(
                "INSERT INTO period_log (log_date, flow, symptoms, note, session_id) VALUES (?,?,?,?,?)",
                (req.log_date, req.flow, json.dumps(req.symptoms), _s(req.note), sid)
            )
        con.commit()
    return {"ok": True}

@router.delete("/period/log/{day_str}")
async def delete_period_log(day_str: str, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        con.execute(f"DELETE FROM period_log WHERE {sc} AND log_date=?", (*sp, day_str))
        con.commit()
    return {"ok": True}

@router.get("/period/stats")
async def period_stats(request: Request):
    """Cycle length estimate + predicted next period."""
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        rows = con.execute(
            f"SELECT log_date, flow FROM period_log WHERE {sc} AND flow='start' "
            f"ORDER BY log_date DESC LIMIT 6", sp
        ).fetchall()

    starts = [r["log_date"] for r in rows]
    avg_cycle = 28
    if len(starts) >= 2:
        deltas = []
        for i in range(len(starts) - 1):
            a = datetime.strptime(starts[i], "%Y-%m-%d")
            b = datetime.strptime(starts[i + 1], "%Y-%m-%d")
            deltas.append(abs((a - b).days))
        if deltas:
            avg_cycle = int(sum(deltas) / len(deltas))

    next_period = None
    if starts:
        last = datetime.strptime(starts[0], "%Y-%m-%d")
        next_period = (last + timedelta(days=avg_cycle)).strftime("%Y-%m-%d")
        # Fertile window (approx ovulation day-14 from next period)
        ovulation = last + timedelta(days=avg_cycle - 14)
        fertile_start = (ovulation - timedelta(days=2)).strftime("%Y-%m-%d")
        fertile_end   = (ovulation + timedelta(days=2)).strftime("%Y-%m-%d")
    else:
        fertile_start = fertile_end = None

    return {
        "ok": True,
        "avg_cycle_days": avg_cycle,
        "last_period_start": starts[0] if starts else None,
        "next_period_predicted": next_period,
        "fertile_start": fertile_start,
        "fertile_end": fertile_end,
    }


# ── Pregnancy ─────────────────────────────────────────────────────────────────

class PregnancyCreate(BaseModel):
    lmp_date: str   # YYYY-MM-DD Last menstrual period

class PregnancyLogCreate(BaseModel):
    log_date: str
    log_type: str   # weight|kick|appointment|symptom|note
    value: Optional[str] = ""
    note: Optional[str] = ""

@router.get("/pregnancy")
async def get_pregnancy(request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        row = con.execute(
            f"SELECT * FROM pregnancy WHERE {sc} ORDER BY id DESC LIMIT 1", sp
        ).fetchone()
    if not row:
        return {"ok": True, "pregnancy": None}
    p = dict(row)
    # Calculate current week
    lmp = datetime.strptime(p["lmp_date"], "%Y-%m-%d")
    due = lmp + timedelta(days=280)
    p["due_date"] = due.strftime("%Y-%m-%d")
    today = datetime.today()
    week = max(1, min(42, int((today - lmp).days // 7)))
    p["current_week"] = week
    size = _BABY_SIZE.get(week, _BABY_SIZE.get(40))
    p["baby_size"] = size[0]
    p["baby_emoji"] = size[1]
    p["days_remaining"] = max(0, (due - today).days)
    return {"ok": True, "pregnancy": p}

@router.post("/pregnancy")
async def save_pregnancy(request: Request, req: PregnancyCreate):
    sid = _sid(request)
    sc, sp = _sf(sid)
    lmp = datetime.strptime(req.lmp_date, "%Y-%m-%d")
    due = (lmp + timedelta(days=280)).strftime("%Y-%m-%d")
    with _db() as con:
        existing = con.execute(f"SELECT id FROM pregnancy WHERE {sc}", sp).fetchone()
        if existing:
            con.execute(
                f"UPDATE pregnancy SET lmp_date=?, due_date=? WHERE {sc}",
                (req.lmp_date, due, *sp)
            )
        else:
            con.execute(
                "INSERT INTO pregnancy (lmp_date, due_date, session_id) VALUES (?,?,?)",
                (req.lmp_date, due, sid)
            )
        con.commit()
    return {"ok": True, "due_date": due}

@router.delete("/pregnancy")
async def delete_pregnancy(request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        con.execute(f"DELETE FROM pregnancy WHERE {sc}", sp)
        con.execute(f"DELETE FROM pregnancy_log WHERE {sc}", sp)
        con.commit()
    return {"ok": True}

@router.get("/pregnancy/calendar/{year}/{month}")
async def pregnancy_calendar(year: int, month: int, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    month_str = f"{year:04d}-{month:02d}"
    with _db() as con:
        rows = con.execute(
            f"SELECT id, log_date, log_type, value, note FROM pregnancy_log "
            f"WHERE {sc} AND strftime('%Y-%m', log_date)=? ORDER BY log_date, id",
            (*sp, month_str)
        ).fetchall()
    # Group by day
    summary: dict = {}
    for r in rows:
        d = r["log_date"]
        if d not in summary:
            summary[d] = []
        summary[d].append(dict(r))
    return {"ok": True, "summary": summary}

@router.get("/pregnancy/logs")
async def pregnancy_logs(request: Request, limit: int = 50):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        rows = con.execute(
            f"SELECT * FROM pregnancy_log WHERE {sc} ORDER BY log_date DESC, id DESC LIMIT ?",
            (*sp, min(limit, 200))
        ).fetchall()
    return {"ok": True, "logs": [dict(r) for r in rows]}

@router.post("/pregnancy/log")
async def add_pregnancy_log(request: Request, req: PregnancyLogCreate):
    sid = _sid(request)
    with _db() as con:
        cur = con.execute(
            "INSERT INTO pregnancy_log (log_date, log_type, value, note, session_id) VALUES (?,?,?,?,?)",
            (req.log_date, _s(req.log_type), _s(req.value) or "", _s(req.note) or "", sid)
        )
        con.commit()
    return {"ok": True, "id": cur.lastrowid}

@router.delete("/pregnancy/log/{log_id}")
async def delete_pregnancy_log(log_id: int, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        con.execute(f"DELETE FROM pregnancy_log WHERE {sc} AND id=?", (*sp, log_id))
        con.commit()
    return {"ok": True}
