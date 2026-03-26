# OZY2 User Guide

## Table of Contents
1. [Installation](#1-installation)
2. [First-Run Setup Wizard](#2-first-run-setup-wizard)
3. [The Interface](#3-the-interface)
4. [Chatting with OZY2](#4-chatting-with-ozy2)
5. [Plans & Skills](#5-plans--skills)
6. [Integrations Setup](#6-integrations-setup)
7. [Settings Reference](#7-settings-reference)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Installation

### macOS
1. Download `OZY2-mac.dmg` from the Releases page
2. Open the `.dmg` file
3. Drag **OZY2** into your **Applications** folder
4. Open OZY2 from Applications (or Launchpad)
5. If macOS says "unidentified developer": right-click → Open → Open anyway

### Windows
1. Download `OZY2-Setup.exe`
2. Run the installer (click through the wizard)
3. OZY2 appears in the Start menu and optionally on your Desktop
4. Launch it — a browser tab opens automatically

### Linux (AppImage)
```bash
chmod +x OZY2-linux-x86_64.AppImage
./OZY2-linux-x86_64.AppImage
```

### Linux (Debian / Ubuntu)
```bash
sudo dpkg -i ozy2_2.0.0_amd64.deb
ozy2
```

---

## 2. First-Run Setup Wizard

The first time you open OZY2, a **Setup Wizard** opens in your browser. It has four steps:

### Step 1 — Choose your AI
Pick which AI provider powers OZY2's brain:

| Provider | Best for | Cost |
|---|---|---|
| **Google Gemini** | Most users — fast, free tier | Free |
| **OpenAI GPT-4o** | Best reasoning | Paid |
| **Anthropic Claude** | Best writing | Paid |
| **Ollama** | Full privacy, runs offline | Free |

### Step 2 — Enter your API key
- Paste the API key for the provider you chose
- For **Ollama**: no key needed, just make sure Ollama is running
- The key is stored **only on your device** — never sent to OZY2 servers

### Step 3 — Choose your plan

| Plan | Skills included |
|---|---|
| 🧑 **You** | 11 everyday tools: weather, search, news, notes, reminders, Word/Excel… |
| ⚡ **Pro** | Everything in You + 14 pro tools: Gmail, GitHub, Notion, Stocks, Briefing… |
| 🌐 **Social** | Everything in Pro + 13 social tools: Discord, Spotify, YouTube, WhatsApp… |

You can change your plan anytime from **Settings → Plans**.

### Step 4 — Your name & theme
- Enter your name (OZY2 will use it in greetings)
- Choose Dark or Light theme
- Click **Launch OZY2 🚀**

---

## 3. The Interface

OZY2 opens in your default browser at `http://localhost:8081`. The interface has:

### Sidebar (left)
Navigation with panels grouped by category:
- **MAIN**: Chat, Home, Tasks, Memory, Briefing
- **COMMUNICATION**: Gmail, Telegram, WhatsApp
- **PRODUCTIVITY**: Calendar, Drive, GitHub, Projects, Notion, Trello
- **CREATIVE**: Content, YouTube, Debate, Workspace
- **SYSTEM**: Skills, Plans, Settings, Automations

### Chat panel
The main interface. Type naturally — OZY2 understands:
- Questions: *"What's the weather in London?"*
- Commands: *"Add a task: call dentist tomorrow"*
- Research: *"Search for the latest news on AI"*
- Creative: *"Write a LinkedIn post about productivity"*

### Home panel
Dashboard showing: today's events, pending tasks, recent memories.

---

## 4. Chatting with OZY2

OZY2 uses **tools** automatically — you don't need to learn special commands.

### Example prompts

**Weather**
> *"Weather in Tokyo this week"*
> *"Will it rain tomorrow in Berlin?"*

**Tasks**
> *"Add task: buy groceries — high priority"*
> *"What tasks do I have?"*
> *"Mark the dentist task as done"*

**Web Search**
> *"Latest news on electric cars"*
> *"What is the capital of Greenland?"*

**Email (Pro+)**
> *"Show my last 5 unread emails"*
> *"Send an email to john@example.com about the meeting"*

**GitHub (Pro+)**
> *"Search GitHub repos for FastAPI starters"*
> *"List my repositories"*

**Content (Pro+)**
> *"Write a blog post about working from home"*
> *"3 Instagram caption ideas for a coffee shop"*

**Stocks (Pro+)**
> *"What's Apple's stock price?"*
> *"How is NVIDIA doing today?"*

**YouTube (Social+)**
> *"Find YouTube tutorials on Python async"*
> *"Get the transcript of this video: youtube.com/watch?v=..."*

**Debate (Social+)**
> *"Debate the pros and cons of remote work"*
> *"Argue both sides of: AI replacing creative jobs"*

---

## 5. Plans & Skills

Go to **Settings → Plans** to see all available skills per tier and switch plans.

Each skill is a tool OZY2 can use during chat. The more skills, the more things OZY2 can do autonomously.

---

## 6. Integrations Setup

### Google (Gmail, Calendar, Drive)
1. In the OZY2 folder, run:
   ```
   python reauth_google.py
   ```
2. A browser tab opens → sign in with your Google account
3. Grant the requested permissions
4. Done — OZY2 can now read your Gmail and Calendar

### Notion
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration → copy the token
3. In OZY2 Settings → paste under **Notion Token**
4. Share any Notion page/database with your integration

### Trello
1. Get your API key: [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Generate a token
3. In OZY2 Settings → paste **Trello API Key** and **Trello Token**

### Telegram
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a bot → copy the token
3. In OZY2 Settings → paste **Telegram Bot Token**
4. Find your chat ID (message [@userinfobot](https://t.me/userinfobot))
5. Paste your **Telegram Chat ID**

### Spotify
1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app → copy Client ID and Client Secret
3. In OZY2 Settings → paste both values

### Discord
1. Create a webhook in your Discord server (Channel Settings → Integrations → Webhooks)
2. Copy the webhook URL
3. In OZY2 Settings → paste under **Discord Webhook URL**

### GitHub
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a token with `repo` and `read:user` scopes
3. In OZY2 Settings → paste under **GitHub Token**

### Obsidian
1. In OZY2 Settings → set **Obsidian Vault Path** to the folder of your vault
   - e.g. `/Users/you/Documents/MyVault`

---

## 7. Settings Reference

All settings can be changed in **Settings panel** or in `~/.ozy2/config/settings.json`.

| Key | Description | Example |
|---|---|---|
| `provider` | AI provider | `gemini` / `openai` / `anthropic` / `ollama` |
| `model` | Model name | `gemini-2.5-flash` |
| `api_key` | Provider API key | `AIza...` |
| `package` | Active plan | `you` / `pro` / `social` |
| `theme` | UI theme | `dark` / `light` |
| `user_name` | Your name | `Alex` |
| `briefing_time` | Daily briefing time | `08:30` |
| `telegram_token` | Telegram bot token | `1234:AABb...` |
| `github_token` | GitHub PAT | `github_pat_...` |
| `notion_token` | Notion integration token | `secret_...` |
| `obsidian_vault` | Path to Obsidian vault | `/Users/you/vault` |
| `trello_api_key` | Trello API key | |
| `trello_token` | Trello token | |
| `spotify_client_id` | Spotify client ID | |
| `spotify_client_secret` | Spotify client secret | |
| `discord_webhook_url` | Discord webhook URL | `https://discord.com/api/webhooks/...` |
| `youtube_api_key` | YouTube Data API v3 key | (optional, fallback search works without) |

---

## 8. Troubleshooting

### OZY2 won't open / browser doesn't open
- Wait 10 seconds and manually go to `http://localhost:8081`
- Check if something else is using port 8081 and close it

### "API key invalid" error
- Double-check your key has no extra spaces
- Make sure the key matches the provider (e.g. Gemini key in Gemini field)
- Check your API quota/billing on the provider's dashboard

### Gmail / Calendar not working
- Run `python reauth_google.py` again
- Make sure you granted all permissions during sign-in

### Slow responses
- Try a faster model (e.g. `gemini-2.0-flash` instead of `gemini-1.5-pro`)
- Check your internet connection

### macOS: "OZY2 is damaged and can't be opened"
```bash
xattr -cr /Applications/OZY2.app
```
Then try opening again.

### Can't find settings file
- macOS/Linux: `ls ~/.ozy2/config/`
- Windows: Open `%USERPROFILE%\.ozy2\config\` in Explorer

---

## Getting Help

- Open an [issue on GitHub](../../issues)
- Check existing issues for solutions

---

*OZY2 User Guide — v2.0.0*
