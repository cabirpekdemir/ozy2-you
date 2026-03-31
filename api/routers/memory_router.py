# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Memory API Router"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/memory", tags=["Memory"])


class FactCreate(BaseModel):
    key:   str
    value: str


@router.get("/facts")
async def get_facts():
    from core.memory import get_all_facts
    facts = get_all_facts()
    return {"ok": True, "facts": facts}


@router.post("/facts")
async def save_fact(req: FactCreate):
    from core.memory import save_fact
    save_fact(req.key, req.value)
    return {"ok": True}


@router.delete("/facts/{key}")
async def delete_fact(key: str):
    from core.memory import delete_fact
    delete_fact(key)
    return {"ok": True}


@router.get("/history")
async def get_history(limit: int = 50):
    from core.memory import get_history
    history = get_history(limit=limit)
    return {"ok": True, "history": history}


@router.delete("/history")
async def clear_history():
    from core.memory import clear_history
    clear_history()
    return {"ok": True}
