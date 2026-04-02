# Changelog

All notable changes to OZY2 are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v2.2.0] — 2026-04-03

### ✨ New Features

#### 🤖 Automations Panel
- 14 action types: send Telegram, create task, add reminder, log note, save memory, HTTP webhook, Gmail draft, log nutrition, add diary entry, create calendar event, update setting, run shell command, log baby event, send briefing
- Visual rule builder (trigger → condition → action)
- Cron + interval + one-shot scheduling via APScheduler
- Run logs with success/failure tracking

#### 🎤 Voice-First Accessible Assistant (`/voice`)
- Standalone page at `/voice` for visually impaired users
- WCAG 2.1 AAA compliant (8.6:1 contrast ratio, #FFD700 on #0a0a0a)
- ARIA live regions, role="log", skip links, keyboard navigation (Space/Esc/C)
- SpeechRecognition + server TTS (Microsoft Edge Neural voices)
- AudioContext unlock on first mic click — bypasses Chrome autoplay policy
- 10-language support with localized status messages
- Auto-listen mode toggle

#### 📷 Camera System Overhaul (edu-style)
- Camera modal now shows "Start Camera" button first — `getUserMedia` called directly in click handler (guaranteed Chrome popup)
- Gallery option added to camera modal
- Permission state pre-checked: auto-starts if already granted; shows friendly guide if blocked
- Works reliably in Diary, Baby Tracker, and any future panel

#### 🎨 Onboarding Improvements
- AI persona step: choose AI name + pick avatar from 12 emojis
- Blood type selection (A+/A-/B+/B-/AB+/AB-/O+/O-)
- Post-onboarding TTS welcome greeting in user's language (10 languages)
- Warmer, more intimate tone throughout

#### ⚡ Customizable Quick Actions
- Home panel: 23 available actions, choose your favorites
- Persistent via localStorage

### 🔧 Fixes
- `Permissions-Policy` header was blocking `camera=()` and `microphone=()` for all origins — now `camera=(self)` and `microphone=(self)`
- `navigator.permissions.query` returning stale `denied` for camera/mic — removed unreliable pre-check, always show "Start Camera" button
- Plans panel not loading — missing backend router + wrong fetch path + no `init_plans` function
- Visitors panel empty despite existing leads — `demo_mode` gate removed; panel always shows for admin
- "Günlük" → "Diary" in sidebar nav
- Voice TTS using `audio.play()` which failed after async LLM latency — switched to `AudioContext.decodeAudioData` which doesn't expire with user gesture
- Camera callback signature mismatch (`_cameraCallback(null, b64)` → `_cameraCallback(b64)`)

---

## [v2.1.0] — 2026-04-02

### ✨ New Features

#### 5 New You-Tier Panels
- **🥗 Nutrition Tracker** — Log meals (breakfast/lunch/dinner/snack) with calorie totals, water intake, and AI-powered recipe chat
- **👶 Baby Tracker** — Track feeds, sleep, diapers, weight, vaccines with stats dashboard and time-ago feed
- **🖼️ Photos** — Local photo album using File System Access API; grid view, lightbox, keyboard navigation, no cloud upload
- **🏠 Smart Home** — Webhook-based device control (Shelly, Tasmota, Home Assistant, ESPHome); toggle on/off from any browser
- **☕ Support OZY** — Buy Me a Coffee tiers, GitHub star, share link, feedback email

#### Multi-User Demo Mode
- Session isolation via `session_id UUID` per demo visitor across all SQLite tables
- Demo login: name + email only (no password)
- Auto-cleanup on logout / 5-minute idle timeout
- Encrypted leads file (`data/leads.enc`) with Fernet — key at `config/leads.key` (chmod 600)
- Admin-only **👥 Visitors** panel showing demo sign-ups with search and email copy

#### Performance — Token Optimization (~80% reduction)
- **Smart tool filter**: keyword-based category matching sends only relevant tools per message (76 tools → 5-8 per request; ~7,000 → ~400-700 tokens)
- **Auto-summary every 5 exchanges**: conversation compressed by LLM, stored in DB, old messages trimmed — non-blocking (`asyncio.create_task`)
- **Rolling context**: last 8 full messages + inline snippet of older turns
- **Compact system prompt**: conciseness directive added, security block condensed

### 🔧 Fixes
- Demo login (`/api/auth/demo_login`) blocked by AuthMiddleware — all `/api/auth/*` routes now public
- Home panel greeting hardcoded "Cabir" — now fetches `/api/auth/me` (demo users see their name; admins see `user_name` from settings)
- Admin-tier nav items (Visitors) hidden by package filter — `data-tier="admin"` items now bypass `_applyPackageFilter()`
- Optional routers (youtube, stocks) wrapped in `try/except` for import safety on ozy2-you edition

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
