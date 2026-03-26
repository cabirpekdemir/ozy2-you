"""OZY2 — Gmail Integration"""
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

ROOT   = Path(__file__).parent.parent
TOKEN  = ROOT / "config" / "google_token.json"
CREDS  = ROOT / "config" / "google_credentials.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
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

        return build("gmail", "v1", credentials=creds)
    except Exception as e:
        logger.error(f"Gmail service init failed: {e}")
        raise


def list_messages(max_results: int = 20, query: str = "", label: str = "INBOX"):
    """Return list of message summaries."""
    try:
        svc = _get_service()
        q   = query or f"label:{label}"
        res = svc.users().messages().list(
            userId="me", q=q, maxResults=max_results
        ).execute()
        msgs = res.get("messages", [])
        summaries = []
        for m in msgs:
            detail = svc.users().messages().get(
                userId="me", id=m["id"], format="metadata",
                metadataHeaders=["From", "Subject", "Date"]
            ).execute()
            headers = {h["name"]: h["value"] for h in detail["payload"]["headers"]}
            snippet = detail.get("snippet", "")
            labels  = detail.get("labelIds", [])
            summaries.append({
                "id":      m["id"],
                "from":    headers.get("From", ""),
                "subject": headers.get("Subject", "(no subject)"),
                "date":    headers.get("Date", ""),
                "snippet": snippet,
                "unread":  "UNREAD" in labels,
            })
        return summaries
    except Exception as e:
        logger.error(f"list_messages error: {e}")
        return []


def get_message(msg_id: str) -> dict:
    """Return full message with body."""
    try:
        svc    = _get_service()
        detail = svc.users().messages().get(
            userId="me", id=msg_id, format="full"
        ).execute()

        headers   = {h["name"]: h["value"] for h in detail["payload"]["headers"]}
        body, mime = _extract_body(detail["payload"])

        return {
            "id":        msg_id,
            "from":      headers.get("From", ""),
            "to":        headers.get("To", ""),
            "subject":   headers.get("Subject", "(no subject)"),
            "date":      headers.get("Date", ""),
            "body":      body,
            "body_mime": mime,
            "unread":    "UNREAD" in detail.get("labelIds", []),
        }
    except Exception as e:
        logger.error(f"get_message error: {e}")
        return {}


def _extract_body(payload, prefer_html: bool = True) -> tuple:
    """
    Recursively extract body from payload.
    Returns (content, mime_type) — prefers text/html when available.
    """
    import base64

    def decode(data: str) -> str:
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")

    mime = payload.get("mimeType", "")

    # Direct content parts
    if mime == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            return decode(data), "text/html"

    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return decode(data), "text/plain"

    # Multipart — collect both html and plain, prefer html
    if "parts" in payload:
        html_result  = None
        plain_result = None
        for part in payload["parts"]:
            content, ctype = _extract_body(part, prefer_html)
            if content:
                if ctype == "text/html"  and not html_result:
                    html_result  = (content, ctype)
                if ctype == "text/plain" and not plain_result:
                    plain_result = (content, ctype)
        if prefer_html and html_result:
            return html_result
        if plain_result:
            return plain_result
        if html_result:
            return html_result

    return "", "text/plain"


def send_message(to: str, subject: str, body: str) -> bool:
    """Send an email."""
    try:
        import base64
        from email.mime.text import MIMEText
        svc  = _get_service()
        msg  = MIMEText(body)
        msg["to"]      = to
        msg["subject"] = subject
        raw  = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        svc.users().messages().send(userId="me", body={"raw": raw}).execute()
        return True
    except Exception as e:
        logger.error(f"send_message error: {e}")
        return False


def mark_read(msg_id: str) -> bool:
    """Mark message as read."""
    try:
        svc = _get_service()
        svc.users().messages().modify(
            userId="me", id=msg_id,
            body={"removeLabelIds": ["UNREAD"]}
        ).execute()
        return True
    except Exception as e:
        logger.error(f"mark_read error: {e}")
        return False


def trash_message(msg_id: str) -> bool:
    """Move message to trash."""
    try:
        svc = _get_service()
        svc.users().messages().trash(userId="me", id=msg_id).execute()
        return True
    except Exception as e:
        logger.error(f"trash_message error: {e}")
        return False


def get_unread_count() -> int:
    """Return count of unread messages in INBOX."""
    try:
        svc = _get_service()
        res = svc.users().messages().list(
            userId="me", q="is:unread label:INBOX", maxResults=1
        ).execute()
        return res.get("resultSizeEstimate", 0)
    except Exception as e:
        logger.error(f"get_unread_count error: {e}")
        return 0
