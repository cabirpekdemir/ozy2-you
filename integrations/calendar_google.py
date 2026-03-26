"""OZY2 — Google Calendar Integration"""
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

ROOT  = Path(__file__).parent.parent
TOKEN = ROOT / "config" / "google_token.json"

SCOPES = ["https://www.googleapis.com/auth/calendar"]


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

        return build("calendar", "v3", credentials=creds)
    except Exception as e:
        logger.error(f"Calendar service init failed: {e}")
        raise


def list_events(days_ahead: int = 7, max_results: int = 20) -> list:
    """Return upcoming events."""
    try:
        svc  = _get_service()
        now  = datetime.now(timezone.utc)
        end  = now + timedelta(days=days_ahead)
        res  = svc.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=end.isoformat(),
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        events = []
        for e in res.get("items", []):
            start = e["start"].get("dateTime", e["start"].get("date", ""))
            end_t = e["end"].get("dateTime", e["end"].get("date", ""))
            events.append({
                "id":          e["id"],
                "title":       e.get("summary", "(no title)"),
                "start":       start,
                "end":         end_t,
                "location":    e.get("location", ""),
                "description": e.get("description", ""),
                "all_day":     "dateTime" not in e["start"],
            })
        return events
    except Exception as e:
        logger.error(f"list_events error: {e}")
        return []


def create_event(title: str, start: str, end: str,
                 description: str = "", location: str = "") -> Optional[dict]:
    """Create a calendar event. start/end are ISO strings."""
    try:
        svc  = _get_service()
        body = {
            "summary":     title,
            "description": description,
            "location":    location,
            "start":       {"dateTime": start, "timeZone": "Europe/Istanbul"},
            "end":         {"dateTime": end,   "timeZone": "Europe/Istanbul"},
        }
        ev = svc.events().insert(calendarId="primary", body=body).execute()
        return {"id": ev["id"], "title": ev.get("summary"), "link": ev.get("htmlLink")}
    except Exception as e:
        logger.error(f"create_event error: {e}")
        return None


def delete_event(event_id: str) -> bool:
    """Delete an event by ID."""
    try:
        svc = _get_service()
        svc.events().delete(calendarId="primary", eventId=event_id).execute()
        return True
    except Exception as e:
        logger.error(f"delete_event error: {e}")
        return False


def today_events() -> list:
    """Return events for today only."""
    now   = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end   = today + timedelta(days=1)
    try:
        svc = _get_service()
        res = svc.events().list(
            calendarId="primary",
            timeMin=today.isoformat(),
            timeMax=end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        events = []
        for e in res.get("items", []):
            start = e["start"].get("dateTime", e["start"].get("date", ""))
            events.append({
                "id":    e["id"],
                "title": e.get("summary", "(no title)"),
                "start": start,
                "end":   e["end"].get("dateTime", e["end"].get("date", "")),
            })
        return events
    except Exception as e:
        logger.error(f"today_events error: {e}")
        return []
