# ✦ OZY2 — Personal AI Assistant v2.0

> A complete rebuild of OZY — modular, English-only, Card OS design, mobile-first PWA.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green)
![License](https://img.shields.io/badge/license-private-gray)

---

## Features

| Category | Features |
|---|---|
| **AI** | Gemini, Claude, GPT-4o, Grok, DeepSeek, Qwen — streaming chat |
| **Email** | Gmail read, send, reply, trash, search |
| **Calendar** | Google Calendar — view, create, delete events |
| **Drive** | Google Drive — browse, search, read documents |
| **Messaging** | Telegram bot — send/receive messages |
| **Tasks** | Personal task manager with priorities & due dates |
| **Memory** | Persistent facts + 200-message conversation history |
| **Briefing** | Daily morning summary delivered to Telegram |
| **AI Debate** | 6 AI models debating any topic simultaneously |
| **Content** | AI content studio — LinkedIn, Twitter, YouTube scripts |
| **PWA** | Installable on iOS & Android via browser |

---

## Architecture

```
Ozy2/
├── core/
│   ├── llm.py              # Multi-provider LLM client
│   ├── memory.py           # SQLite facts + conversation history
│   ├── tools.py            # @register() tool registry
│   ├── agent.py            # Orchestration + streaming
│   └── scheduler.py        # Cron/interval scheduler
│
├── api/
│   ├── app.py              # FastAPI app
│   ├── state.py            # Agent singleton
│   └── routers/
│       ├── chat.py         # POST /api/chat, GET /api/chat/stream (SSE)
│       ├── gmail.py        # Gmail CRUD
│       ├── calendar_router.py
│       ├── drive_router.py
│       ├── tasks_router.py
│       ├── memory_router.py
│       ├── telegram_router.py
│       ├── briefing_router.py
│       ├── settings.py
│       └── i18n.py
│
├── integrations/
│   ├── gmail.py
│   ├── calendar_google.py
│   ├── drive.py
│   ├── telegram.py
│   └── tasks_db.py
│
├── skills/
│   └── tools_register.py   # 10 agent tools
│
├── ui/
│   ├── templates/
│   │   └── index.html      # Card OS layout
│   ├── static/
│   │   ├── css/design.css  # Full design system
│   │   ├── js/
│   │   │   ├── app.js      # Panel loader, toast, theme
│   │   │   └── i18n.js     # i18n helper
│   │   └── panels/         # 17 lazy-loaded panel JS files
│   └── i18n/
│       └── en.json         # 91 translation keys
│
├── config/                 # gitignored — local secrets only
│   ├── settings.json
│   ├── google_token.json
│   └── google_credentials.json
│
├── data/                   # gitignored — local DB files
│   ├── memory.db
│   └── tasks.db
│
├── debate.py               # Standalone multi-AI debate CLI
├── OZY2.command            # macOS launch script
└── Debate.command          # macOS debate launcher
```

---

## Quick Start

### 1. Prerequisites

```bash
# Python 3.10+ required
python3 --version

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Copy the example config and fill in your keys:

```bash
cp config/settings.example.json config/settings.json
```

`config/settings.json`:
```json
{
  "provider":        "gemini",
  "model":           "gemini-2.5-flash",
  "api_key":         "YOUR_GEMINI_KEY",
  "telegram_token":  "YOUR_TELEGRAM_BOT_TOKEN",
  "github_username": "your-username",
  "user_name":       "Your Name"
}
```

### 3. Google OAuth (Gmail, Calendar, Drive)

```bash
pip install google-auth-oauthlib google-api-python-client
python3 reauth_google.py
```

This opens a browser window. Authorize all scopes once — token is saved to `config/google_token.json`.

### 4. Start

```bash
# macOS — double-click
open OZY2.command

# or terminal
python3 start.py
```

Open **http://127.0.0.1:8081** in your browser.

---

## AI Providers

| Provider | Model | Key env |
|---|---|---|
| Google Gemini | `gemini-2.5-flash` | `api_key` in settings |
| Anthropic Claude | `claude-sonnet-4-6` | `api_key` in settings |
| OpenAI | `gpt-4o` | `api_key` in settings |
| Ollama (local) | `llama3.3`, `mistral`, etc. | no key needed |

Switch provider at any time from **Settings → AI Provider**.

---

## API Reference

Interactive API docs are available at **http://127.0.0.1:8081/docs** when OZY2 is running.

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/chat/stream?message=...` | Streaming SSE chat |
| `POST` | `/api/chat` | Single-turn chat |
| `GET` | `/api/gmail/messages` | List emails |
| `POST` | `/api/gmail/send` | Send email |
| `GET` | `/api/calendar/events` | List calendar events |
| `POST` | `/api/calendar/events` | Create event |
| `GET` | `/api/drive/recent` | Recent Drive files |
| `GET` | `/api/tasks` | List tasks |
| `POST` | `/api/tasks` | Create task |
| `GET` | `/api/memory/facts` | Get stored facts |
| `GET` | `/api/briefing` | Get morning briefing |
| `GET` | `/api/settings` | Read settings |
| `POST` | `/api/settings` | Update settings |

---

## AI Debate CLI

Run a multi-AI debate from the terminal:

```bash
# Interactive
python3 debate.py

# Direct topic
python3 debate.py "Will AI replace software engineers?"

# 3 rounds, all models
python3 debate.py "Does free will exist?" --rounds 3 --all
```

Supports: Gemini · Claude · GPT-4o · Grok · DeepSeek · Qwen

---

## Agent Tools

The chat agent has access to 10 built-in tools:

| Tool | Description |
|---|---|
| `list_tasks` | List user's tasks |
| `add_task` | Create a new task |
| `get_today_events` | Today's calendar events |
| `get_upcoming_events` | Upcoming events (N days) |
| `create_calendar_event` | Create a calendar event |
| `list_emails` | List recent emails |
| `send_email` | Send an email |
| `remember` | Save a fact to memory |
| `recall` | Recall a stored fact |
| `send_telegram` | Send Telegram message to user |

Example chat: *"Add a task to call my dentist tomorrow"* → agent calls `add_task` automatically.

---

## Panels

| Panel | Description |
|---|---|
| Chat | AI chat with streaming |
| Home | Dashboard with stats & quick actions |
| Tasks | Task manager |
| Memory | Facts & chat history |
| Briefing | Daily morning summary |
| Gmail | Full email client |
| Calendar | Event viewer & creator |
| Telegram | Message viewer & sender |
| Drive | File browser |
| Projects | Project tracker |
| Workspace | Unified file access |
| YouTube | Channel analytics (coming soon) |
| Content | AI content studio |
| AI Debate | Multi-model debate arena |
| Skills | Installed skills overview |
| Automations | Scheduled tasks |
| Settings | All configuration |

---

## Design System

Card OS — glassmorphism, iOS-inspired depth, dark/light themes.

CSS variables in `ui/static/css/design.css`:
- `--accent` — primary color (`#6366f1`)
- `--card-bg` — glass card background
- `--card-border` — subtle borders
- `--text-1/2/3` — text hierarchy
- `--r-sm/md/lg/xl` — border radius scale

---

## i18n

All UI strings are key-based via `ui/i18n/en.json`.

```javascript
// In any panel JS
t('chat.empty')          // → "Start a conversation"
t('nav.gmail')           // → "Gmail"
```

To add a language: create `ui/i18n/fr.json` with the same keys.

---

## License

Private — all rights reserved.
