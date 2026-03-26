"""OZY2 — Register integration tools with the agent."""
from core.tools import register


def register_all():
    """Call once at startup to register all skill tools."""

    # ── Tasks ─────────────────────────────────────────────────
    @register(
        name="list_tasks",
        description="List the user's tasks",
        params={"status": {"type": "string", "description": "Filter: todo | in_progress | done (optional)"}}
    )
    async def _list_tasks(status: str = ""):
        from integrations.tasks_db import list_tasks
        return list_tasks(status=status or None)

    @register(
        name="add_task",
        description="Add a new task",
        params={
            "title":    {"type": "string", "description": "Task title"},
            "priority": {"type": "string", "description": "low | normal | high"},
            "due_date": {"type": "string", "description": "Due date YYYY-MM-DD (optional)"},
        }
    )
    async def _add_task(title: str, priority: str = "normal", due_date: str = ""):
        from integrations.tasks_db import add_task
        task_id = add_task(title=title, priority=priority, due_date=due_date or None)
        return {"id": task_id, "title": title}

    # ── Calendar ──────────────────────────────────────────────
    @register(
        name="get_today_events",
        description="Get today's calendar events",
        params={}
    )
    async def _today_events():
        from integrations.calendar_google import today_events
        return today_events()

    @register(
        name="get_upcoming_events",
        description="Get upcoming calendar events",
        params={"days": {"type": "integer", "description": "How many days ahead (default 7)"}}
    )
    async def _upcoming(days: int = 7):
        from integrations.calendar_google import list_events
        return list_events(days_ahead=days)

    @register(
        name="create_calendar_event",
        description="Create a calendar event",
        params={
            "title":       {"type": "string"},
            "start":       {"type": "string", "description": "ISO datetime e.g. 2026-03-27T10:00:00"},
            "end":         {"type": "string", "description": "ISO datetime"},
            "description": {"type": "string", "description": "Optional description"},
        }
    )
    async def _create_event(title: str, start: str, end: str, description: str = ""):
        from integrations.calendar_google import create_event
        return create_event(title=title, start=start, end=end, description=description)

    # ── Gmail ─────────────────────────────────────────────────
    @register(
        name="list_emails",
        description="List recent emails from Gmail",
        params={
            "query": {"type": "string", "description": "Search query (optional)"},
            "limit": {"type": "integer", "description": "Max results (default 10)"},
        }
    )
    async def _list_emails(query: str = "", limit: int = 10):
        from integrations.gmail import list_messages
        return list_messages(max_results=limit, query=query)

    @register(
        name="send_email",
        description="Send an email",
        params={
            "to":      {"type": "string"},
            "subject": {"type": "string"},
            "body":    {"type": "string"},
        }
    )
    async def _send_email(to: str, subject: str, body: str):
        from integrations.gmail import send_message
        ok = send_message(to=to, subject=subject, body=body)
        return {"sent": ok}

    # ── Memory ────────────────────────────────────────────────
    @register(
        name="remember",
        description="Save a fact to memory",
        params={
            "key":   {"type": "string", "description": "Fact key e.g. user.birthday"},
            "value": {"type": "string", "description": "Fact value"},
        }
    )
    async def _remember(key: str, value: str):
        from core.memory import save_fact
        save_fact(key, value)
        return {"saved": True}

    @register(
        name="recall",
        description="Recall a stored fact",
        params={"key": {"type": "string"}}
    )
    async def _recall(key: str):
        from core.memory import get_fact
        return {"key": key, "value": get_fact(key)}

    # ── Telegram ──────────────────────────────────────────────
    @register(
        name="send_telegram",
        description="Send a message via Telegram to the user",
        params={"text": {"type": "string", "description": "Message text (HTML allowed)"}}
    )
    async def _send_telegram(text: str):
        from integrations.telegram import send_message
        ok = await send_message(text, parse_mode="HTML")
        return {"sent": ok}
