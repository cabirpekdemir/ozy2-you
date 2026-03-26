"""OZY2 — Google Drive Integration"""
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

ROOT  = Path(__file__).parent.parent
TOKEN = ROOT / "config" / "google_token.json"

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
]


def _get_service():
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        if not TOKEN.exists():
            raise FileNotFoundError("google_token.json not found")

        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            TOKEN.write_text(creds.to_json())

        return build("drive", "v3", credentials=creds)
    except Exception as e:
        logger.error(f"Drive service init failed: {e}")
        raise


def list_files(query: str = "", max_results: int = 20,
               folder_id: Optional[str] = None) -> list:
    """List files in Drive."""
    try:
        svc = _get_service()
        q   = []
        if folder_id:
            q.append(f"'{folder_id}' in parents")
        if query:
            q.append(f"name contains '{query}'")
        q.append("trashed=false")
        res = svc.files().list(
            q=" and ".join(q),
            pageSize=max_results,
            fields="files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)",
            orderBy="modifiedTime desc",
        ).execute()
        return res.get("files", [])
    except Exception as e:
        logger.error(f"list_files error: {e}")
        return []


def search_files(query: str, max_results: int = 10) -> list:
    """Search files by name."""
    return list_files(query=query, max_results=max_results)


def get_file_content(file_id: str) -> Optional[str]:
    """Get text content of a file (Google Docs → plain text)."""
    try:
        svc = _get_service()
        # Try export first (Google Docs)
        try:
            content = svc.files().export(
                fileId=file_id, mimeType="text/plain"
            ).execute()
            return content.decode("utf-8") if isinstance(content, bytes) else content
        except Exception:
            pass
        # Fallback: raw download
        content = svc.files().get_media(fileId=file_id).execute()
        return content.decode("utf-8", errors="replace") if isinstance(content, bytes) else str(content)
    except Exception as e:
        logger.error(f"get_file_content error: {e}")
        return None


def create_folder(name: str, parent_id: Optional[str] = None) -> Optional[str]:
    """Create a folder, return its ID."""
    try:
        svc  = _get_service()
        meta = {
            "name":     name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_id:
            meta["parents"] = [parent_id]
        f = svc.files().create(body=meta, fields="id").execute()
        return f.get("id")
    except Exception as e:
        logger.error(f"create_folder error: {e}")
        return None


def recent_files(max_results: int = 10) -> list:
    """Return recently modified files."""
    return list_files(max_results=max_results)
