"""
OZY2 — PRO Tier Skills
Package: pro

Includes: github, notion, obsidian, trello, stocks,
          content_creator, lesson_planner, projects, daily_briefing
"""
from core.tools import register


def register_all():

    # ── GitHub ────────────────────────────────────────────────────────────────
    @register(
        name="search_github",
        description="Search GitHub repositories or issues.",
        params={
            "query":  {"type": "string", "description": "Search query", "required": True},
            "type":   {"type": "string", "description": "repositories | issues | users (default: repositories)"},
            "limit":  {"type": "integer","description": "Max results (default 8)"},
        },
        package="pro",
    )
    async def _github_search(query: str, type: str = "repositories", limit: int = 8):
        import urllib.request, urllib.parse, json
        endpoint = {"repositories": "repositories", "issues": "issues", "users": "users"}.get(type, "repositories")
        url = f"https://api.github.com/search/{endpoint}?q={urllib.parse.quote(query)}&per_page={limit}"
        req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json",
                                                    "User-Agent": "OZY2-Agent"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            items = data.get("items", [])
            results = []
            for it in items:
                results.append({
                    "name":        it.get("full_name") or it.get("login") or it.get("title", ""),
                    "description": it.get("description") or it.get("body", "")[:120],
                    "url":         it.get("html_url", ""),
                    "stars":       it.get("stargazers_count"),
                    "language":    it.get("language"),
                })
            return {"ok": True, "query": query, "type": type, "results": results}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="list_github_repos",
        description="List repositories for a GitHub user or organisation.",
        params={
            "username": {"type": "string", "description": "GitHub username/org", "required": True},
            "limit":    {"type": "integer","description": "Max repos (default 10)"},
        },
        package="pro",
    )
    async def _github_repos(username: str, limit: int = 10):
        import urllib.request, json
        url = f"https://api.github.com/users/{username}/repos?per_page={limit}&sort=updated"
        req = urllib.request.Request(url, headers={"User-Agent": "OZY2-Agent"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                repos = json.loads(r.read())
            return {
                "ok": True, "username": username,
                "repos": [{"name": r["name"], "url": r["html_url"],
                           "stars": r["stargazers_count"], "language": r["language"],
                           "description": r["description"]} for r in repos]
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Notion ────────────────────────────────────────────────────────────────
    @register(
        name="search_notion",
        description="Search Notion pages and databases.",
        params={
            "query": {"type": "string", "description": "Search query", "required": True},
            "limit": {"type": "integer","description": "Max results (default 10)"},
        },
        package="pro",
    )
    async def _notion_search(query: str, limit: int = 10):
        import urllib.request, json
        from pathlib import Path
        cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        token = cfg.get("notion_token", "")
        if not token:
            return {"error": "notion_token not set in config/settings.json"}
        url  = "https://api.notion.com/v1/search"
        data = json.dumps({"query": query, "page_size": limit}).encode()
        req  = urllib.request.Request(url, data=data, headers={
            "Authorization":  f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type":   "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                resp = json.loads(r.read())
            results = []
            for obj in resp.get("results", []):
                title = ""
                props = obj.get("properties", {})
                for v in props.values():
                    if isinstance(v, dict) and v.get("type") == "title":
                        parts = v.get("title", [])
                        title = "".join(p.get("plain_text", "") for p in parts)
                        break
                if not title:
                    title = obj.get("url", "")
                results.append({"id": obj["id"], "title": title, "url": obj.get("url", ""),
                                 "type": obj.get("object", "")})
            return {"ok": True, "query": query, "results": results}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="add_notion_page",
        description="Add a new page to a Notion database.",
        params={
            "database_id": {"type": "string", "description": "Notion database ID", "required": True},
            "title":       {"type": "string", "description": "Page title", "required": True},
            "content":     {"type": "string", "description": "Page body content"},
        },
        package="pro",
    )
    async def _notion_add(database_id: str, title: str, content: str = ""):
        import urllib.request, json
        from pathlib import Path
        cfg   = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        token = cfg.get("notion_token", "")
        if not token:
            return {"error": "notion_token not set in config/settings.json"}
        payload = {
            "parent": {"database_id": database_id},
            "properties": {"Name": {"title": [{"text": {"content": title}}]}},
            "children": [{"object": "block", "type": "paragraph",
                          "paragraph": {"rich_text": [{"type": "text", "text": {"content": content}}]}}] if content else []
        }
        req = urllib.request.Request("https://api.notion.com/v1/pages",
                                     data=json.dumps(payload).encode(),
                                     headers={"Authorization": f"Bearer {token}",
                                              "Notion-Version": "2022-06-28",
                                              "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                resp = json.loads(r.read())
            return {"ok": True, "id": resp["id"], "url": resp.get("url", "")}
        except Exception as e:
            return {"error": str(e)}

    # ── Obsidian ──────────────────────────────────────────────────────────────
    @register(
        name="search_obsidian",
        description="Search notes in your Obsidian vault.",
        params={
            "query": {"type": "string", "description": "Search term", "required": True},
            "limit": {"type": "integer","description": "Max results (default 10)"},
        },
        package="pro",
    )
    async def _obsidian_search(query: str, limit: int = 10):
        import json
        from pathlib import Path
        cfg       = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        vault_path = Path(cfg.get("obsidian_vault", ""))
        if not vault_path.exists():
            return {"error": "obsidian_vault not set in config/settings.json"}
        results = []
        q_lower = query.lower()
        for md in sorted(vault_path.rglob("*.md"), key=lambda f: f.stat().st_mtime, reverse=True):
            try:
                text = md.read_text(encoding="utf-8", errors="ignore")
                if q_lower in text.lower() or q_lower in md.stem.lower():
                    results.append({
                        "file":    str(md.relative_to(vault_path)),
                        "title":   md.stem,
                        "preview": text[:200],
                    })
                    if len(results) >= limit:
                        break
            except Exception:
                continue
        return {"ok": True, "query": query, "results": results, "vault": str(vault_path)}

    @register(
        name="add_obsidian_note",
        description="Create a new note in your Obsidian vault.",
        params={
            "title":   {"type": "string", "description": "Note title", "required": True},
            "content": {"type": "string", "description": "Note content (markdown)"},
            "folder":  {"type": "string", "description": "Subfolder inside vault (optional)"},
            "tags":    {"type": "string", "description": "Comma-separated tags"},
        },
        package="pro",
    )
    async def _obsidian_add(title: str, content: str = "", folder: str = "", tags: str = ""):
        import json, re
        from pathlib import Path
        from datetime import datetime
        cfg        = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        vault_path = Path(cfg.get("obsidian_vault", ""))
        if not vault_path.exists():
            return {"error": "obsidian_vault not configured"}
        dest = vault_path / folder if folder else vault_path
        dest.mkdir(parents=True, exist_ok=True)
        tag_block = "\ntags: [" + ", ".join(t.strip() for t in tags.split(",")) + "]" if tags else ""
        body = f"---\ncreated: {datetime.now().strftime('%Y-%m-%d %H:%M')}{tag_block}\n---\n\n# {title}\n\n{content}"
        fname = dest / (re.sub(r"[^\w\- ]", "", title).strip() + ".md")
        fname.write_text(body, encoding="utf-8")
        return {"ok": True, "file": str(fname), "title": title}

    # ── Trello ────────────────────────────────────────────────────────────────
    @register(
        name="list_trello_boards",
        description="List Trello boards and their cards.",
        params={
            "board_id": {"type": "string", "description": "Board ID (optional, lists all if omitted)"},
        },
        package="pro",
    )
    async def _trello_boards(board_id: str = ""):
        import urllib.request, urllib.parse, json
        from pathlib import Path
        cfg   = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        key   = cfg.get("trello_api_key", "")
        token = cfg.get("trello_token", "")
        if not key or not token:
            return {"error": "trello_api_key / trello_token not set in config/settings.json"}
        auth = f"key={key}&token={token}"
        try:
            if not board_id:
                url = f"https://api.trello.com/1/members/me/boards?{auth}&fields=name,url,shortName"
                with urllib.request.urlopen(url, timeout=10) as r:
                    boards = json.loads(r.read())
                return {"ok": True, "boards": [{"id": b["id"], "name": b["name"], "url": b["url"]} for b in boards]}
            else:
                url = f"https://api.trello.com/1/boards/{board_id}/cards?{auth}&fields=name,desc,due,idList"
                with urllib.request.urlopen(url, timeout=10) as r:
                    cards = json.loads(r.read())
                return {"ok": True, "cards": [{"id": c["id"], "name": c["name"], "due": c.get("due")} for c in cards]}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="add_trello_card",
        description="Add a card to a Trello list.",
        params={
            "list_id": {"type": "string", "description": "Trello list ID", "required": True},
            "name":    {"type": "string", "description": "Card title",      "required": True},
            "desc":    {"type": "string", "description": "Card description"},
            "due":     {"type": "string", "description": "Due date ISO (optional)"},
        },
        package="pro",
    )
    async def _trello_add_card(list_id: str, name: str, desc: str = "", due: str = ""):
        import urllib.request, urllib.parse, json
        from pathlib import Path
        cfg   = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        key   = cfg.get("trello_api_key", "")
        token = cfg.get("trello_token", "")
        if not key or not token:
            return {"error": "trello_api_key / trello_token not set"}
        params = {"idList": list_id, "name": name, "desc": desc, "key": key, "token": token}
        if due:
            params["due"] = due
        data = urllib.parse.urlencode(params).encode()
        req  = urllib.request.Request("https://api.trello.com/1/cards", data=data)
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                card = json.loads(r.read())
            return {"ok": True, "id": card["id"], "name": card["name"], "url": card.get("url", "")}
        except Exception as e:
            return {"error": str(e)}

    # ── Stocks ────────────────────────────────────────────────────────────────
    @register(
        name="get_stock_price",
        description=(
            "Get live stock price and basic info. "
            "Use for: 'AAPL stock', 'Tesla share price', 'how is NVDA doing'."
        ),
        params={
            "symbol": {"type": "string", "description": "Stock ticker (e.g. AAPL, TSLA)", "required": True},
        },
        package="pro",
    )
    async def _stock(symbol: str):
        import urllib.request, json
        symbol = symbol.upper().strip()
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            meta = data["chart"]["result"][0]["meta"]
            return {
                "symbol":         meta["symbol"],
                "name":           meta.get("longName", symbol),
                "price":          meta["regularMarketPrice"],
                "currency":       meta["currency"],
                "change":         round(meta["regularMarketPrice"] - meta["chartPreviousClose"], 2),
                "change_pct":     round((meta["regularMarketPrice"] - meta["chartPreviousClose"]) / meta["chartPreviousClose"] * 100, 2),
                "previous_close": meta["chartPreviousClose"],
                "market_state":   meta.get("marketState", ""),
            }
        except Exception as e:
            return {"error": str(e), "symbol": symbol}

    # ── Content Creator ───────────────────────────────────────────────────────
    @register(
        name="generate_content",
        description=(
            "Generate marketing or creative content. "
            "Use for: 'write a blog post about X', 'Instagram caption', 'ad copy', 'tweet ideas'."
        ),
        params={
            "topic":   {"type": "string", "description": "Topic or subject",    "required": True},
            "format":  {"type": "string", "description": "blog | caption | tweet | ad | email | thread (default: blog)"},
            "tone":    {"type": "string", "description": "professional | casual | funny | inspiring (default: professional)"},
            "length":  {"type": "string", "description": "short | medium | long (default: medium)"},
            "keywords":{"type": "string", "description": "SEO keywords to include (comma-separated)"},
        },
        package="pro",
    )
    async def _content(topic: str, format: str = "blog", tone: str = "professional",
                       length: str = "medium", keywords: str = ""):
        kw_note = f"\nInclude these keywords naturally: {keywords}" if keywords else ""
        lengths = {"short": "~150 words", "medium": "~350 words", "long": "~700 words"}
        prompt = (f"Write a {format} about: {topic}\n"
                  f"Tone: {tone}\nLength: {lengths.get(length, '~350 words')}{kw_note}\n"
                  f"Be engaging, avoid clichés.")
        return {
            "format": format, "topic": topic, "tone": tone, "length": length,
            "prompt": prompt,
            "instruction": "Use this prompt to generate content via the LLM."
        }

    # ── Lesson Planner ────────────────────────────────────────────────────────
    @register(
        name="create_lesson",
        description=(
            "Create a structured lesson plan or explanation. "
            "Use for: 'teach me X', 'create a lesson on Y', 'explain Z step by step', 'quiz me'."
        ),
        params={
            "subject":    {"type": "string", "description": "Topic to teach",      "required": True},
            "level":      {"type": "string", "description": "beginner | intermediate | advanced (default: beginner)"},
            "format":     {"type": "string", "description": "lesson | quiz | flashcards | summary (default: lesson)"},
            "duration":   {"type": "string", "description": "Target duration e.g. '15 min' (optional)"},
        },
        package="pro",
    )
    async def _lesson(subject: str, level: str = "beginner", format: str = "lesson",
                      duration: str = ""):
        dur_note = f" Designed for: {duration}." if duration else ""
        formats = {
            "lesson":     f"Create a structured lesson plan on: {subject}. Level: {level}.{dur_note}\nInclude: objectives, explanation, examples, key takeaways.",
            "quiz":       f"Create a 10-question quiz on: {subject}. Level: {level}.\nInclude answers.",
            "flashcards": f"Create 15 flashcard pairs (question / answer) on: {subject}. Level: {level}.",
            "summary":    f"Write a concise {level}-level summary of: {subject}.{dur_note}",
        }
        return {
            "subject": subject, "level": level, "format": format,
            "prompt": formats.get(format, formats["lesson"]),
            "instruction": "Use this prompt with the LLM to generate the content."
        }

    # ── Projects ──────────────────────────────────────────────────────────────
    @register(
        name="list_projects",
        description="List all projects tracked by OZY2.",
        params={},
        package="pro",
    )
    async def _list_projects():
        import json
        from pathlib import Path
        pfile = Path(__file__).parent.parent / "data" / "projects.json"
        if not pfile.exists():
            return {"projects": [], "hint": "No projects yet. Use add_project to create one."}
        return {"ok": True, "projects": json.loads(pfile.read_text())}

    @register(
        name="add_project",
        description="Add a new project to OZY2 project tracker.",
        params={
            "name":        {"type": "string", "description": "Project name",    "required": True},
            "description": {"type": "string", "description": "Short description"},
            "status":      {"type": "string", "description": "active | paused | done (default: active)"},
        },
        package="pro",
    )
    async def _add_project(name: str, description: str = "", status: str = "active"):
        import json
        from pathlib import Path
        from datetime import datetime
        pfile = Path(__file__).parent.parent / "data" / "projects.json"
        pfile.parent.mkdir(exist_ok=True)
        projects = json.loads(pfile.read_text()) if pfile.exists() else []
        project  = {"id": len(projects) + 1, "name": name, "description": description,
                    "status": status, "created": datetime.now().isoformat()}
        projects.append(project)
        pfile.write_text(json.dumps(projects, indent=2))
        return {"ok": True, "project": project}

    # ── Daily Briefing ────────────────────────────────────────────────────────
    @register(
        name="daily_briefing",
        description=(
            "Generate a personalised morning briefing. "
            "Use for: 'good morning', 'briefing', 'what's on today', 'morning summary'."
        ),
        params={
            "city":  {"type": "string", "description": "City for weather (default: Istanbul)"},
            "topics":{"type": "string", "description": "News topics to include e.g. 'tech, finance'"},
        },
        package="pro",
    )
    async def _briefing(city: str = "Istanbul", topics: str = ""):
        from datetime import datetime
        from core import tools
        parts  = []
        now    = datetime.now()
        parts.append(f"📅 **{now.strftime('%A, %d %B %Y — %H:%M')}**\n")

        # Weather
        wx = await tools.dispatch("get_weather", {"city": city})
        if "error" not in wx:
            parts.append(f"🌤️ **Weather — {wx.get('city', city)}:** "
                         f"{wx.get('temp')}°C, {wx.get('condition')} | "
                         f"Wind {wx.get('wind_kmh')} km/h | "
                         f"Humidity {wx.get('humidity')}%")

        # Calendar
        try:
            cal = await tools.dispatch("get_today_events", {})
            events = cal if isinstance(cal, list) else cal.get("events", [])
            if events:
                parts.append(f"\n📅 **Today's calendar ({len(events)} events):**")
                for ev in events[:5]:
                    t = ev.get("start", {}).get("dateTime", ev.get("start", {}).get("date", ""))
                    parts.append(f"  • {t[-8:-3] if 'T' in t else t} — {ev.get('summary', '')}")
        except Exception:
            pass

        # Tasks
        tasks = await tools.dispatch("list_tasks", {"status": "todo"})
        if isinstance(tasks, list) and tasks:
            parts.append(f"\n✅ **Pending tasks ({len(tasks)}):**")
            for t in tasks[:5]:
                parts.append(f"  • {t.get('title', '')}")

        # News
        news_q = topics or "top news"
        nx = await tools.dispatch("get_news", {"topic": news_q, "limit": 5})
        if "articles" in nx:
            parts.append(f"\n📰 **Headlines ({news_q}):**")
            for a in nx["articles"][:5]:
                parts.append(f"  • {a['title']} — {a.get('source', '')}")

        return {"briefing": "\n".join(parts), "generated_at": now.isoformat()}
