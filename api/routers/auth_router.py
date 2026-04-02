# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Authentication (PIN + Session + Demo mode)"""
import hashlib
import json
import re
import secrets
import sqlite3
import time
import uuid
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

# ── Demo Mode Config ──────────────────────────────────────────────────────────
DEMO_PASSWORD    = "ozy2"          # fixed password for demo
DEMO_QUERY_LIMIT = 25              # max AI queries per demo session
_ACCESS_LOG_DB   = Path(__file__).parent.parent.parent / "data" / "access_log.db"


def _log_db():
    """Get (and init) access log connection."""
    _ACCESS_LOG_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(_ACCESS_LOG_DB))
    con.execute("""
        CREATE TABLE IF NOT EXISTS access_log (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ts         REAL    NOT NULL,
            ip         TEXT    NOT NULL,
            action     TEXT    NOT NULL,
            first_name TEXT,
            last_name  TEXT,
            email      TEXT,
            session    TEXT,
            detail     TEXT
        )
    """)
    con.commit()
    return con


def log_access(ip: str, action: str, first_name: str = "", last_name: str = "",
               email: str = "", session: str = "", detail: str = ""):
    try:
        with _log_db() as con:
            con.execute(
                "INSERT INTO access_log (ts,ip,action,first_name,last_name,email,session,detail) "
                "VALUES (?,?,?,?,?,?,?,?)",
                (time.time(), ip, action, first_name, last_name, email, session, detail),
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"[access_log] write failed: {e}")

# ── Rate Limiting ─────────────────────────────────────────────────────────────
_RATE_LIMIT   = 10          # max failed attempts
_RATE_WINDOW  = 60 * 15     # 15 minute window
_LOCKOUT_TIME = 60 * 15     # 15 minute lockout after limit

_failed_attempts: dict[str, list[float]] = defaultdict(list)  # ip → [timestamps]
_lockouts:        dict[str, float]        = {}                 # ip → lockout_until


def _get_ip(request: Request) -> str:
    return (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.client.host)


def _is_locked(ip: str) -> bool:
    until = _lockouts.get(ip)
    if until and time.time() < until:
        return True
    _lockouts.pop(ip, None)
    return False


def _record_failure(ip: str):
    now = time.time()
    attempts = [t for t in _failed_attempts[ip] if now - t < _RATE_WINDOW]
    attempts.append(now)
    _failed_attempts[ip] = attempts
    if len(attempts) >= _RATE_LIMIT:
        _lockouts[ip] = now + _LOCKOUT_TIME
        _failed_attempts[ip] = []


def _clear_failures(ip: str):
    _failed_attempts.pop(ip, None)
    _lockouts.pop(ip, None)

CONFIG = Path(__file__).parent.parent.parent / "config" / "settings.json"
COOKIE = "ozy2_session"
SESSION_TTL = 86400 * 7   # 7 days

_sessions: dict[str, dict] = {}
# {token: {"expiry": float, "role_id": str, "permissions": list[str]}}

_SESSION_DB = Path(__file__).parent.parent.parent / "data" / "sessions.db"


# ── Session persistence (SQLite) ──────────────────────────────────────────────

def _db():
    _SESSION_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(_SESSION_DB))
    con.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token       TEXT PRIMARY KEY,
            expiry      REAL NOT NULL,
            role_id     TEXT NOT NULL,
            permissions TEXT NOT NULL,
            query_count INTEGER NOT NULL DEFAULT 0,
            demo_info   TEXT NOT NULL DEFAULT '{}',
            session_id  TEXT
        )
    """)
    # Migration: add new columns if missing (for existing installs)
    existing = [r[1] for r in con.execute("PRAGMA table_info(sessions)").fetchall()]
    if "query_count" not in existing:
        con.execute("ALTER TABLE sessions ADD COLUMN query_count INTEGER NOT NULL DEFAULT 0")
    if "demo_info" not in existing:
        con.execute("ALTER TABLE sessions ADD COLUMN demo_info TEXT NOT NULL DEFAULT '{}'")
    if "session_id" not in existing:
        con.execute("ALTER TABLE sessions ADD COLUMN session_id TEXT")
    con.commit()
    return con


def _persist_session(token: str, data: dict):
    try:
        with _db() as con:
            con.execute(
                "INSERT OR REPLACE INTO sessions "
                "(token, expiry, role_id, permissions, query_count, demo_info, session_id) "
                "VALUES (?,?,?,?,?,?,?)",
                (
                    token,
                    data["expiry"],
                    data["role_id"],
                    json.dumps(data["permissions"]),
                    data.get("query_count", 0),
                    json.dumps(data.get("demo_info", {})),
                    data.get("session_id"),
                ),
            )
    except Exception:
        pass


def _delete_session_db(token: str):
    try:
        with _db() as con:
            con.execute("DELETE FROM sessions WHERE token=?", (token,))
    except Exception:
        pass


def load_sessions_from_db():
    """Load valid sessions from disk into memory on startup."""
    global _sessions
    try:
        now = time.time()
        with _db() as con:
            con.execute("DELETE FROM sessions WHERE expiry <= ?", (now,))
            rows = con.execute(
                "SELECT token, expiry, role_id, permissions, query_count, demo_info, session_id "
                "FROM sessions"
            ).fetchall()
        for token, expiry, role_id, permissions, query_count, demo_info, session_id in rows:
            _sessions[token] = {
                "expiry":      expiry,
                "role_id":     role_id,
                "permissions": json.loads(permissions),
                "query_count": query_count or 0,
                "demo_info":   json.loads(demo_info) if demo_info else {},
                "session_id":  session_id,
            }
    except Exception:
        pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load() -> dict:
    try:
        return json.loads(CONFIG.read_text())
    except Exception:
        return {}


def _hash(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode()).hexdigest()


def _create_session(role_id: str = "admin", permissions: list = None,
                    demo_info: dict = None) -> str:
    token = secrets.token_urlsafe(32)
    # Demo sessions get a unique UUID for data isolation across all DB tables.
    # Admin sessions use session_id=None (queries filter WHERE session_id IS NULL).
    sid = str(uuid.uuid4()) if demo_info else None
    data = {
        "expiry":      time.time() + SESSION_TTL,
        "role_id":     role_id,
        "permissions": permissions if permissions is not None else ["*"],
        "query_count": 0,
        "demo_info":   demo_info or {},
        "session_id":  sid,
    }
    _sessions[token] = data
    _persist_session(token, data)
    return token


def get_session_id(token: str | None) -> str | None:
    """Returns the UUID session_id for demo sessions; None for admin sessions."""
    data = _sessions.get(token) if token else None
    return data.get("session_id") if data else None


_DATA_DIR = Path(__file__).parent.parent.parent / "data"


def _cleanup_demo_data(session_id: str):
    """Delete ALL data belonging to a demo session from every database."""
    if not session_id:
        return
    import logging as _log
    log = _log.getLogger(__name__)
    dbs = {
        "tasks.db":     ["tasks"],
        "memory.db":    ["facts", "history"],
        "notes.db":     ["notes"],
        "reminders.db": ["reminders"],
    }
    for db_file, tables in dbs.items():
        db_path = _DATA_DIR / db_file
        if not db_path.exists():
            continue
        try:
            with sqlite3.connect(str(db_path)) as con:
                for table in tables:
                    con.execute(f"DELETE FROM {table} WHERE session_id=?", (session_id,))
        except Exception as e:
            log.warning(f"[cleanup_demo] {db_file}/{tables}: {e}")


def get_query_count(token: str) -> int:
    data = _sessions.get(token)
    return data.get("query_count", 0) if data else 0


def is_demo_session(token: str) -> bool:
    data = _sessions.get(token)
    return bool(data and data.get("demo_info"))


def increment_query_count(token: str) -> int:
    """Increment and return the new query count. Returns -1 if session invalid."""
    data = _sessions.get(token)
    if not data:
        return -1
    data["query_count"] = data.get("query_count", 0) + 1
    # Persist the updated count to DB so it survives restarts
    _persist_session(token, data)
    return data["query_count"]


def get_demo_info(token: str) -> dict:
    data = _sessions.get(token)
    return data.get("demo_info", {}) if data else {}


def is_valid_session(token: str | None) -> bool:
    if not token:
        return False
    data = _sessions.get(token)
    if data is None:
        return False
    if time.time() > data["expiry"]:
        _sessions.pop(token, None)
        _delete_session_db(token)
        return False
    return True


ROLES_FILE = Path(__file__).parent.parent.parent / "config" / "roles.json"


def _load_roles() -> list:
    try:
        return json.loads(ROLES_FILE.read_text()).get("roles", [])
    except Exception:
        return []


def get_session_role(token: str) -> str:
    data = _sessions.get(token)
    if not data or time.time() > data["expiry"]:
        return "guest"
    return data.get("role_id", "admin")


def get_session_permissions(token: str) -> list:
    data = _sessions.get(token)
    if not data or time.time() > data["expiry"]:
        return []
    return data.get("permissions", ["*"])


def pin_required() -> bool:
    """Returns True if a PIN has been set in settings."""
    cfg = _load()
    return bool(cfg.get("pin_hash"))


def remote_access_enabled() -> bool:
    cfg = _load()
    return bool(cfg.get("remote_access", False))


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class PinRequest(BaseModel):
    pin: str


class ChangePinRequest(BaseModel):
    current_pin: str = ""
    new_pin: str


class DemoLoginRequest(BaseModel):
    first_name: str
    last_name:  str
    email:      str
    password:   str


@router.post("/login")
async def login(req: PinRequest, request: Request, response: Response):
    ip = _get_ip(request)

    # Rate limit check
    if _is_locked(ip):
        return JSONResponse(
            {"ok": False, "error": "Too many failed attempts. Try again in 15 minutes."},
            status_code=429,
        )

    cfg = _load()
    stored_admin = cfg.get("pin_hash", "")
    hashed = _hash(req.pin)

    # No PIN set → auto admin session
    if not stored_admin:
        _clear_failures(ip)
        token = _create_session("admin", ["*"])
        response.set_cookie(COOKIE, token, max_age=SESSION_TTL, httponly=True, samesite="lax", secure=False)
        return {"ok": True, "role": "admin"}

    # Check admin PIN
    if hashed == stored_admin:
        _clear_failures(ip)
        token = _create_session("admin", ["*"])
        response.set_cookie(COOKIE, token, max_age=SESSION_TTL, httponly=True, samesite="lax", secure=False)
        log_access(ip, "LOGIN_PIN_OK", session=token[:12])
        return {"ok": True, "role": "admin"}

    # Check role PINs
    for role in _load_roles():
        role_hash = role.get("pin_hash")
        if role_hash and hashed == role_hash:
            _clear_failures(ip)
            token = _create_session(role["id"], role.get("permissions", []))
            response.set_cookie(COOKIE, token, max_age=SESSION_TTL, httponly=True, samesite="lax", secure=False)
            log_access(ip, "LOGIN_ROLE_OK", session=token[:12], detail=role["id"])
            return {"ok": True, "role": role["id"]}

    _record_failure(ip)
    log_access(ip, "LOGIN_FAILED")
    attempts_left = max(0, _RATE_LIMIT - len(_failed_attempts[ip]))
    return JSONResponse(
        {"ok": False, "error": "Wrong PIN", "attempts_left": attempts_left},
        status_code=401,
    )


@router.post("/demo_login")
async def demo_login(req: DemoLoginRequest, request: Request, response: Response):
    """Demo login — collects email + optional name. No password required."""
    ip = _get_ip(request)

    if _is_locked(ip):
        return JSONResponse(
            {"ok": False, "error": "Too many failed attempts. Please try again in 15 minutes."},
            status_code=429,
        )

    first = req.first_name.strip()[:50]
    last  = req.last_name.strip()[:50] or "Demo"
    email = req.email.strip().lower()[:100]

    if not first:
        return JSONResponse({"ok": False, "error": "First name is required."}, status_code=400)
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return JSONResponse({"ok": False, "error": "Please enter a valid email address."}, status_code=400)

    _clear_failures(ip)
    demo_info = {"first_name": first, "last_name": last, "email": email}
    token = _create_session("demo", ["chat", "memory:read", "tasks:read"], demo_info=demo_info)
    response.set_cookie(COOKIE, token, max_age=SESSION_TTL, httponly=True, samesite="lax", secure=False)

    log_access(ip, "DEMO_LOGIN_OK",
               first_name=first, last_name=last, email=email,
               session=token[:12])

    return {
        "ok":          True,
        "role":        "demo",
        "first_name":  first,
        "query_limit": DEMO_QUERY_LIMIT,
    }


@router.get("/log")
async def get_access_log(request: Request, limit: int = 100):
    """Admin endpoint — returns recent access log entries."""
    token = request.cookies.get(COOKIE)
    if get_session_role(token) not in ("admin",):
        return JSONResponse({"ok": False, "error": "Admin only"}, status_code=403)
    try:
        with _log_db() as con:
            rows = con.execute(
                "SELECT id,ts,ip,action,first_name,last_name,email,session,detail "
                "FROM access_log ORDER BY ts DESC LIMIT ?",
                (min(limit, 500),),
            ).fetchall()
        entries = [
            {"id": r[0], "time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(r[1])),
             "ip": r[2], "action": r[3], "first_name": r[4], "last_name": r[5],
             "email": r[6], "session": r[7], "detail": r[8]}
            for r in rows
        ]
        return {"ok": True, "count": len(entries), "entries": entries}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)


@router.post("/logout")
async def logout(response: Response, request: Request):
    token = request.cookies.get(COOKIE)
    # Clean up all demo data before removing the session
    sid = get_session_id(token)
    if sid:
        _cleanup_demo_data(sid)
    _sessions.pop(token, None)
    _delete_session_db(token)
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.post("/pin")
async def set_pin(req: ChangePinRequest):
    """Set or change the PIN. If a PIN already exists, current_pin must match."""
    cfg = _load()
    stored = cfg.get("pin_hash", "")

    if stored and _hash(req.current_pin) != stored:
        return JSONResponse({"ok": False, "error": "Current PIN is wrong"}, status_code=401)

    if not req.new_pin.strip():
        # Remove PIN (disable authentication)
        cfg.pop("pin_hash", None)
    else:
        if len(req.new_pin.strip()) < 4:
            return JSONResponse({"ok": False, "error": "PIN must be at least 4 digits"}, status_code=400)
        cfg["pin_hash"] = _hash(req.new_pin)

    CONFIG.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
    return {"ok": True}


@router.get("/status")
async def status(request: Request):
    token = request.cookies.get(COOKIE)
    return {
        "ok": True,
        "authenticated": is_valid_session(token) or not pin_required(),
        "pin_set": pin_required(),
        "remote_access": remote_access_enabled(),
    }


@router.get("/me")
async def me(request: Request):
    token = request.cookies.get(COOKIE)
    if not is_valid_session(token) and pin_required():
        return {"ok": False, "authenticated": False}
    resp: dict = {
        "ok": True,
        "authenticated": True,
        "role": get_session_role(token),
        "permissions": get_session_permissions(token),
    }
    if is_demo_session(token):
        info = get_demo_info(token)
        resp["is_demo"]    = True
        resp["demo_name"]  = f"{info.get('first_name','')} {info.get('last_name','')}".strip()
        resp["query_count"] = get_query_count(token)
        resp["query_limit"] = DEMO_QUERY_LIMIT
    return resp
