"""OZY2 — Authentication (PIN + Session)"""
import hashlib
import json
import secrets
import time
from pathlib import Path

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

CONFIG = Path(__file__).parent.parent.parent / "config" / "settings.json"
COOKIE = "ozy2_session"
SESSION_TTL = 86400 * 7   # 7 days

# In-memory session store  {token: expiry_ts}
_sessions: dict[str, float] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load() -> dict:
    try:
        return json.loads(CONFIG.read_text())
    except Exception:
        return {}


def _hash(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode()).hexdigest()


def _create_session() -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.time() + SESSION_TTL
    return token


def is_valid_session(token: str | None) -> bool:
    if not token:
        return False
    expiry = _sessions.get(token)
    if expiry is None:
        return False
    if time.time() > expiry:
        _sessions.pop(token, None)
        return False
    return True


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


@router.post("/login")
async def login(req: PinRequest, response: Response):
    cfg = _load()
    stored = cfg.get("pin_hash", "")

    # If no PIN set — auto-approve (local mode)
    if not stored:
        token = _create_session()
        response.set_cookie(COOKIE, token, max_age=SESSION_TTL,
                            httponly=True, samesite="strict")
        return {"ok": True}

    if _hash(req.pin) != stored:
        return JSONResponse({"ok": False, "error": "Wrong PIN"}, status_code=401)

    token = _create_session()
    response.set_cookie(COOKIE, token, max_age=SESSION_TTL,
                        httponly=True, samesite="strict")
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response, request: Request):
    token = request.cookies.get(COOKIE)
    _sessions.pop(token, None)
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
