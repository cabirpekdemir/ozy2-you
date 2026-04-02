# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — Smart Home Router (webhook-based device control)"""
import json
import uuid
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/smarthome", tags=["Smart Home"])
_CFG = Path(__file__).parent.parent.parent / "config" / "smarthome.json"


def _load() -> list:
    try:
        return json.loads(_CFG.read_text())
    except Exception:
        return []


def _save(devices: list):
    _CFG.parent.mkdir(exist_ok=True)
    _CFG.write_text(json.dumps(devices, indent=2, ensure_ascii=False))


class DeviceCreate(BaseModel):
    name: str
    icon: Optional[str] = "💡"
    type: Optional[str] = "switch"   # switch | scene
    webhook_on:  Optional[str] = ""
    webhook_off: Optional[str] = ""

class StateSet(BaseModel):
    state: bool


@router.get("/devices")
async def list_devices():
    return {"ok": True, "devices": _load()}


@router.post("/devices")
async def add_device(req: DeviceCreate):
    devices = _load()
    device = {
        "id":          str(uuid.uuid4()),
        "name":        req.name[:80],
        "icon":        req.icon or "💡",
        "type":        req.type or "switch",
        "webhook_on":  req.webhook_on or "",
        "webhook_off": req.webhook_off or "",
        "state":       False,
    }
    devices.append(device)
    _save(devices)
    return {"ok": True, "device": device}


@router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    devices = [d for d in _load() if d["id"] != device_id]
    _save(devices)
    return {"ok": True}


@router.post("/devices/{device_id}/toggle")
async def toggle_device(device_id: str):
    devices = _load()
    target = next((d for d in devices if d["id"] == device_id), None)
    if not target:
        return JSONResponse({"ok": False, "error": "Device not found"}, status_code=404)

    new_state = not target.get("state", False)
    target["state"] = new_state

    # Fire webhook (fire-and-forget, don't fail if offline)
    url = target.get("webhook_on" if new_state else "webhook_off", "")
    if url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5) as client:
                await client.get(url)
        except Exception:
            pass  # Device might be offline — still update state

    _save(devices)
    return {"ok": True, "state": new_state}


@router.post("/devices/{device_id}/state")
async def set_state(device_id: str, req: StateSet):
    devices = _load()
    target = next((d for d in devices if d["id"] == device_id), None)
    if not target:
        return JSONResponse({"ok": False, "error": "Device not found"}, status_code=404)
    target["state"] = req.state
    _save(devices)
    return {"ok": True, "state": req.state}
