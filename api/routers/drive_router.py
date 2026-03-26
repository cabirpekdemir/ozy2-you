"""OZY2 — Drive API Router"""
from fastapi import APIRouter
from typing import Optional

router = APIRouter(prefix="/api/drive", tags=["Drive"])


@router.get("/files")
async def list_files(q: str = "", limit: int = 20, folder: Optional[str] = None):
    try:
        from integrations.drive import list_files
        files = list_files(query=q, max_results=limit, folder_id=folder)
        return {"ok": True, "files": files}
    except Exception as e:
        return {"ok": False, "error": str(e), "files": []}


@router.get("/recent")
async def recent_files(limit: int = 10):
    try:
        from integrations.drive import recent_files
        files = recent_files(max_results=limit)
        return {"ok": True, "files": files}
    except Exception as e:
        return {"ok": False, "error": str(e), "files": []}


@router.get("/files/{file_id}/content")
async def get_content(file_id: str):
    try:
        from integrations.drive import get_file_content
        content = get_file_content(file_id)
        return {"ok": True, "content": content}
    except Exception as e:
        return {"ok": False, "error": str(e)}
