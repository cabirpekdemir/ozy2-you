# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Pro tier integrations router."""
import json
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Pro"])

_CONFIG = Path(__file__).parent.parent.parent / "config" / "settings.json"


def _read_cfg() -> dict:
    if _CONFIG.exists():
        return json.loads(_CONFIG.read_text())
    return {}


# ---------------------------------------------------------------------------
# Notion
# ---------------------------------------------------------------------------

@router.get("/api/notion/search")
async def notion_search(q: str = "", limit: int = 10):
    cfg = _read_cfg()
    token = cfg.get("notion_token", "")
    if not token:
        return {"ok": False, "error": "notion_token not configured"}

    try:
        payload = json.dumps({"query": q, "page_size": limit}).encode()
        req = urllib.request.Request(
            "https://api.notion.com/v1/search",
            data=payload,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        results = []
        for item in data.get("results", []):
            obj_type = item.get("object", "")
            # Extract title depending on object type
            title = ""
            props = item.get("properties", {})
            # Pages store title in a "title" or "Name" property
            for _key, val in props.items():
                if isinstance(val, dict) and val.get("type") == "title":
                    title_parts = val.get("title", [])
                    title = "".join(t.get("plain_text", "") for t in title_parts)
                    break
            # Databases expose title at top level
            if not title:
                top_title = item.get("title", [])
                if isinstance(top_title, list):
                    title = "".join(t.get("plain_text", "") for t in top_title)
            url = item.get("url", "")
            results.append({"title": title, "url": url, "type": obj_type})

        return {"ok": True, "results": results}

    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Trello
# ---------------------------------------------------------------------------

@router.get("/api/trello/boards")
async def trello_boards():
    cfg = _read_cfg()
    key = cfg.get("trello_key", "")
    token = cfg.get("trello_token", "")
    if not key or not token:
        return {"ok": False, "error": "trello not configured"}

    try:
        params = urllib.parse.urlencode({
            "key": key,
            "token": token,
            "fields": "name,url,desc",
        })
        url = f"https://api.trello.com/1/members/me/boards?{params}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        boards = [
            {"id": b.get("id"), "name": b.get("name"), "url": b.get("url"), "desc": b.get("desc")}
            for b in data
        ]
        return {"ok": True, "boards": boards}

    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/api/trello/boards/{board_id}/cards")
async def trello_board_cards(board_id: str):
    cfg = _read_cfg()
    key = cfg.get("trello_key", "")
    token = cfg.get("trello_token", "")
    if not key or not token:
        return {"ok": False, "error": "trello not configured"}

    try:
        params = urllib.parse.urlencode({
            "key": key,
            "token": token,
            "fields": "name,desc,due,url",
        })
        url = f"https://api.trello.com/1/boards/{board_id}/cards?{params}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        cards = [
            {"id": c.get("id"), "name": c.get("name"), "due": c.get("due"), "url": c.get("url")}
            for c in data
        ]
        return {"ok": True, "cards": cards}

    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Stocks (Yahoo Finance — no key required)
# ---------------------------------------------------------------------------

@router.get("/api/stocks/quote")
async def stocks_quote(symbol: str = "AAPL"):
    try:
        symbol_upper = symbol.upper()
        url = (
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol_upper}"
            "?interval=1d&range=5d"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        result = data["chart"]["result"][0]
        meta = result["meta"]
        timestamps = result.get("timestamp", [])
        closes = result["indicators"]["quote"][0].get("close", [])

        current_price: float = meta.get("regularMarketPrice", 0.0)
        prev_close: float = meta.get("chartPreviousClose", meta.get("previousClose", current_price))
        change: float = round(current_price - prev_close, 4)
        change_pct: float = round((change / prev_close * 100) if prev_close else 0.0, 4)
        name: str = meta.get("shortName", meta.get("longName", symbol_upper))
        currency: str = meta.get("currency", "USD")

        history = []
        for ts, close in zip(timestamps, closes):
            if ts is not None and close is not None:
                from datetime import datetime, timezone
                date_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
                history.append({"date": date_str, "close": round(float(close), 4)})

        return {
            "ok": True,
            "symbol": symbol_upper,
            "price": round(float(current_price), 4),
            "change": change,
            "change_pct": change_pct,
            "name": name,
            "currency": currency,
            "history": history,
        }

    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Lesson generator
# ---------------------------------------------------------------------------

class LessonRequest(BaseModel):
    topic: str
    level: str = "intermediate"
    type: str = "notes"   # notes | quiz | flashcards


_LESSON_PROMPTS = {
    "notes": (
        "Create comprehensive study notes about '{topic}' for a {level} learner. "
        "Use clear headings, bullet points, and concise explanations. "
        "Cover key concepts, definitions, and examples."
    ),
    "quiz": (
        "Create a quiz about '{topic}' for a {level} learner. "
        "Write 8 multiple-choice questions, each with 4 options (A–D) and indicate the correct answer. "
        "Format each question as:\nQ: ...\nA) ...\nB) ...\nC) ...\nD) ...\nAnswer: X"
    ),
    "flashcards": (
        "Create 10 flashcards about '{topic}' for a {level} learner. "
        "Format each flashcard as:\nFRONT: [term or question]\nBACK: [definition or answer]\n---"
    ),
}


@router.post("/api/lesson/generate")
async def lesson_generate(body: LessonRequest):
    from api.state import get_agent

    lesson_type = body.type if body.type in _LESSON_PROMPTS else "notes"
    template = _LESSON_PROMPTS[lesson_type]
    prompt = template.format(topic=body.topic, level=body.level)

    try:
        agent = get_agent()
        content = await agent.llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system="You are an expert educator. Produce well-structured, accurate learning material.",
        )
        return {"ok": True, "content": content, "topic": body.topic, "type": lesson_type}

    except Exception as e:
        return {"ok": False, "error": str(e)}
