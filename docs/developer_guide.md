# OZY2 Developer Guide

A technical reference for contributors and developers building on OZY2.

---

## Architecture Overview

OZY2 is a local-first desktop application. It runs a **FastAPI server** on `localhost:8081` and serves a web UI in the user's default browser. There is no cloud component — all data stays on the user's machine.

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                     │
│              http://localhost:8081                   │
└────────────────────┬────────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────────────┐
│              FastAPI Backend (api/)                  │
│  /api/chat   /api/tasks   /api/settings   ...        │
└──────┬───────────┬──────────────────────────────────┘
       │           │
┌──────▼──────┐ ┌──▼────────────────────────────────┐
│  core/      │ │  skills/                           │
│  agent.py   │ │  you_skills.py  38 tools           │
│  memory.py  │ │  pro_skills.py  registered via     │
│  llm.py     │ │  social_skills.py  @register()     │
└─────────────┘ └───────────────────────────────────┘
```

---

## Project Structure

```
ozy2/
├── launcher.py              # Entry point — starts FastAPI + opens browser
├── start.py                 # Alternative start (used by packaged app)
│
├── api/                     # FastAPI application
│   ├── app.py               # App factory, mounts routers
│   └── routers/
│       ├── chat.py          # POST /api/chat — main LLM endpoint
│       ├── tasks.py         # CRUD /api/tasks
│       ├── memory.py        # /api/memory
│       ├── settings.py      # /api/settings + /api/packages
│       ├── calendar_router.py
│       ├── gmail_router.py
│       ├── drive_router.py
│       └── ...
│
├── core/
│   ├── agent.py             # Orchestrates LLM calls + tool dispatch
│   ├── llm.py               # Provider abstraction (Gemini/OpenAI/Anthropic/Ollama)
│   ├── memory.py            # SQLite-backed memory store
│   ├── scheduler.py         # APScheduler for daily briefings
│   └── config.py            # Loads ~/.ozy2/config/settings.json
│
├── skills/
│   ├── tools_register.py    # @register decorator + tool registry
│   ├── you_skills.py        # 12 free-tier tools
│   ├── pro_skills.py        # 11 pro-tier tools
│   └── social_skills.py     # 9 social-tier tools
│
├── integrations/
│   ├── gmail.py             # Gmail API wrapper
│   ├── calendar.py          # Google Calendar wrapper
│   ├── drive.py             # Google Drive wrapper
│   └── telegram_bot.py      # Telegram bot
│
├── ui/
│   ├── templates/
│   │   ├── index.html       # Main app shell
│   │   └── setup.html       # First-run setup wizard
│   └── static/
│       ├── panels/          # 20+ lazy-loaded JS panels
│       │   ├── chat.js
│       │   ├── tasks.js
│       │   ├── plans.js
│       │   └── ...
│       └── icons/           # App icons (png, ico, icns)
│
├── config/
│   ├── packages.json        # Tier definitions (skills, colors, prices)
│   └── settings.example.json
│
├── data/                    # Runtime data (gitignored)
│   ├── ozy2.db              # SQLite: tasks, memory, notes, reminders
│   └── notes/               # Local markdown notes
│
└── packaging/               # Build scripts
    ├── ozy2.spec            # PyInstaller spec
    ├── mac/
    ├── windows/
    └── linux/
```

---

## Tool Registry

All skills are registered with the `@register` decorator:

```python
# skills/tools_register.py
from functools import wraps

_REGISTRY = {}  # name → {schema, fn, package}

def register(name, description, params, package="core"):
    def decorator(fn):
        _REGISTRY[name] = {
            "schema": build_schema(name, description, params),
            "fn": fn,
            "package": package,
        }
        return fn
    return decorator

def get_all_schemas(packages=None):
    """Return tool schemas filtered by allowed package set."""
    return [
        v["schema"] for v in _REGISTRY.values()
        if packages is None or v["package"] in packages
    ]
```

### Tier filtering in agent.py

```python
_TIER_PACKAGES = {
    "you":    {"core", "you"},
    "pro":    {"core", "you", "pro"},
    "social": {"core", "you", "pro", "social"},
    "full":   None,  # all tools
}
_allowed = _TIER_PACKAGES.get(current_package)
tools = get_all_schemas(packages=_allowed)
```

---

## LLM Abstraction

`core/llm.py` provides a unified interface across providers:

```python
response = await llm.chat(
    messages=[...],
    tools=[...],       # OpenAI-format tool schemas
    stream=True,
)
```

Supported providers:
- `gemini` → `google-generativeai`
- `openai` → `openai`
- `anthropic` → `anthropic`
- `ollama` → local HTTP API

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Send message, get streamed response |
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create task |
| `PATCH` | `/api/tasks/{id}` | Update task |
| `DELETE` | `/api/tasks/{id}` | Delete task |
| `GET` | `/api/memory` | List memory entries |
| `POST` | `/api/memory` | Add memory |
| `GET` | `/api/settings` | Get current settings |
| `POST` | `/api/settings` | Update settings |
| `GET` | `/api/packages` | Get all tier definitions |
| `GET` | `/api/packages/active` | Get active tier + skills |
| `GET` | `/api/gmail` | List Gmail messages |
| `GET` | `/api/calendar` | List calendar events |
| `POST` | `/api/calendar` | Create calendar event |

---

## Data Storage

All data is stored locally in `~/.ozy2/`:

```
~/.ozy2/
├── config/
│   ├── settings.json        # User settings + API keys
│   └── google_token.json    # Google OAuth token (gitignored)
└── data/
    ├── ozy2.db              # SQLite database
    └── notes/               # Markdown notes
```

### SQLite schema

```sql
-- Tasks
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT, description TEXT,
    priority TEXT, status TEXT,
    created_at TEXT, due_date TEXT
);

-- Memory
CREATE TABLE memory (
    id TEXT PRIMARY KEY,
    key TEXT, value TEXT,
    created_at TEXT
);

-- Notes
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT, content TEXT,
    created_at TEXT
);

-- Reminders
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    text TEXT, due TEXT,
    done INTEGER DEFAULT 0
);
```

---

## Running in Development

```bash
git clone https://github.com/cabirpekdemir/ozy2.git
cd ozy2
pip install -r requirements.txt
python launcher.py
```

The server starts at `http://localhost:8081` with hot-reload disabled by default. For development with auto-reload:

```bash
uvicorn api.app:app --reload --port 8081
```

---

## Building for Distribution

### macOS
```bash
cd packaging
pyinstaller ozy2.spec
cd mac && bash build_mac.sh
# Output: dist/OZY2-mac.dmg
```

### Windows
```bash
cd packaging/windows
build_windows.bat
# Output: dist/OZY2-Setup.exe
```

### Linux
```bash
cd packaging/linux
bash build_linux.sh
# Output: dist/ozy2-linux.tar.gz
```

GitHub Actions automates all three when a `v*.*.*` tag is pushed.

---

*OZY2 Developer Guide — v2.0.0*
