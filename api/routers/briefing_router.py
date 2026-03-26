"""OZY2 — Briefing API Router"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/briefing", tags=["Briefing"])


async def _generate_briefing() -> dict:
    """Generate morning briefing from all integrations."""
    from datetime import datetime
    sections = []

    # Calendar
    try:
        from integrations.calendar_google import today_events
        events = today_events()
        if events:
            ev_text = "\n".join(
                f"• {e['title']} at {e['start'][-8:-3] if 'T' in e['start'] else 'all day'}"
                for e in events[:5]
            )
            sections.append(f"**Today's Calendar ({len(events)} events)**\n{ev_text}")
    except Exception:
        pass

    # Gmail
    try:
        from integrations.gmail import get_unread_count
        count = get_unread_count()
        sections.append(f"**Gmail:** {count} unread message{'s' if count != 1 else ''}")
    except Exception:
        pass

    if not sections:
        sections.append("No data available — check your integrations in Settings.")

    return {
        "date":     datetime.now().strftime("%A, %d %B %Y"),
        "sections": sections,
        "text":     "\n\n".join(sections),
    }


@router.get("")
async def get_briefing():
    try:
        data = await _generate_briefing()
        return {"ok": True, **data}
    except Exception as e:
        return {"ok": False, "error": str(e), "text": ""}


@router.post("/send")
async def send_briefing():
    """Send briefing via Telegram."""
    try:
        from integrations.telegram import send_message
        data   = await _generate_briefing()
        text   = f"☀️ <b>Morning Briefing — {data['date']}</b>\n\n" + data["text"]
        ok     = await send_message(text, parse_mode="HTML")
        return {"ok": ok}
    except Exception as e:
        return {"ok": False, "error": str(e)}
