# -*- mode: python ; coding: utf-8 -*-
"""
OZY2 — PyInstaller Spec
Bundles the FastAPI app + UI + skills into a single executable.

Usage:
  cd /path/to/Ozy2
  pyinstaller build/ozy2.spec
"""

import sys
from pathlib import Path

ROOT = Path(SPEC).parent.parent   # Ozy2/

block_cipher = None

a = Analysis(
    [str(ROOT / "launcher.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        # UI assets
        (str(ROOT / "ui" / "templates"),  "ui/templates"),
        (str(ROOT / "ui" / "static"),     "ui/static"),
        (str(ROOT / "ui" / "i18n"),       "ui/i18n"),
        # Config defaults (no user data)
        (str(ROOT / "config" / "packages.json"), "config"),
        # Skills
        (str(ROOT / "skills"),            "skills"),
    ],
    hiddenimports=[
        # FastAPI / Uvicorn
        "uvicorn", "uvicorn.logging", "uvicorn.loops", "uvicorn.loops.auto",
        "uvicorn.protocols", "uvicorn.protocols.http", "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets", "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan", "uvicorn.lifespan.on",
        "fastapi", "fastapi.responses", "fastapi.staticfiles",
        "fastapi.templating", "fastapi.middleware.cors",
        "jinja2", "aiofiles", "python_multipart",
        "starlette", "starlette.routing", "starlette.staticfiles",
        # OZY2 modules
        "api.app", "api.state",
        "api.routers.chat",  "api.routers.i18n",     "api.routers.settings",
        "api.routers.setup_router",
        "api.routers.gmail", "api.routers.calendar_router",
        "api.routers.drive_router",   "api.routers.tasks_router",
        "api.routers.memory_router",  "api.routers.telegram_router",
        "api.routers.briefing_router",
        "core.agent", "core.llm", "core.memory", "core.tools", "core.scheduler",
        "integrations.gmail", "integrations.calendar_google",
        "integrations.drive", "integrations.tasks_db", "integrations.telegram",
        "skills.tools_register",
        "skills.you_skills", "skills.pro_skills", "skills.social_skills",
        # LLM providers
        "google.genai", "openai", "anthropic", "ollama",
        # Skill deps
        "duckduckgo_search", "ddgs",
        "docx", "openpyxl",
        "requests", "httpx",
        # Tray icon (optional)
        "pystray", "PIL",
        # Google OAuth
        "google.oauth2", "google_auth_oauthlib", "googleapiclient",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["pytest", "IPython", "notebook", "matplotlib", "numpy", "pandas",
              "tkinter", "PySide6", "PyQt5", "wx"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,
    name="OZY2",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,            # no terminal window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(ROOT / "ui" / "static" / "icons" / "icon.icns"),
)

coll = COLLECT(
    exe, a.binaries, a.zipfiles, a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="OZY2",
)

# ── macOS .app bundle ──────────────────────────────────────────────────────────
app = BUNDLE(
    coll,
    name="OZY2.app",
    icon=str(ROOT / "ui" / "static" / "icons" / "icon.icns"),
    bundle_identifier="com.ozy2.app",
    info_plist={
        "NSPrincipalClass":              "NSApplication",
        "NSAppleScriptEnabled":           False,
        "NSHighResolutionCapable":        True,
        "LSMinimumSystemVersion":        "12.0",
        "CFBundleShortVersionString":    "2.0.0",
        "CFBundleVersion":               "2.0.0",
        "NSHumanReadableCopyright":      "© 2026 OZY2",
        "NSMicrophoneUsageDescription":  "OZY2 needs mic access for voice input.",
        "NSAppleEventsUsageDescription": "OZY2 uses AppleScript for Notes & Reminders.",
        "LSUIElement":                   False,   # show in Dock
    },
)
