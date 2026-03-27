# OZY2 Skills Reference

All 38 tools available in OZY2, organized by plan tier.

---

## 🧑 YOU Plan — Free (12 skills)

| Skill | Trigger phrases | What it does |
|---|---|---|
| 🌤️ **Weather** | "weather in X", "will it rain tomorrow" | Real-time forecast via Open-Meteo (no API key) |
| 🔍 **Web Search** | "search for X", "look up Y" | DuckDuckGo search, no API key needed |
| 📰 **News** | "latest news on X", "headlines about Y" | Top headlines by topic or keyword |
| 💱 **Currency** | "convert 100 USD to EUR", "exchange rate" | Live rates via open.er-api.com |
| 📝 **Summarizer** | "summarize this", "summarize URL" | Condense any text or webpage |
| 📄 **Word / DOCX** | "create a Word doc about X", "write a report" | Generates `.docx` files with formatted content |
| 📊 **Excel / XLSX** | "make a spreadsheet", "create a table" | Generates `.xlsx` files with data and formulas |
| 🗒️ **Notes** | "add a note", "show my notes" | Add/list notes (Apple Notes on macOS, local fallback) |
| ⏰ **Reminders** | "remind me to X", "set a reminder" | Add/list reminders |
| ✅ **Tasks** | "add task X", "what are my tasks", "mark done" | Full to-do list with priorities |
| 🧠 **Memory** | "remember that I...", "what do you know about me" | Persistent facts stored in local SQLite |
| 📅 **Calendar** | "what's on my calendar", "add event" | Google Calendar read/write |

---

## ⚡ PRO Plan — Coming Soon (11 additional skills)

> Includes everything in YOU, plus:

| Skill | Trigger phrases | What it does |
|---|---|---|
| 📧 **Gmail** | "show my emails", "send email to X" | Read, search and send Gmail messages |
| 💾 **Google Drive** | "find file X in Drive", "upload this" | Browse, search and manage Drive files |
| 🐙 **GitHub** | "search GitHub for X", "list my repos" | Search repos, list issues, view PRs |
| 🔲 **Notion** | "search Notion for X", "add Notion page" | Read and write Notion pages and databases |
| 💎 **Obsidian** | "search my vault for X", "add note to vault" | Query and add notes to your Obsidian vault |
| 📋 **Trello** | "show my Trello boards", "add card to X" | Manage Trello boards, lists and cards |
| 📈 **Stocks** | "Apple stock price", "how is TSLA doing" | Live prices and basic company info |
| ✍️ **Content Creator** | "write a blog post about X", "3 caption ideas" | Blog posts, LinkedIn posts, ad copy, captions |
| 🎓 **Lesson Planner** | "create a lesson on X", "make a quiz about Y" | Structured lessons and multiple-choice quizzes |
| 🗂️ **Projects** | "list my projects", "add project X" | Track projects and milestones locally |
| ☀️ **Daily Briefing** | "give me my briefing", "morning summary" | Combines weather + calendar + tasks + news |

---

## 🌐 SOCIAL Plan — Coming Soon (9 additional skills)

> Includes everything in PRO, plus:

| Skill | Trigger phrases | What it does |
|---|---|---|
| 📲 **Social Media** | "draft a tweet about X", "post idea for Instagram" | Draft posts for X, Instagram, LinkedIn |
| 💬 **Discord** | "send to Discord: X", "list channels" | Send messages via Discord webhooks |
| 🎵 **Spotify** | "search Spotify for X", "what's playing" | Search tracks, get now-playing info |
| 🎶 **Music ID** | "what song is this", "get lyrics for X" | Identify music and fetch lyrics |
| 💚 **WhatsApp** | "send WhatsApp to X: message" | Send WhatsApp messages via Twilio |
| ▶️ **YouTube** | "find YouTube videos on X", "transcript of this video" | Search, get video transcripts and summaries |
| ⚔️ **Debate Mode** | "debate X", "pros and cons of Y", "argue both sides" | Multi-perspective AI debate with N sides and rounds |
| 🔔 **Email Monitor** | "alert me when email from X arrives" | Watch inbox for keywords or senders |
| ✈️ **Telegram** | "send Telegram message: X", "check Telegram" | Send and receive Telegram messages |

---

## Adding Custom Skills

Skills are registered with the `@register` decorator in `skills/`:

```python
from skills.tools_register import register

@register(
    name="my_tool",
    description="What this tool does and when to use it.",
    params={
        "query": {"type": "string", "description": "Search query", "required": True},
    },
    package="you",  # "you" | "pro" | "social"
)
async def _my_tool(query: str):
    # ... your code here
    return {"result": "..."}
```

Then add `register_all()` call in `skills/tools_register.py`.

---

*OZY2 Skills Reference — v2.0.0*
