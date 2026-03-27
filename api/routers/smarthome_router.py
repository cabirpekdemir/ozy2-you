"""OZY2 — Smart Home Router (Home Assistant integration)"""
import json
import urllib.request
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/smarthome", tags=["Smart Home"])

CFG_FILE = Path.home() / ".ozy2" / "smarthome.json"
CFG_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_cfg() -> dict:
    if CFG_FILE.exists():
        return json.loads(CFG_FILE.read_text())
    return {}


def _save_cfg(cfg: dict):
    CFG_FILE.write_text(json.dumps(cfg, indent=2))


def _ha_request(method: str, path: str, body: dict = None) -> dict:
    cfg = _load_cfg()
    ha_url   = cfg.get("url", "").rstrip("/")
    ha_token = cfg.get("token", "")
    if not ha_url or not ha_token:
        raise ValueError("Home Assistant not configured")
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        f"{ha_url}/api{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {ha_token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        content = r.read()
        return json.loads(content) if content else {}


# ── Models ────────────────────────────────────────────────────────────────────

class ConfigRequest(BaseModel):
    url:   str  # e.g. http://homeassistant.local:8123
    token: str  # Long-lived access token

class ControlRequest(BaseModel):
    entity_id: str
    action:    str   # turn_on | turn_off | toggle
    brightness: Optional[int] = None   # 0-255 for lights
    temperature: Optional[float] = None  # for climate
    color_temp:  Optional[int] = None   # mireds


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config")
async def get_config():
    cfg = _load_cfg()
    return {
        "ok":        True,
        "configured": bool(cfg.get("url") and cfg.get("token")),
        "url":       cfg.get("url", ""),
        "token_set": bool(cfg.get("token")),
    }


@router.post("/config")
async def save_config(req: ConfigRequest):
    # Test connection first
    try:
        cfg_test = {"url": req.url, "token": req.token}
        CFG_FILE.write_text(json.dumps(cfg_test, indent=2))
        result = _ha_request("GET", "/")
        version = result.get("version", "unknown")
        return {"ok": True, "message": f"Connected to Home Assistant {version}", "version": version}
    except Exception as e:
        return {"ok": False, "error": f"Could not connect: {e}"}


@router.get("/states")
async def get_states(domain: str = "all", area: str = ""):
    try:
        states = _ha_request("GET", "/states")
        if not isinstance(states, list):
            return {"ok": False, "error": "Unexpected response from Home Assistant"}
        if domain != "all":
            states = [s for s in states if s["entity_id"].startswith(f"{domain}.")]
        if area:
            states = [s for s in states
                      if area.lower() in s.get("attributes", {}).get("friendly_name", "").lower()]
        summary = []
        for s in states[:100]:
            attrs = s.get("attributes", {})
            summary.append({
                "entity_id":   s["entity_id"],
                "name":        attrs.get("friendly_name", s["entity_id"]),
                "state":       s["state"],
                "unit":        attrs.get("unit_of_measurement", ""),
                "brightness":  attrs.get("brightness"),
                "temperature": attrs.get("temperature"),
                "icon":        attrs.get("icon", ""),
            })
        return {"ok": True, "devices": summary, "count": len(summary)}
    except ValueError as e:
        return {"ok": False, "setup_required": True, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/control")
async def control_device(req: ControlRequest):
    try:
        domain = req.entity_id.split(".")[0] if "." in req.entity_id else "homeassistant"
        service_map = {
            "turn_on":  domain,
            "turn_off": domain,
            "toggle":   domain,
        }
        svc_domain = service_map.get(req.action, domain)
        payload = {"entity_id": req.entity_id}
        if req.brightness is not None:
            payload["brightness"] = req.brightness
        if req.temperature is not None:
            payload["temperature"] = req.temperature
        if req.color_temp is not None:
            payload["color_temp"] = req.color_temp
        _ha_request("POST", f"/services/{svc_domain}/{req.action}", payload)
        return {"ok": True, "entity": req.entity_id, "action": req.action}
    except ValueError as e:
        return {"ok": False, "setup_required": True, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/domains")
async def get_domains():
    """Return list of available entity domains (light, switch, climate, etc.)"""
    try:
        states = _ha_request("GET", "/states")
        domains = sorted(set(s["entity_id"].split(".")[0] for s in states))
        return {"ok": True, "domains": domains}
    except ValueError as e:
        return {"ok": False, "setup_required": True, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}
