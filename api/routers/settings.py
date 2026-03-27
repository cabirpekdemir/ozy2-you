"""OZY2 — Settings router."""
import json
from pathlib import Path
from fastapi import APIRouter, Request
from api.state import reset_agent

TOKEN_FILE = Path(__file__).parent.parent.parent / "config" / "google_token.json"

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

    TIER_ORDER  = ["you", "pro", "social"]
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
