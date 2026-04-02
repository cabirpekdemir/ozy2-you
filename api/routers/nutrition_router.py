# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — Nutrition & Meal Tracking Router"""
import html
import sqlite3
from datetime import date, timedelta
from pathlib import Path
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/nutrition", tags=["Nutrition"])
_DB = Path(__file__).parent.parent.parent / "data" / "nutrition.db"


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
        CREATE TABLE IF NOT EXISTS meals (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            date       TEXT NOT NULL DEFAULT (date('now')),
            meal_type  TEXT NOT NULL DEFAULT 'snack',
            name       TEXT NOT NULL,
            calories   INTEGER DEFAULT 0,
            session_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS water (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            date       TEXT NOT NULL DEFAULT (date('now')),
            amount_ml  INTEGER NOT NULL DEFAULT 250,
            session_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    for tbl in ("meals", "water"):
        cols = [r[1] for r in con.execute(f"PRAGMA table_info({tbl})").fetchall()]
        if "session_id" not in cols:
            con.execute(f"ALTER TABLE {tbl} ADD COLUMN session_id TEXT")
    con.commit()
    return con


class MealCreate(BaseModel):
    meal_type: str
    name: str
    calories: Optional[int] = 0
    date: Optional[str] = None

class WaterLog(BaseModel):
    amount_ml: int
    date: Optional[str] = None


@router.get("/today")
async def today(request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    today_str = str(date.today())
    with _db() as con:
        meals = con.execute(
            f"SELECT * FROM meals WHERE {sc} AND date=? ORDER BY created_at",
            (*sp, today_str)
        ).fetchall()
        water = con.execute(
            f"SELECT COALESCE(SUM(amount_ml),0) as total FROM water WHERE {sc} AND date=?",
            (*sp, today_str)
        ).fetchone()
    return {"ok": True, "meals": [dict(m) for m in meals],
            "water_ml": water["total"], "date": today_str}


@router.post("/meal")
async def add_meal(request: Request, req: MealCreate):
    sid = _sid(request)
    d = req.date or str(date.today())
    with _db() as con:
        cur = con.execute(
            "INSERT INTO meals (date, meal_type, name, calories, session_id) VALUES (?,?,?,?,?)",
            (d, _s(req.meal_type), _s(req.name), req.calories or 0, sid)
        )
        con.commit()
    return {"ok": True, "id": cur.lastrowid}


@router.delete("/meal/{meal_id}")
async def delete_meal(meal_id: int, request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    with _db() as con:
        con.execute(f"DELETE FROM meals WHERE {sc} AND id=?", (*sp, meal_id))
        con.commit()
    return {"ok": True}


@router.post("/water")
async def add_water(request: Request, req: WaterLog):
    sid = _sid(request)
    d = req.date or str(date.today())
    with _db() as con:
        con.execute("INSERT INTO water (date, amount_ml, session_id) VALUES (?,?,?)",
                    (d, req.amount_ml, sid))
        con.commit()
    return {"ok": True}


@router.get("/week")
async def week(request: Request):
    sid = _sid(request)
    sc, sp = _sf(sid)
    days = [(date.today() - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    result = []
    with _db() as con:
        for d in days:
            cal = con.execute(
                f"SELECT COALESCE(SUM(calories),0) as c FROM meals WHERE {sc} AND date=?",
                (*sp, d)).fetchone()["c"]
            wat = con.execute(
                f"SELECT COALESCE(SUM(amount_ml),0) as w FROM water WHERE {sc} AND date=?",
                (*sp, d)).fetchone()["w"]
            result.append({"date": d, "calories": cal, "water_ml": wat})
    return {"ok": True, "week": result}
