# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Package / Tier Router (feature gating by subscription tier)."""
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/packages", tags=["Packages"])

_CONFIG = Path(__file__).parent.parent.parent / "config" / "settings.json"

# ── Tier definitions ──────────────────────────────────────────────────────────
# `features: None` means all features are unlocked.

TIERS: dict = {
    "you": {
        "name":        "OZY You",
        "icon":        "👤",
        "color":       "#6366f1",
        "description": "Personal productivity essentials",
        "price_usd":   0,
        "features": [
            "chat", "home", "tasks", "memory", "briefing",
            "notes", "reminders", "books", "settings",
            "gmail", "calendar", "telegram",
            "skills", "marketplace",
            "drive", "github", "youtube", "lesson", "plans", "stocks",
            "nutrition", "baby", "photos", "smarthome", "coffee",
            "visitors", "automations", "roles", "packages", "profile",
        ],
    },
    "professional": {
        "name":        "OZY Professional",
        "icon":        "💼",
        "color":       "#0ea5e9",
        "description": "Coming soon",
        "price_usd":   9.99,
        "features": [
            "chat", "home", "tasks", "memory", "briefing",
            "notes", "reminders", "books", "settings",
            "gmail", "calendar", "telegram",
            "skills", "marketplace",
        ],
    },
    "social": {
        "name":        "OZY Social",
        "icon":        "🌐",
        "color":       "#10b981",
        "description": "Coming soon",
        "price_usd":   9.99,
        "features": [
            "chat", "home", "tasks", "memory", "briefing",
            "notes", "reminders", "books", "settings",
            "gmail", "calendar", "telegram",
            "skills", "marketplace",
        ],
    },
    "full": {
        "name":        "OZY Full",
        "icon":        "⚡",
        "color":       "#f59e0b",
        "description": "Coming soon",
        "price_usd":   19.99,
        "features": [
            "chat", "home", "tasks", "memory", "briefing",
            "notes", "reminders", "books", "settings",
            "gmail", "calendar", "telegram",
            "skills", "marketplace",
            "drive", "github", "youtube", "lesson", "plans", "stocks",
            "nutrition", "baby", "photos", "smarthome", "coffee",
            "visitors", "automations", "roles", "packages", "profile",
        ],
    },
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_cfg() -> dict:
    try:
        return json.loads(_CONFIG.read_text())
    except Exception:
        return {}


def _write_cfg(cfg: dict) -> None:
    _CONFIG.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))


def get_current_tier() -> str:
    return _read_cfg().get("package", "full")


def is_feature_allowed(feature: str) -> bool:
    tier_key  = get_current_tier()
    tier_data = TIERS.get(tier_key, TIERS["full"])
    if tier_data["features"] is None:
        return True
    return feature in tier_data["features"]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
async def get_packages():
    current = get_current_tier()
    return {"ok": True, "current": current, "tiers": TIERS}


@router.get("/current")
async def current_package():
    tier_key  = get_current_tier()
    tier_data = TIERS.get(tier_key, TIERS["full"])
    return {"ok": True, "package": tier_key, "tier": tier_data}


@router.get("/check/{feature}")
async def check_feature(feature: str):
    allowed = is_feature_allowed(feature)
    tier    = get_current_tier()
    return {"ok": True, "allowed": allowed, "tier": tier, "feature": feature}


class SetPackageRequest(BaseModel):
    package: str


@router.post("/set")
async def set_package(req: SetPackageRequest):
    if req.package not in TIERS:
        return {
            "ok":    False,
            "error": f"Invalid package. Options: {list(TIERS.keys())}",
        }
    cfg = _read_cfg()
    cfg["package"] = req.package
    _write_cfg(cfg)
    return {"ok": True, "package": req.package, "tier": TIERS[req.package]}
