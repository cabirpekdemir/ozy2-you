"""OZY2 — Settings router."""
import json
from pathlib import Path
from fastapi import APIRouter, Request
from api.state import reset_agent

import threading

TOKEN_FILE = Path(__file__).parent.parent.parent / "config" / "google_token.json"
CREDS_FILE = Path(__file__).parent.parent.parent / "config" / "google_credentials.json"

_auth_status = {"state": "idle", "error": ""}   # shared state for OAuth flow

PACKAGES_FILE = Path(__file__).parent.parent.parent / "config" / "packages.json"

router     = APIRouter(tags=["Settings"])
CONFIG     = Path(__file__).parent.parent.parent / "config" / "settings.json"
DEFAULTS   = {
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "api_key": "",
    "package": "full",
    "theme": "dark",
    "language": "en",
}


def read_cfg() -> dict:
    if CONFIG.exists():
        return {**DEFAULTS, **json.loads(CONFIG.read_text())}
    return DEFAULTS.copy()


def write_cfg(data: dict):
    CONFIG.parent.mkdir(exist_ok=True)
    CONFIG.write_text(json.dumps(data, indent=2, ensure_ascii=False))


@router.get("/api/settings")
async def get_settings():
    return {"ok": True, "settings": read_cfg()}


@router.post("/api/settings")
async def save_settings(request: Request):
    data = await request.json()
    cfg  = {**read_cfg(), **data}
    write_cfg(cfg)
    reset_agent()   # re-init agent with new config
    return {"ok": True}


@router.post("/api/google/credentials")
async def save_credentials(request: Request):
    """Save google_credentials.json content sent from the UI."""
    try:
        data = await request.json()
        content = data.get("content", "")
        parsed = json.loads(content)          # validate it's real JSON
        if "installed" not in parsed and "web" not in parsed:
            return {"ok": False, "error": "Not a valid Google credentials file"}
        CREDS_FILE.parent.mkdir(exist_ok=True)
        CREDS_FILE.write_text(json.dumps(parsed, indent=2))
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/api/google/auth/start")
async def start_google_auth():
    """Start OAuth flow in background — opens browser automatically."""
    global _auth_status
    if not CREDS_FILE.exists():
        return {"ok": False, "error": "credentials_missing"}
    if _auth_status["state"] == "running":
        return {"ok": True, "state": "running"}

    def _run_flow():
        global _auth_status
        _auth_status = {"state": "running", "error": ""}
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
            SCOPES = [
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/drive.readonly",
                "https://www.googleapis.com/auth/drive.file",
            ]
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_FILE), SCOPES)
            creds = flow.run_local_server(port=0, open_browser=True)
            TOKEN_FILE.write_text(creds.to_json())
            _auth_status = {"state": "done", "error": ""}
        except Exception as e:
            _auth_status = {"state": "error", "error": str(e)}

    threading.Thread(target=_run_flow, daemon=True).start()
    return {"ok": True, "state": "running"}


@router.get("/api/google/auth/status")
async def google_auth_status():
    return {"ok": True, **_auth_status}


@router.get("/api/google/status")
async def google_status():
    """Check whether a valid Google OAuth token exists on this machine."""
    if not TOKEN_FILE.exists():
        return {"ok": False, "connected": False, "reason": "No token file — run reauth_google.py"}
    try:
        token_data = json.loads(TOKEN_FILE.read_text())
        has_token  = bool(token_data.get("token") or token_data.get("access_token"))
        if not has_token:
            return {"ok": False, "connected": False, "reason": "Token file is empty or invalid"}
        return {"ok": True, "connected": True}
    except Exception as e:
        return {"ok": False, "connected": False, "reason": str(e)}


@router.get("/api/packages")
async def get_packages():
    """Return the tier/package definitions from packages.json."""
    if PACKAGES_FILE.exists():
        return json.loads(PACKAGES_FILE.read_text())
    return {}


@router.get("/api/packages/active")
async def get_active_package():
    """Return currently active package with its skill list."""
    cfg         = read_cfg()
    active_id   = cfg.get("package", "full")
    if not PACKAGES_FILE.exists():
        return {"package": active_id, "skills": []}
    packages = json.loads(PACKAGES_FILE.read_text())

    TIER_ORDER  = ["you", "pro", "social", "business"]
    all_skills  = []
    for tier_id in TIER_ORDER:
        tier = packages.get(tier_id, {})
        all_skills.extend(tier.get("skills", []))
        if tier_id == active_id:
            break

    if active_id == "full":
        all_skills = []
        for tier in packages.values():
            all_skills.extend(tier.get("skills", []))

    return {"package": active_id, "tier": packages.get(active_id, {}), "skills": all_skills}
