# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.

"""OZY2 — Plans Router (serves packages.json for the Plans panel)"""
import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api/plans", tags=["Plans"])

_PKG = Path(__file__).parent.parent.parent / "config" / "packages.json"


@router.get("")
async def get_plans():
    """Return packages/tiers configuration."""
    try:
        return json.loads(_PKG.read_text(encoding="utf-8"))
    except Exception as e:
        return {"error": str(e)}
