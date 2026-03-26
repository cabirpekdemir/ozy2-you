# Changelog

All notable changes to OZY2 are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v2.0.0] — 2026-03-26

### 🎉 Initial public release

#### Core
- Modular FastAPI backend replacing OZY v1's monolithic architecture
- Multi-provider LLM support: **Gemini**, **OpenAI**, **Anthropic Claude**, **Ollama** (local)
- Local-first: all data stays on your device — no cloud sync, no telemetry
- SQLite memory (facts + conversation history)
- APScheduler-based task scheduler
- Setup wizard (first-run onboarding, no terminal required)
- System tray icon on all platforms (macOS, Windows, Linux)

#### Plans & Skills
- **OZY2 You** (11 tools) — Weather, Web Search, News, Currency, Summarizer,
  Word/DOCX, Excel/XLSX, Notes, Reminders, Tasks, Memory
- **OZY2 Pro** (+ 14 tools) — GitHub, Notion, Obsidian, Trello, Stocks,
  Content Creator, Lesson Planner, Projects, Daily Briefing, Google Drive/Calendar/Gmail
- **OZY2 Social** (+ 13 tools) — Discord, Spotify, YouTube, WhatsApp,
  Social Media Drafts, Lyrics, Debate Mode, Email Monitor, Telegram
- Tool registry with package-based gating — only active-tier tools are exposed to the LLM

#### UI
- Card OS interface (glassmorphism, dark/light theme)
- 20 lazy-loaded panels (Chat, Tasks, Calendar, Gmail, Drive, Telegram, WhatsApp,
  YouTube, GitHub, Projects, Content, Debate, Skills, Plans, Settings, …)
- Full English i18n (100 translation keys)
- Plans panel: visual tier comparison + one-click activation

#### Integrations
- Google OAuth (Gmail, Calendar, Drive) via service account or user OAuth flow
- Telegram bot (send + receive)
- WhatsApp via Twilio webhook or macOS AppleScript fallback

#### Distribution
- GitHub Actions CI/CD: auto-builds on every `vX.Y.Z` tag
- macOS: signed `.dmg` (drag-to-Applications)
- Windows: NSIS installer (`.exe`)
- Linux: `.tar.gz` + `install.sh` (creates desktop entry + CLI symlink)

---

## [Unreleased]

_Planned for v2.1:_
- Auto-update notifications (GitHub Releases check)
- Plugin marketplace (community skills)
- Voice input / Text-to-speech output
- Mobile companion app (read-only)
