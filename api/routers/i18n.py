# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — i18n router. Serves translation JSON files."""
import json
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router   = APIRouter(tags=["i18n"])
I18N_DIR = Path(__file__).parent.parent.parent / "ui" / "i18n"
_cache: dict[str, dict] = {}


def load_lang(lang: str) -> dict:
    if lang not in _cache:
        f = I18N_DIR / f"{lang}.json"
        _cache[lang] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    return _cache[lang]


@router.get("/api/i18n/{lang}")
async def get_translations(lang: str):
    supported = [f.stem for f in I18N_DIR.glob("*.json")]
    if lang not in supported:
        return JSONResponse({"ok": False, "error": f"Unsupported language: {lang}"})
    return {"ok": True, "lang": lang, "t": load_lang(lang)}


@router.get("/api/i18n")
async def list_languages():
    langs = []
    meta  = {
        "en": {"name": "English",  "flag": "🇬🇧"},
        "de": {"name": "Deutsch",  "flag": "🇩🇪"},
        "es": {"name": "Español",  "flag": "🇪🇸"},
        "fr": {"name": "Français", "flag": "🇫🇷"},
        "tr": {"name": "Türkçe",   "flag": "🇹🇷"},
    }
    for f in sorted(I18N_DIR.glob("*.json")):
        code = f.stem
        langs.append({**meta.get(code, {"name": code, "flag": "🌐"}), "code": code})
    return {"ok": True, "languages": langs}
