# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — User Profile Router (onboarding, personal info, preferences)"""
import json
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/profile", tags=["Profile"])


def _sid(request: Request):
    from api.routers.auth_router import COOKIE, get_session_id
    return get_session_id(request.cookies.get(COOKIE))


class ProfileData(BaseModel):
    name:          Optional[str] = ""
    age:           Optional[int] = None
    country:       Optional[str] = ""
    gender:        Optional[str] = ""        # male | female | other | prefer_not
    occupation:    Optional[str] = ""
    blood_type:    Optional[str] = ""        # A+, A-, B+, B-, AB+, AB-, O+, O-
    interests:     Optional[List[str]] = []
    hobbies:       Optional[List[str]] = []
    pets:          Optional[List[str]] = []
    favorite_color: Optional[str] = ""
    dietary_goal:  Optional[str] = ""        # lose_weight | healthy | maintain | gain_muscle | custom
    dietary_custom: Optional[str] = ""
    languages:     Optional[List[str]] = []
    onboarding_done: Optional[bool] = False


@router.get("")
async def get_profile(request: Request):
    """Get current user profile from memory facts."""
    from core.memory import get_fact
    sid = _sid(request)
    raw = get_fact("_user_profile", session_id=sid)
    if raw:
        try:
            return {"ok": True, "profile": json.loads(raw)}
        except Exception:
            pass
    return {"ok": True, "profile": None}


@router.post("")
async def save_profile(request: Request, data: ProfileData):
    """Save user profile as a memory fact (available to AI in all conversations)."""
    from core.memory import save_fact
    sid = _sid(request)
    profile = data.dict()
    profile["onboarding_done"] = True

    # Save full profile JSON
    save_fact("_user_profile", json.dumps(profile, ensure_ascii=False),
              category="profile", source="user", session_id=sid)

    # Also save individual facts so the AI can naturally recall them
    parts = []
    if data.name:
        parts.append(f"Name: {data.name}")
    if data.age:
        parts.append(f"Age: {data.age}")
    if data.country:
        parts.append(f"Country: {data.country}")
    if data.gender:
        label = {"male": "Male", "female": "Female", "other": "Non-binary/other", "prefer_not": "Prefer not to say"}.get(data.gender, data.gender)
        parts.append(f"Gender: {label}")
    if data.occupation:
        parts.append(f"Occupation: {data.occupation}")
    if data.blood_type:
        parts.append(f"Blood type: {data.blood_type}")
    if data.interests:
        parts.append(f"Interests: {', '.join(data.interests)}")
    if data.hobbies:
        parts.append(f"Hobbies: {', '.join(data.hobbies)}")
    if data.pets:
        parts.append(f"Pets: {', '.join(data.pets)}")
    if data.favorite_color:
        parts.append(f"Favorite color: {data.favorite_color}")
    if data.dietary_goal:
        goal_map = {
            "lose_weight": "Weight loss",
            "healthy": "Healthy eating",
            "maintain": "Maintain weight",
            "gain_muscle": "Muscle gain",
            "custom": data.dietary_custom or "Custom goal",
        }
        parts.append(f"Diet goal: {goal_map.get(data.dietary_goal, data.dietary_goal)}")
    if data.languages:
        parts.append(f"Languages: {', '.join(data.languages)}")

    if parts:
        save_fact("_user_profile_summary",
                  "User profile — " + "; ".join(parts),
                  category="profile", source="user", session_id=sid)

    return {"ok": True}
