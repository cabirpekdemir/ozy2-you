# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Tasks API Router"""
import html
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional


def _s(v: str | None) -> str | None:
    """Strip and HTML-escape a string input."""
    return html.escape(v.strip()) if isinstance(v, str) else v

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


class TaskCreate(BaseModel):
    title:    str
    notes:    Optional[str] = ""
    priority: Optional[str] = "normal"
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title:    Optional[str] = None
    notes:    Optional[str] = None
    status:   Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


@router.get("")
async def list_tasks(status: Optional[str] = None):
    from integrations.tasks_db import list_tasks
    return {"ok": True, "tasks": list_tasks(status=status)}


@router.post("")
async def create_task(req: TaskCreate):
    from integrations.tasks_db import add_task
    task_id = add_task(
        title=_s(req.title), notes=_s(req.notes) or "",
        priority=req.priority or "normal", due_date=req.due_date
    )
    return {"ok": True, "id": task_id}


@router.patch("/{task_id}")
async def update_task(task_id: int, req: TaskUpdate):
    from integrations.tasks_db import update_task
    data = req.dict(exclude_none=True)
    if "title" in data:  data["title"] = _s(data["title"])
    if "notes" in data:  data["notes"] = _s(data["notes"])
    ok = update_task(task_id, **data)
    return {"ok": ok}


@router.post("/{task_id}/complete")
async def complete_task(task_id: int):
    from integrations.tasks_db import complete_task
    ok = complete_task(task_id)
    return {"ok": ok}


@router.delete("/{task_id}")
async def delete_task(task_id: int):
    from integrations.tasks_db import delete_task
    ok = delete_task(task_id)
    return {"ok": ok}
