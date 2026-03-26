"""OZY2 — Settings router."""
import json
from pathlib import Path
from fastapi import APIRouter, Request
from api.state import reset_agent

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
