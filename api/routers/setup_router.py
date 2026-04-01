# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — Setup Wizard Router
First-run onboarding: API key, plan, name
"""
import json
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

router    = APIRouter(tags=["Setup"])
TEMPLATES = Jinja2Templates(directory=str(Path(__file__).parent.parent.parent / "ui" / "templates"))
CONFIG    = Path(__file__).parent.parent.parent / "config" / "settings.json"


def _cfg() -> dict:
    if CONFIG.exists():
        return json.loads(CONFIG.read_text())
    return {}


def _save(data: dict):
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    existing = _cfg()
    existing.update(data)
    CONFIG.write_text(json.dumps(existing, indent=2))


@router.get("/setup", response_class=HTMLResponse)
async def wizard(request: Request):
    cfg = _cfg()
    # Already set up → redirect to home
    if cfg.get("api_key") and not cfg.get("_first_run", True):
        return RedirectResponse("/")
    return TEMPLATES.TemplateResponse(request, "setup.html")


@router.post("/api/setup/complete")
async def complete_setup(request: Request):
    data = await request.json()
    required = ["api_key", "provider", "package", "user_name"]
    if not all(data.get(k) for k in ["api_key", "provider", "package"]):
        return {"ok": False, "error": "api_key, provider and package are required"}
    _save({
        "api_key":    data.get("api_key", "").strip(),
        "provider":   data.get("provider", "gemini"),
        "model":      data.get("model", "gemini-2.5-flash"),
        "package":    data.get("package", "you"),
        "user_name":  data.get("user_name", "").strip(),
        "user_email": data.get("user_email", "").strip(),
        "theme":      data.get("theme", "dark"),
        "language":   data.get("language", "en"),
        "_first_run": False,
    })
    # Re-init agent with new config
    try:
        from api.state import reset_agent
        reset_agent()
    except Exception:
        pass
    return {"ok": True, "redirect": "/"}


@router.get("/api/setup/providers")
async def get_providers():
    return {
        "providers": [
            {
                "id":      "gemini",
                "label":   "Google Gemini",
                "icon":    "✦",
                "models":  ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"],
                "key_url": "https://aistudio.google.com/apikey",
                "key_hint": "Paste your Gemini API key from Google AI Studio",
                "free":    True,
            },
            {
                "id":      "openai",
                "label":   "OpenAI / ChatGPT",
                "icon":    "🤖",
                "models":  ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
                "key_url": "https://platform.openai.com/api-keys",
                "key_hint": "Paste your OpenAI API key",
                "free":    False,
            },
            {
                "id":      "anthropic",
                "label":   "Anthropic Claude",
                "icon":    "🔶",
                "models":  ["claude-3-5-sonnet-latest", "claude-3-haiku-20240307"],
                "key_url": "https://console.anthropic.com/settings/keys",
                "key_hint": "Paste your Anthropic API key",
                "free":    False,
            },
            {
                "id":      "ollama",
                "label":   "Ollama (Local / Free)",
                "icon":    "🦙",
                "models":  ["llama3.2", "mistral", "phi3", "gemma2"],
                "key_url": "https://ollama.com",
                "key_hint": "No API key needed — runs on your machine",
                "free":    True,
            },
        ]
    }
