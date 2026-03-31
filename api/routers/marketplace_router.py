# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Skill Marketplace Router (browse, install, publish, commission)"""
import re
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from integrations.marketplace_db import (
    COMMISSION_RATE,
    add_review,
    approve_skill,
    developer_revenue,
    get_developer_skills,
    get_skill,
    install_skill,
    list_installed,
    list_reviews,
    list_skills,
    publish_skill,
    record_transaction,
    reject_skill,
    revenue_summary,
    uninstall_skill,
)

router = APIRouter(prefix="/api/marketplace", tags=["Marketplace"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class PublishSkillRequest(BaseModel):
    name:             str
    description:      str
    long_description: Optional[str]  = ""
    developer_id:     str
    developer_name:   str
    category:         Optional[str]  = "Utilities"
    price:            Optional[float] = 0.0
    icon:             Optional[str]  = "⚡"
    tags:             Optional[List[str]] = []
    manifest:         Optional[dict] = {}
    version:          Optional[str]  = "1.0.0"


class ReviewRequest(BaseModel):
    rating:  int
    comment: Optional[str] = ""


# ── Browse ────────────────────────────────────────────────────────────────────

@router.get("/skills")
async def browse_skills(category: Optional[str] = None, q: Optional[str] = None):
    skills = list_skills(category=category, q=q)
    installed_ids = {s["id"] for s in list_installed()}
    for s in skills:
        s["installed"] = s["id"] in installed_ids
    return {"ok": True, "skills": skills, "commission_rate": COMMISSION_RATE}


@router.get("/skills/installed")
async def installed_skills():
    return {"ok": True, "skills": list_installed()}


@router.get("/skills/{skill_id}")
async def get_skill_detail(skill_id: int):
    skill = get_skill(skill_id)
    if not skill:
        return {"ok": False, "error": "Skill not found"}
    installed_ids = {s["id"] for s in list_installed()}
    skill["installed"] = skill_id in installed_ids
    skill["reviews"]   = list_reviews(skill_id)
    return {"ok": True, "skill": skill}


# ── Publish / review ──────────────────────────────────────────────────────────

@router.post("/skills")
async def submit_skill(req: PublishSkillRequest):
    slug = re.sub(r"[^a-z0-9]+", "-", req.name.lower()).strip("-")
    try:
        skill_id = publish_skill(
            name             = req.name,
            slug             = slug,
            description      = req.description,
            long_description = req.long_description or "",
            developer_id     = req.developer_id,
            developer_name   = req.developer_name,
            category         = req.category or "Utilities",
            price            = req.price or 0.0,
            icon             = req.icon or "⚡",
            tags             = req.tags or [],
            manifest         = req.manifest or {},
            version          = req.version or "1.0.0",
        )
        return {"ok": True, "id": skill_id, "message": "Skill submitted for review"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/skills/{skill_id}/approve")
async def approve_skill_endpoint(skill_id: int):
    approve_skill(skill_id)
    return {"ok": True}


@router.post("/skills/{skill_id}/reject")
async def reject_skill_endpoint(skill_id: int):
    reject_skill(skill_id)
    return {"ok": True}


# ── Install / Uninstall ───────────────────────────────────────────────────────

@router.post("/skills/{skill_id}/install")
async def install_skill_endpoint(skill_id: int):
    skill = get_skill(skill_id)
    if not skill:
        return {"ok": False, "error": "Skill not found"}
    result = install_skill(skill_id)
    if not result:
        return {"ok": False, "error": "Already installed"}
    if skill.get("price", 0) > 0:
        record_transaction(
            skill_id      = skill_id,
            skill_name    = skill["name"],
            developer_id  = skill["developer_id"],
            amount        = skill["price"],
        )
    return {"ok": True, "message": f"'{skill['name']}' installed"}


@router.delete("/skills/{skill_id}/install")
async def uninstall_skill_endpoint(skill_id: int):
    uninstall_skill(skill_id)
    return {"ok": True}


# ── Reviews ───────────────────────────────────────────────────────────────────

@router.post("/skills/{skill_id}/review")
async def review_skill(skill_id: int, req: ReviewRequest):
    if not (1 <= req.rating <= 5):
        return {"ok": False, "error": "Rating must be between 1 and 5"}
    add_review(skill_id, req.rating, req.comment or "")
    return {"ok": True}


# ── Developer portal ──────────────────────────────────────────────────────────

@router.get("/developers/{developer_id}/skills")
async def developer_skills(developer_id: str):
    skills = get_developer_skills(developer_id)
    return {"ok": True, "skills": skills}


@router.get("/developers/{developer_id}/revenue")
async def developer_revenue_endpoint(developer_id: str):
    summary = developer_revenue(developer_id)
    return {"ok": True, "summary": summary, "commission_rate": COMMISSION_RATE}


# ── Admin revenue ─────────────────────────────────────────────────────────────

@router.get("/revenue")
async def platform_revenue():
    summary = revenue_summary()
    return {"ok": True, "summary": summary, "commission_rate": COMMISSION_RATE}


# ── Pending review queue (admin) ──────────────────────────────────────────────

@router.get("/pending")
async def pending_skills():
    skills = list_skills(status="pending")
    return {"ok": True, "skills": skills}
