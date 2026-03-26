"""
OZY2 — YOU Tier Skills
Package: you

Includes: weather, web_search, news, currency, summarize,
          word_docx, excel_xlsx, notes, reminders
"""
from core.tools import register


def register_all():

    # ── Weather ───────────────────────────────────────────────────────────────
    @register(
        name="get_weather",
        description=(
            "Get current weather or forecast for any city. "
            "Use for: 'weather', 'is it raining', 'forecast this week'."
        ),
        params={
            "city":     {"type": "string",  "description": "City name (default: Istanbul)"},
            "forecast": {"type": "boolean", "description": "True for multi-day forecast"},
            "days":     {"type": "integer", "description": "Days ahead 1-7 (default 3)"},
        },
        package="you",
    )
    async def _weather(city: str = "Istanbul", forecast: bool = False, days: int = 3):
        import urllib.request, json
        # Geocode
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(city)}&count=1&language=en"
        import urllib.parse
        with urllib.request.urlopen(geo_url, timeout=8) as r:
            geo = json.loads(r.read())
        results = geo.get("results")
        if not results:
            return {"error": f"City '{city}' not found"}
        lat, lon = results[0]["latitude"], results[0]["longitude"]
        name     = results[0].get("name", city)

        WMO = {
            0: "Clear sky ☀️", 1: "Mainly clear 🌤️", 2: "Partly cloudy ⛅", 3: "Overcast ☁️",
            45: "Foggy 🌫️", 51: "Light drizzle 🌦️", 61: "Light rain 🌧️", 63: "Rain 🌧️",
            65: "Heavy rain 🌧️", 71: "Light snow 🌨️", 73: "Snow ❄️", 80: "Showers 🌦️",
            95: "Thunderstorm ⛈️", 99: "Heavy thunderstorm ⛈️",
        }

        if not forecast:
            url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                   "&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m"
                   "&timezone=auto")
            with urllib.request.urlopen(url, timeout=8) as r:
                data = json.loads(r.read())
            cur = data["current"]
            code = cur["weathercode"]
            return {
                "city": name, "temp": cur["temperature_2m"], "unit": "°C",
                "condition": WMO.get(code, f"Code {code}"),
                "wind_kmh": cur["windspeed_10m"],
                "humidity": cur["relative_humidity_2m"],
            }
        else:
            days = max(1, min(days, 7))
            url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                   f"&daily=temperature_2m_max,temperature_2m_min,weathercode"
                   f"&timezone=auto&forecast_days={days}")
            with urllib.request.urlopen(url, timeout=8) as r:
                data = json.loads(r.read())
            d = data["daily"]
            return {
                "city": name,
                "forecast": [
                    {"date": d["time"][i],
                     "max": d["temperature_2m_max"][i],
                     "min": d["temperature_2m_min"][i],
                     "condition": WMO.get(d["weathercode"][i], "")}
                    for i in range(len(d["time"]))
                ]
            }

    # ── Web Search ────────────────────────────────────────────────────────────
    @register(
        name="web_search",
        description=(
            "Search the web. Use for current events, research, facts, "
            "anything that needs up-to-date information."
        ),
        params={
            "query":       {"type": "string",  "description": "Search query", "required": True},
            "max_results": {"type": "integer", "description": "Number of results (default 8)"},
            "news_only":   {"type": "boolean", "description": "Search news only"},
        },
        package="you",
    )
    async def _web_search(query: str, max_results: int = 8, news_only: bool = False):
        try:
            try:
                from ddgs import DDGS
            except ImportError:
                from duckduckgo_search import DDGS
            results = []
            with DDGS() as ddgs:
                fn = ddgs.news if news_only else ddgs.text
                for r in fn(query, max_results=max_results):
                    results.append({
                        "title":   r.get("title", ""),
                        "url":     r.get("href") or r.get("url", ""),
                        "snippet": r.get("body") or r.get("excerpt", ""),
                    })
            return {"ok": True, "query": query, "results": results}
        except Exception as e:
            return {"error": str(e), "query": query}

    # ── News ──────────────────────────────────────────────────────────────────
    @register(
        name="get_news",
        description=(
            "Get latest news headlines. Use for: 'news today', 'tech news', "
            "'sports headlines', 'what happened in X'."
        ),
        params={
            "topic":  {"type": "string",  "description": "Topic or keyword (optional, e.g. 'technology')"},
            "limit":  {"type": "integer", "description": "Number of articles (default 10)"},
        },
        package="you",
    )
    async def _news(topic: str = "", limit: int = 10):
        try:
            try:
                from ddgs import DDGS
            except ImportError:
                from duckduckgo_search import DDGS
            q = f"{topic} news" if topic else "top news today"
            results = []
            with DDGS() as ddgs:
                for r in ddgs.news(q, max_results=limit):
                    results.append({
                        "title":  r.get("title", ""),
                        "source": r.get("source", ""),
                        "date":   r.get("date", ""),
                        "url":    r.get("url", ""),
                        "body":   r.get("body", ""),
                    })
            return {"ok": True, "topic": topic or "general", "articles": results}
        except Exception as e:
            return {"error": str(e)}

    # ── Currency ──────────────────────────────────────────────────────────────
    @register(
        name="convert_currency",
        description=(
            "Convert between currencies or get live exchange rates. "
            "Use for: 'USD to EUR', '100 dollars in yen', 'exchange rate'."
        ),
        params={
            "from_currency": {"type": "string", "description": "Source currency code (e.g. USD)", "required": True},
            "to_currency":   {"type": "string", "description": "Target currency code (e.g. EUR)", "required": True},
            "amount":        {"type": "number", "description": "Amount to convert (default 1)"},
        },
        package="you",
    )
    async def _currency(from_currency: str, to_currency: str, amount: float = 1.0):
        import urllib.request, json
        base = from_currency.upper()
        target = to_currency.upper()
        url = f"https://open.er-api.com/v6/latest/{base}"
        try:
            with urllib.request.urlopen(url, timeout=8) as r:
                data = json.loads(r.read())
            if data.get("result") != "success":
                return {"error": f"Invalid currency: {base}"}
            rate = data["rates"].get(target)
            if rate is None:
                return {"error": f"Unknown currency: {target}"}
            return {
                "from": base, "to": target,
                "rate": rate,
                "amount": amount,
                "converted": round(amount * rate, 4),
                "updated": data.get("time_last_update_utc", ""),
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Summarize ─────────────────────────────────────────────────────────────
    @register(
        name="summarize_text",
        description=(
            "Summarize long text or a webpage URL. "
            "Use for: 'summarize this', 'TL;DR', 'what does this article say', 'short version'."
        ),
        params={
            "text":   {"type": "string", "description": "Text content to summarize"},
            "url":    {"type": "string", "description": "URL to fetch and summarize (optional)"},
            "length": {"type": "string", "description": "short | medium | long (default medium)"},
        },
        package="you",
    )
    async def _summarize(text: str = "", url: str = "", length: str = "medium"):
        import urllib.request
        if url and not text:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as r:
                    raw = r.read().decode("utf-8", errors="ignore")
                # Strip HTML tags roughly
                import re
                text = re.sub(r"<[^>]+>", " ", raw)
                text = re.sub(r"\s+", " ", text).strip()[:6000]
            except Exception as e:
                return {"error": f"Could not fetch URL: {e}"}
        if not text:
            return {"error": "Provide text or url parameter"}

        word_limits = {"short": 80, "medium": 150, "long": 280}
        limit = word_limits.get(length, 150)
        return {
            "source": url or "text",
            "length": length,
            "word_limit": limit,
            "text_preview": text[:200],
            "instruction": f"Please summarize the following text in ~{limit} words:\n\n{text[:4000]}",
        }

    # ── Word / DOCX ───────────────────────────────────────────────────────────
    @register(
        name="create_document",
        description=(
            "Create a Word (.docx) document. "
            "Use for: 'write a report', 'create a letter', 'make a Word file', 'draft a contract'."
        ),
        params={
            "title":    {"type": "string", "description": "Document title", "required": True},
            "content":  {"type": "string", "description": "Document body (markdown or plain text)"},
            "filename": {"type": "string", "description": "Output filename without extension"},
        },
        package="you",
    )
    async def _create_doc(title: str, content: str = "", filename: str = ""):
        try:
            from docx import Document
            from docx.shared import Pt
            import re, os
            from pathlib import Path

            doc = Document()
            doc.add_heading(title, 0)
            for line in content.split("\n"):
                line = line.strip()
                if not line:
                    continue
                if line.startswith("## "):
                    doc.add_heading(line[3:], level=2)
                elif line.startswith("# "):
                    doc.add_heading(line[2:], level=1)
                elif line.startswith("- ") or line.startswith("* "):
                    doc.add_paragraph(line[2:], style="List Bullet")
                else:
                    doc.add_paragraph(line)

            fname = (filename or re.sub(r"[^\w\-]", "_", title)).rstrip("_") + ".docx"
            out_dir = Path.home() / "Downloads"
            out_dir.mkdir(exist_ok=True)
            path = str(out_dir / fname)
            doc.save(path)
            return {"ok": True, "file": path, "title": title}
        except ImportError:
            return {"error": "python-docx not installed. Run: pip install python-docx"}
        except Exception as e:
            return {"error": str(e)}

    # ── Excel / XLSX ──────────────────────────────────────────────────────────
    @register(
        name="create_spreadsheet",
        description=(
            "Create an Excel (.xlsx) spreadsheet. "
            "Use for: 'make a spreadsheet', 'export to Excel', 'create a table in xlsx'."
        ),
        params={
            "title":    {"type": "string", "description": "Sheet title / filename"},
            "headers":  {"type": "string", "description": "Comma-separated column headers"},
            "rows":     {"type": "string", "description": "JSON array of row arrays"},
            "filename": {"type": "string", "description": "Output filename without extension"},
        },
        package="you",
    )
    async def _create_xlsx(title: str = "Sheet1", headers: str = "",
                           rows: str = "[]", filename: str = ""):
        try:
            import openpyxl, json
            from pathlib import Path
            from openpyxl.styles import Font, PatternFill, Alignment
            import re

            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = title[:31]

            header_list = [h.strip() for h in headers.split(",") if h.strip()] if headers else []
            if header_list:
                ws.append(header_list)
                for cell in ws[1]:
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill("solid", fgColor="4f8ef7")
                    cell.alignment = Alignment(horizontal="center")

            row_data = json.loads(rows) if rows != "[]" else []
            for row in row_data:
                ws.append(row if isinstance(row, list) else list(row.values()))

            fname = (filename or re.sub(r"[^\w\-]", "_", title)).rstrip("_") + ".xlsx"
            out_dir = Path.home() / "Downloads"
            out_dir.mkdir(exist_ok=True)
            path = str(out_dir / fname)
            wb.save(path)
            return {"ok": True, "file": path, "rows": len(row_data), "columns": len(header_list)}
        except ImportError:
            return {"error": "openpyxl not installed. Run: pip install openpyxl"}
        except Exception as e:
            return {"error": str(e)}

    # ── Notes (Apple Notes / local) ───────────────────────────────────────────
    @register(
        name="add_note",
        description=(
            "Add a note. On macOS uses Apple Notes; otherwise saves locally. "
            "Use for: 'take a note', 'remember this idea', 'note that...'."
        ),
        params={
            "title":   {"type": "string", "description": "Note title"},
            "content": {"type": "string", "description": "Note content", "required": True},
            "folder":  {"type": "string", "description": "Folder / notebook name (default: OZY2)"},
        },
        package="you",
    )
    async def _add_note(content: str, title: str = "OZY Note", folder: str = "OZY2"):
        import sys, subprocess, json
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        if sys.platform == "darwin":
            script = f'''
tell application "Notes"
    tell account "iCloud"
        if not (exists folder "{folder}") then
            make new folder with properties {{name:"{folder}"}}
        end if
        make new note at folder "{folder}" with properties {{name:"{title}", body:"{content}"}}
    end tell
end tell
'''
            try:
                subprocess.run(["osascript", "-e", script], timeout=10, check=True,
                               capture_output=True)
                return {"ok": True, "platform": "Apple Notes", "folder": folder, "title": title}
            except Exception:
                pass
        # Fallback: local file
        from pathlib import Path
        notes_dir = Path.home() / ".ozy2" / "notes"
        notes_dir.mkdir(parents=True, exist_ok=True)
        fname = notes_dir / f"{timestamp.replace(':', '-')}_{title[:30]}.txt"
        fname.write_text(f"# {title}\n{timestamp}\n\n{content}")
        return {"ok": True, "platform": "local", "file": str(fname)}

    @register(
        name="list_notes",
        description="List recent notes.",
        params={"limit": {"type": "integer", "description": "Max notes to return (default 10)"}},
        package="you",
    )
    async def _list_notes(limit: int = 10):
        import sys, subprocess
        from pathlib import Path
        if sys.platform == "darwin":
            script = f'''
tell application "Notes"
    set noteList to ""
    repeat with n in (first {limit} notes)
        set noteList to noteList & name of n & "\\n"
    end repeat
    return noteList
end tell
'''
            try:
                r = subprocess.run(["osascript", "-e", script], capture_output=True,
                                   text=True, timeout=10)
                notes = [l for l in r.stdout.strip().split("\n") if l]
                return {"ok": True, "platform": "Apple Notes", "notes": notes}
            except Exception:
                pass
        notes_dir = Path.home() / ".ozy2" / "notes"
        if notes_dir.exists():
            files = sorted(notes_dir.glob("*.txt"), reverse=True)[:limit]
            return {"ok": True, "platform": "local",
                    "notes": [f.stem for f in files]}
        return {"notes": []}

    # ── Reminders ─────────────────────────────────────────────────────────────
    @register(
        name="add_reminder",
        description=(
            "Set a reminder. On macOS uses Apple Reminders. "
            "Use for: 'remind me to...', 'set a reminder', 'don't let me forget'."
        ),
        params={
            "title":    {"type": "string", "description": "Reminder title", "required": True},
            "due_date": {"type": "string", "description": "Due date/time ISO or natural language"},
            "notes":    {"type": "string", "description": "Optional notes"},
            "list":     {"type": "string", "description": "Reminders list name (default: OZY2)"},
        },
        package="you",
    )
    async def _add_reminder(title: str, due_date: str = "", notes: str = "", list: str = "OZY2"):
        import sys, subprocess
        if sys.platform == "darwin":
            due_part = f', due date:date "{due_date}"' if due_date else ""
            note_part = f', body:"{notes}"' if notes else ""
            script = f'''
tell application "Reminders"
    if not (exists list "{list}") then
        make new list with properties {{name:"{list}"}}
    end if
    make new reminder at list "{list}" with properties {{name:"{title}"{due_part}{note_part}}}
end tell
'''
            try:
                subprocess.run(["osascript", "-e", script], timeout=10, check=True,
                               capture_output=True)
                return {"ok": True, "platform": "Apple Reminders", "title": title, "due": due_date}
            except Exception as e:
                return {"error": str(e)}
        return {"ok": False, "error": "Apple Reminders only supported on macOS"}

    @register(
        name="list_reminders",
        description="List upcoming reminders.",
        params={"list": {"type": "string", "description": "List name (default: all)"}},
        package="you",
    )
    async def _list_reminders(list: str = ""):
        import sys, subprocess
        if sys.platform == "darwin":
            list_filter = f'list "{list}"' if list else "every list"
            script = f'''
tell application "Reminders"
    set reminderList to ""
    repeat with r in (reminders of {list_filter} whose completed is false)
        set reminderList to reminderList & name of r & "\\n"
    end repeat
    return reminderList
end tell
'''
            try:
                r = subprocess.run(["osascript", "-e", script], capture_output=True,
                                   text=True, timeout=10)
                items = [l for l in r.stdout.strip().split("\n") if l]
                return {"ok": True, "reminders": items}
            except Exception as e:
                return {"error": str(e)}
        return {"error": "Apple Reminders only supported on macOS"}
