# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Settings router."""
import json
import os
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from api.state import reset_agent

TOKEN_FILE = Path(__file__).parent.parent.parent / "config" / "google_token.json"
CREDS_FILE = Path(__file__).parent.parent.parent / "config" / "google_credentials.json"

_auth_status  = {"state": "idle", "error": ""}   # shared state for OAuth flow
_pending_flow = None                              # flow kept between /start and /callback

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
]

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


_SENSITIVE_KEYS = {
    "api_key", "pin_hash", "telegram_token", "github_token",
    "slack_token", "teams_token", "jira_api_token", "linear_api_key",
    "asana_token", "hubspot_token", "ga4_api_secret", "openweather_api_key",
    "exchangerate_api_key",
}


def _mask(cfg: dict) -> dict:
    """Return a copy of cfg with sensitive values masked for API response."""
    masked = {}
    for k, v in cfg.items():
        if k in _SENSITIVE_KEYS and isinstance(v, str) and len(v) > 8:
            masked[k] = v[:4] + "****" + v[-2:]
        elif k in _SENSITIVE_KEYS and isinstance(v, str) and v:
            masked[k] = "****"
        else:
            masked[k] = v
    return masked


@router.get("/api/settings")
async def get_settings():
    return {"ok": True, "settings": _mask(read_cfg())}


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
async def start_google_auth(request: Request):
    """Generate Google OAuth URL — returns auth_url for frontend to open in new tab."""
    global _auth_status, _pending_flow
    if not CREDS_FILE.exists():
        return {"ok": False, "error": "credentials_missing"}

    try:
        from google_auth_oauthlib.flow import Flow

        # Detect real scheme/host (handles Cloudflare / nginx forwarding)
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host  = (request.headers.get("x-forwarded-host")
                 or request.headers.get("host")
                 or request.url.netloc)
        redirect_uri = f"{proto}://{host}/api/google/auth/callback"

        flow = Flow.from_client_secrets_file(str(CREDS_FILE), scopes=SCOPES, redirect_uri=redirect_uri)
        auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")

        _pending_flow = flow
        _auth_status  = {"state": "waiting", "error": ""}
        return {"ok": True, "auth_url": auth_url}
    except Exception as e:
        _auth_status = {"state": "error", "error": str(e)}
        return {"ok": False, "error": str(e)}


@router.get("/api/google/auth/callback")
async def google_auth_callback(request: Request):
    """Receive OAuth code from Google, exchange for token and save."""
    global _auth_status, _pending_flow

    if _pending_flow is None:
        return HTMLResponse("<h2>No pending auth session. Please try again from OZY2 Settings.</h2>", status_code=400)

    try:
        # Reconstruct full URL with correct scheme (nginx strips https)
        proto    = request.headers.get("x-forwarded-proto", request.url.scheme)
        url_str  = str(request.url)
        if proto == "https" and url_str.startswith("http://"):
            url_str = "https://" + url_str[7:]

        # Allow HTTP transport for local dev only
        if request.url.scheme == "http" and not proto == "https":
            os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

        _pending_flow.fetch_token(authorization_response=url_str)
        creds = _pending_flow.credentials
        TOKEN_FILE.write_text(creds.to_json())
        _auth_status  = {"state": "done", "error": ""}
        _pending_flow = None

        return HTMLResponse("""<!DOCTYPE html>
<html><head><title>OZY2 — Google Connected</title>
<style>body{margin:0;display:flex;align-items:center;justify-content:center;
height:100vh;background:#0d0d0d;color:#fff;font-family:system-ui,sans-serif;text-align:center}</style>
</head><body>
<div><div style="font-size:48px">✓</div>
<h2 style="margin:.5rem 0">Google Connected!</h2>
<p style="color:#888">This tab will close automatically…</p></div>
<script>setTimeout(()=>{window.close();setTimeout(()=>{window.location.href='/'},500)},1800)</script>
</body></html>""")

    except Exception as e:
        _auth_status  = {"state": "error", "error": str(e)}
        _pending_flow = None
        return HTMLResponse(f"<h2>Auth Error</h2><pre>{e}</pre>", status_code=400)


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
