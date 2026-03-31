# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Roles Router (admin only)"""
import json
import hashlib
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/roles", tags=["Roles"])
ROLES_FILE = Path(__file__).parent.parent.parent / "config" / "roles.json"

ALL_PERMISSIONS = [
    "email.read", "email.write",
    "calendar.read", "calendar.write",
    "drive.read", "drive.write",
    "task.read", "task.write",
    "slack.read", "slack.write",
    "teams.read", "teams.write",
    "jira.read", "jira.write",
    "linear.read", "linear.write",
    "asana.read", "asana.write",
    "hubspot.read", "hubspot.write",
    "salesforce.read", "salesforce.write",
    "confluence.read", "confluence.write",
    "analytics.read",
    "meeting.read",
    "invoice.write",
    "memory.read", "memory.write",
]


def _load() -> dict:
    try:
        return json.loads(ROLES_FILE.read_text())
    except Exception:
        return {"roles": []}

def _save(data: dict):
    ROLES_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))

def _hash(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode()).hexdigest()

def _is_admin(request: Request) -> bool:
    from api.routers.auth_router import get_session_role, COOKIE
    token = request.cookies.get(COOKIE)
    return get_session_role(token) == "admin"


class RoleCreate(BaseModel):
    id: str
    name: str
    level: int = 1
    color: str = "#6b7280"
    icon: str = "👤"
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    permissions: Optional[List[str]] = None

class PinSet(BaseModel):
    pin: str


@router.get("")
async def list_roles(request: Request):
    if not _is_admin(request):
        return JSONResponse({"ok": False, "error": "Admin only"}, status_code=403)
    data = _load()
    # Don't expose pin_hash
    roles = [{k: v for k, v in r.items() if k != "pin_hash"} | {"has_pin": bool(r.get("pin_hash"))}
             for r in data.get("roles", [])]
    return {"ok": True, "roles": roles, "all_permissions": ALL_PERMISSIONS}


@router.post("")
async def create_role(req: RoleCreate, request: Request):
    if not _is_admin(request):
        return JSONResponse({"ok": False, "error": "Admin only"}, status_code=403)
    data = _load()
    if any(r["id"] == req.id for r in data["roles"]):
        return {"ok": False, "error": "Role ID already exists"}
    data["roles"].append({
        "id": req.id, "name": req.name, "level": req.level,
        "color": req.color, "icon": req.icon,
        "pin_hash": None, "is_default": False,
        "permissions": req.permissions,
    })
    _save(data)
    return {"ok": True}


@router.patch("/{role_id}")
async def update_role(role_id: str, req: RoleUpdate, request: Request):
    if not _is_admin(request):
        return JSONResponse({"ok": False, "error": "Admin only"}, status_code=403)
    data = _load()
    for role in data["roles"]:
        if role["id"] == role_id:
            if req.name is not None: role["name"] = req.name
            if req.level is not None: role["level"] = req.level
            if req.color is not None: role["color"] = req.color
            if req.icon is not None: role["icon"] = req.icon
            if req.permissions is not None: role["permissions"] = req.permissions
            _save(data)
            return {"ok": True}
    return {"ok": False, "error": "Role not found"}


@router.delete("/{role_id}")
async def delete_role(role_id: str, request: Request):
    if not _is_admin(request):
        return JSONResponse({"ok": False, "error": "Admin only"}, status_code=403)
    if role_id == "admin":
        return JSONResponse({"ok": False, "error": "Cannot delete admin role"}, status_code=400)
    data = _load()
    data["roles"] = [r for r in data["roles"] if r["id"] != role_id]
    _save(data)
    return {"ok": True}


@router.post("/{role_id}/pin")
async def set_role_pin(role_id: str, req: PinSet, request: Request):
    if not _is_admin(request):
        return JSONResponse({"ok": False, "error": "Admin only"}, status_code=403)
    if len(req.pin.strip()) < 4:
        return JSONResponse({"ok": False, "error": "PIN must be at least 4 digits"}, status_code=400)
    data = _load()
    for role in data["roles"]:
        if role["id"] == role_id:
            role["pin_hash"] = _hash(req.pin)
            _save(data)
            return {"ok": True}
    return {"ok": False, "error": "Role not found"}
