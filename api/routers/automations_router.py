# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — Automations Router (schedule-based and manual triggers)"""
import asyncio
import html
import json
import logging
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/automations", tags=["Automations"])
logger = logging.getLogger(__name__)
_DB = Path(__file__).parent.parent.parent / "data" / "automations.db"

# ── DB ────────────────────────────────────────────────────────────────────────

def _db():
    _DB.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(str(_DB))
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript("""
        CREATE TABLE IF NOT EXISTS automations (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            name           TEXT NOT NULL,
            description    TEXT DEFAULT '',
            enabled        INTEGER DEFAULT 1,
            trigger_type   TEXT NOT NULL DEFAULT 'manual',
            interval_min   INTEGER DEFAULT 0,
            daily_hour     INTEGER DEFAULT 8,
            daily_minute   INTEGER DEFAULT 0,
            weekly_day     INTEGER DEFAULT 0,
            trigger_days   TEXT DEFAULT '',
            action_type    TEXT NOT NULL,
            action_config  TEXT DEFAULT '{}',
            output_channel TEXT DEFAULT 'inapp',
            last_run       TEXT DEFAULT NULL,
            next_run       TEXT DEFAULT NULL,
            run_count      INTEGER DEFAULT 0,
            session_id     TEXT,
            created_at     TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS automation_logs (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            automation_id  INTEGER NOT NULL,
            ran_at         TEXT DEFAULT (datetime('now')),
            status         TEXT DEFAULT 'success',
            result         TEXT DEFAULT '',
            FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
        );
    """)
    con.commit()
    return con


def _s(v):
    return html.escape(v.strip()) if isinstance(v, str) else v

def _sid(request: Request):
    from api.routers.auth_router import COOKIE, get_session_id
    return get_session_id(request.cookies.get(COOKIE))

def _sf(session_id):
    return ("session_id IS NULL", ()) if session_id is None else ("session_id=?", (session_id,))


# ── Next run calculator ────────────────────────────────────────────────────────

def _calc_next_run(row: dict) -> str | None:
    tt = row.get("trigger_type", "manual")
    now = datetime.utcnow()
    if tt == "manual":
        return None
    if tt == "interval":
        m = row.get("interval_min", 30) or 30
        return (now + timedelta(minutes=m)).strftime("%Y-%m-%d %H:%M:%S")
    if tt == "daily":
        h, mi = row.get("daily_hour", 8), row.get("daily_minute", 0)
        t = now.replace(hour=h, minute=mi, second=0, microsecond=0)
        if t <= now:
            t += timedelta(days=1)
        return t.strftime("%Y-%m-%d %H:%M:%S")
    if tt == "weekly":
        wd = row.get("weekly_day", 0)  # 0=Mon
        h, mi = row.get("daily_hour", 8), row.get("daily_minute", 0)
        days_ahead = (wd - now.weekday()) % 7
        if days_ahead == 0:
            t = now.replace(hour=h, minute=mi, second=0, microsecond=0)
            if t <= now:
                days_ahead = 7
            else:
                return t.strftime("%Y-%m-%d %H:%M:%S")
        t = (now + timedelta(days=days_ahead)).replace(hour=h, minute=mi, second=0, microsecond=0)
        return t.strftime("%Y-%m-%d %H:%M:%S")
    return None


# ── Models ────────────────────────────────────────────────────────────────────

class AutomationCreate(BaseModel):
    name:           str
    description:    Optional[str] = ""
    trigger_type:   Optional[str] = "manual"  # manual|interval|daily|weekly
    interval_min:   Optional[int] = 30
    daily_hour:     Optional[int] = 8
    daily_minute:   Optional[int] = 0
    weekly_day:     Optional[int] = 0          # 0=Mon…6=Sun
    action_type:    str
    action_config:  Optional[dict] = {}
    output_channel: Optional[str] = "inapp"   # inapp|telegram|both

class AutomationUpdate(AutomationCreate):
    pass


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_automations(request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        rows = con.execute(
            f"SELECT * FROM automations WHERE {sc} ORDER BY created_at DESC", sp
        ).fetchall()
    return {"ok": True, "automations": [dict(r) for r in rows]}


@router.post("")
async def create_automation(request: Request, req: AutomationCreate):
    sid = _sid(request)
    row = req.dict()
    row["next_run"] = _calc_next_run(row)
    with _db() as con:
        cur = con.execute(
            """INSERT INTO automations
               (name, description, trigger_type, interval_min, daily_hour, daily_minute,
                weekly_day, action_type, action_config, output_channel, next_run, session_id)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (_s(req.name), _s(req.description), req.trigger_type,
             req.interval_min, req.daily_hour, req.daily_minute,
             req.weekly_day, req.action_type,
             json.dumps(req.action_config or {}),
             req.output_channel, row["next_run"], sid)
        )
        con.commit()
    return {"ok": True, "id": cur.lastrowid}


@router.put("/{aid}")
async def update_automation(aid: int, request: Request, req: AutomationUpdate):
    sid = _sid(request)
    sc, sp = _sf(sid)
    row = req.dict()
    next_run = _calc_next_run(row)
    with _db() as con:
        con.execute(
            f"""UPDATE automations SET
                name=?, description=?, trigger_type=?, interval_min=?,
                daily_hour=?, daily_minute=?, weekly_day=?,
                action_type=?, action_config=?, output_channel=?, next_run=?
                WHERE {sc} AND id=?""",
            (_s(req.name), _s(req.description), req.trigger_type,
             req.interval_min, req.daily_hour, req.daily_minute,
             req.weekly_day, req.action_type,
             json.dumps(req.action_config or {}),
             req.output_channel, next_run, *sp, aid)
        )
        con.commit()
    return {"ok": True}


@router.patch("/{aid}/toggle")
async def toggle_automation(aid: int, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        cur = con.execute(
            f"SELECT enabled FROM automations WHERE {sc} AND id=?", (*sp, aid)
        ).fetchone()
        if not cur:
            return {"ok": False, "error": "Not found"}
        new_state = 0 if cur["enabled"] else 1
        next_run = None
        if new_state:
            row_full = con.execute(f"SELECT * FROM automations WHERE id=?", (aid,)).fetchone()
            next_run = _calc_next_run(dict(row_full)) if row_full else None
        con.execute(
            f"UPDATE automations SET enabled=?, next_run=? WHERE {sc} AND id=?",
            (new_state, next_run, *sp, aid)
        )
        con.commit()
    return {"ok": True, "enabled": bool(new_state)}


@router.delete("/{aid}")
async def delete_automation(aid: int, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        con.execute(f"DELETE FROM automations WHERE {sc} AND id=?", (*sp, aid))
        con.commit()
    return {"ok": True}


@router.get("/{aid}/logs")
async def get_logs(aid: int, request: Request):
    with _db() as con:
        rows = con.execute(
            "SELECT * FROM automation_logs WHERE automation_id=? ORDER BY ran_at DESC LIMIT 50",
            (aid,)
        ).fetchall()
    return {"ok": True, "logs": [dict(r) for r in rows]}


@router.post("/{aid}/run")
async def run_now(aid: int, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        row = con.execute(
            f"SELECT * FROM automations WHERE {sc} AND id=?", (*sp, aid)
        ).fetchone()
    if not row:
        return {"ok": False, "error": "Not found"}
    result = await _execute_action(dict(row))
    with _db() as con:
        con.execute(
            "INSERT INTO automation_logs (automation_id, status, result) VALUES (?,?,?)",
            (aid, result["status"], result["message"])
        )
        next_run = _calc_next_run(dict(row))
        con.execute(
            "UPDATE automations SET last_run=datetime('now'), run_count=run_count+1, next_run=? WHERE id=?",
            (next_run, aid)
        )
        con.commit()
    return {"ok": True, **result}


# ── Action executor ───────────────────────────────────────────────────────────

async def _execute_action(row: dict) -> dict:
    action = row.get("action_type", "")
    cfg    = json.loads(row.get("action_config") or "{}")
    channel = row.get("output_channel", "inapp")
    msg = ""
    status = "success"

    try:
        if action == "briefing":
            from api.routers.briefing_router import generate_briefing
            msg = await generate_briefing()
        elif action == "email_check":
            msg = "📧 Email check triggered."
        elif action == "calendar_summary":
            msg = "📅 Calendar summary triggered."
        elif action == "ai_prompt":
            prompt = cfg.get("prompt", "Give me a short motivational message.")
            from core.agent import Agent
            from core.llm import get_llm
            llm = get_llm()
            agent = Agent(llm)
            msg = await agent.think(prompt)
        elif action == "reminder":
            text = cfg.get("text", "Reminder!")
            from core.memory import save_fact
            save_fact(f"reminder_{datetime.utcnow().timestamp()}", text, category="reminder",
                      session_id=row.get("session_id"))
            msg = f"⏰ Reminder set: {text}"
        elif action == "note":
            text = cfg.get("text", "Auto-note")
            msg = f"📝 Note: {text}"
        elif action == "water_reminder":
            msg = "💧 Time to drink water! Stay hydrated."
        elif action == "step_check":
            msg = "👟 Don't forget to move — take a short walk!"
        elif action == "medication":
            name = cfg.get("name", "medication")
            msg = f"💊 Medication reminder: {name}"
        elif action == "sleep_reminder":
            msg = "😴 Time to wind down and get ready for sleep."
        elif action == "task_check":
            msg = "✅ Time to review your task list!"
        elif action == "weather":
            msg = "🌤️ Weather check triggered."
        elif action == "news_summary":
            msg = "📰 News summary triggered."
        elif action == "stock_check":
            symbols = cfg.get("symbols", "BTC")
            msg = f"📈 Stock check: {symbols}"
        elif action == "custom_message":
            msg = cfg.get("message", "OZY Automation triggered.")
        else:
            msg = f"Action '{action}' executed."

        # Send to Telegram if configured
        if channel in ("telegram", "both") and msg:
            try:
                from api.routers.telegram_router import send_telegram_message
                await send_telegram_message(msg)
            except Exception as e:
                logger.warning(f"[Automations] Telegram send failed: {e}")

    except Exception as e:
        logger.error(f"[Automations] Action '{action}' failed: {e}")
        status = "error"
        msg = str(e)

    return {"status": status, "message": msg or "Done"}


# ── Background scheduler ───────────────────────────────────────────────────────

async def automation_scheduler():
    """Runs every 60 seconds, fires due automations."""
    logger.info("[Automations] Scheduler started")
    while True:
        await asyncio.sleep(60)
        try:
            now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            with _db() as con:
                due = con.execute(
                    "SELECT * FROM automations WHERE enabled=1 AND trigger_type != 'manual' "
                    "AND next_run IS NOT NULL AND next_run <= ?", (now,)
                ).fetchall()
            for row in due:
                row = dict(row)
                result = await _execute_action(row)
                next_run = _calc_next_run(row)
                with _db() as con:
                    con.execute(
                        "INSERT INTO automation_logs (automation_id, status, result) VALUES (?,?,?)",
                        (row["id"], result["status"], result["message"])
                    )
                    con.execute(
                        "UPDATE automations SET last_run=?, run_count=run_count+1, next_run=? WHERE id=?",
                        (now, next_run, row["id"])
                    )
                    con.commit()
                logger.info(f"[Automations] Ran '{row['name']}': {result['status']}")
        except Exception as e:
            logger.error(f"[Automations] Scheduler error: {e}")
