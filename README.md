<div align="center">

# ✦ OZY2

**Your personal AI assistant — runs entirely on your machine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()

[Download](#-download) · [Quick Start](#-quick-start) · [Plans](#-plans) · [User Guide](docs/user_guide.md) · [Skills Reference](docs/skills_reference.md) · [Developer Guide](docs/developer_guide.md)

</div>

---

## What is OZY2?

OZY2 is a personal AI assistant that runs locally on your computer. Open it like any app — no terminal needed. It connects to your choice of AI model (Google Gemini, ChatGPT, Claude, or a local Ollama model) and gives you a clean web interface to chat, manage tasks, read emails, browse GitHub, and much more.

**Everything stays on your machine. No account required. No data sent to us.**

---

## ✨ Features

| Category | What it does |
|---|---|
| 💬 **Chat** | Streaming AI chat with full tool use |
| 📅 **Calendar** | View and create Google Calendar events |
| 📧 **Gmail** | Read, search and send emails |
| ✅ **Tasks** | Personal to-do list with priorities |
| 🧠 **Memory** | Remembers facts about you across sessions |
| ☀️ **Briefing** | Morning summary: weather, calendar, news, tasks |
| 🔍 **Web Search** | DuckDuckGo search — no API key needed |
| 🌤️ **Weather** | Live weather for any city — no API key needed |
| 📰 **News** | Latest headlines by topic |
| 💱 **Currency** | Live exchange rates |
| 🐙 **GitHub** | Search repos, list issues |
| 🔲 **Notion** | Read and write pages |
| 📋 **Trello** | Manage boards and cards |
| 📈 **Stocks** | Live stock prices |
| ✍️ **Content** | Generate blog posts, captions, ad copy |
| 💬 **Discord** | Send messages via webhooks |
| 🎵 **Spotify** | Search tracks and albums |
| ▶️ **YouTube** | Search videos and get transcripts |
| ⚔️ **Debate** | Multi-perspective AI debate on any topic |
| ✈️ **Telegram** | Send and receive messages |
| + more | Notes, Reminders, Obsidian, WhatsApp… |

---

## 📦 Plans

OZY2 comes in three tiers. You choose during setup and can change anytime from Settings.

| | 🧑 **You** | ⚡ **Pro** | 🌐 **Social** |
|---|---|---|---|
| **Who it's for** | Everyday use | Power users | Social & creators |
| Web Search | ✅ | ✅ | ✅ |
| Weather | ✅ | ✅ | ✅ |
| News | ✅ | ✅ | ✅ |
| Currency | ✅ | ✅ | ✅ |
| Notes & Reminders | ✅ | ✅ | ✅ |
| Word / Excel | ✅ | ✅ | ✅ |
| Gmail | — | ✅ | ✅ |
| Google Drive | — | ✅ | ✅ |
| GitHub | — | ✅ | ✅ |
| Notion / Obsidian | — | ✅ | ✅ |
| Trello | — | ✅ | ✅ |
| Stocks | — | ✅ | ✅ |
| Content Creator | — | ✅ | ✅ |
| Daily Briefing | — | ✅ | ✅ |
| Discord | — | — | ✅ |
| Spotify | — | — | ✅ |
| YouTube | — | — | ✅ |
| WhatsApp | — | — | ✅ |
| Debate Mode | — | — | ✅ |
| Email Monitor | — | — | ✅ |

---

## 🚀 Download

> Pre-built installers are on the [Releases](../../releases) page.

| Platform | File | Notes |
|---|---|---|
| **macOS** 12+ | `OZY2-mac.dmg` | Drag to Applications, double-click |
| **Windows** 10/11 | `OZY2-Setup.exe` | Standard installer wizard |
| **Linux** x86_64 | `OZY2-linux-x86_64.AppImage` | No install — just run |
| **Linux** Debian/Ubuntu | `ozy2_2.0.0_amd64.deb` | `sudo dpkg -i` |

---

## ⚡ Quick Start

### Option 1 — Pre-built app (recommended for end users)
1. Download the file for your platform from [Releases](../../releases)
2. Install/open it
3. A **Setup Wizard** opens in your browser automatically
4. Enter your API key → choose a plan → enter your name → **Launch OZY2**

### Option 2 — Run from source (for developers)
```bash
git clone https://github.com/cabirpekdemir/ozy2.git
cd ozy2
pip install -r requirements.txt
python launcher.py
```
Browser opens at `http://localhost:8082`.

---

## 🔑 Getting an API Key

OZY2 needs an API key for its AI brain. Pick any provider:

| Provider | Free tier | Speed | Get Key |
|---|---|---|---|
| **Google Gemini** ⭐ | ✅ Yes | Very fast | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **OpenAI GPT-4o** | ❌ Paid | Fast | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic Claude** | ❌ Paid | Fast | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **Ollama (local)** | ✅ Free | Depends on GPU | [ollama.com](https://ollama.com) |

> **Recommended for beginners:** Google Gemini has a generous free tier — no credit card needed.

---

## ⚙️ Configuration

Settings are stored in:
- **macOS / Linux:** `~/.ozy2/config/settings.json`
- **Windows:** `%USERPROFILE%\.ozy2\config\settings.json`

All settings can be changed from the **Settings panel** inside the app.
See [`config/settings.example.json`](config/settings.example.json) for a full reference.

### Google integrations (Gmail, Calendar, Drive)
Run this once after installing:
```bash
python reauth_google.py
```
A browser tab opens for Google sign-in. Your token is stored locally — never shared.

---

## 🔨 Build from Source

### Requirements
- Python 3.11+
- `pip install pyinstaller pillow pystray`
- **macOS:** `brew install create-dmg`
- **Windows:** [Inno Setup 6](https://jrsoftware.org/isinfo.php)
- **Linux:** `dpkg-dev` (optional, for .deb)

### Build commands

```bash
# macOS → dist/OZY2-mac.dmg
bash build/mac/build_mac.sh

# Windows → dist/OZY2-Setup.exe
build\windows\build_windows.bat

# Linux → dist/OZY2-linux-x86_64.AppImage + .deb
bash build/linux/build_linux.sh
```

---

## 🗂️ Project Structure

```
ozy2/
├── launcher.py              ← Entry point (double-click to start)
├── api/                     ← FastAPI backend
│   └── routers/             ← API route handlers
├── core/                    ← LLM, memory, tools, scheduler
├── integrations/            ← Gmail, Calendar, Drive, Telegram
├── skills/
│   ├── you_skills.py        ← YOU tier: weather, search, news…
│   ├── pro_skills.py        ← PRO tier: GitHub, Notion, Stocks…
│   └── social_skills.py     ← SOCIAL tier: Discord, Spotify, YouTube…
├── ui/
│   ├── templates/           ← HTML (index + setup wizard)
│   └── static/panels/       ← 20+ lazy-loaded UI panels
├── config/
│   ├── packages.json        ← Plan/tier definitions
│   └── settings.example.json
└── build/                   ← Platform build scripts & PyInstaller spec
    ├── ozy2.spec
    ├── mac/
    ├── windows/
    └── linux/
```

---

## 🤝 Contributing

Pull requests are welcome!

1. Fork the repo
2. `git checkout -b feature/my-feature`
3. Commit and push
4. Open a PR

Please don't commit `config/settings.json`, `config/google_token.json`, or anything in `data/` — these are gitignored for a reason.

---

## 📄 License

[MIT](LICENSE) © 2026 OZY2
