# -*- mode: python ; coding: utf-8 -*-
"""
OZY2 — PyInstaller spec file
Produces a single-folder bundle (onedir) for all platforms.
Run:  pyinstaller packaging/OZY2.spec --clean
"""
import sys
from pathlib import Path

ROOT = Path(SPECPATH).parent   # repo root

block_cipher = None

a = Analysis(
    [str(ROOT / "launcher.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        # ── UI assets (templates + static) ────────────────────────────────
        (str(ROOT / "ui" / "templates"),  "ui/templates"),
        (str(ROOT / "ui" / "static"),     "ui/static"),
        (str(ROOT / "ui" / "i18n"),       "ui/i18n"),
        # ── Config skeleton (no secrets — only structure) ──────────────────
        (str(ROOT / "config" / "packages.json"), "config"),
    ],
    hiddenimports=[
        # FastAPI / Starlette / Uvicorn
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "starlette",
        "starlette.routing",
        "starlette.staticfiles",
        "starlette.templating",
        "fastapi",
        "fastapi.staticfiles",
        "fastapi.templating",
        "jinja2",
        "aiofiles",
        # API routers
        "api.app",
        "api.state",
        "api.routers.auth_router",
        "api.routers.chat",
        "api.routers.settings",
        "api.routers.i18n",
        "api.routers.gmail",
        "api.routers.calendar_router",
        "api.routers.drive_router",
        "api.routers.tasks_router",
        "api.routers.memory_router",
        "api.routers.telegram_router",
        "api.routers.briefing_router",
        "api.routers.setup_router",
        "api.routers.notes_router",
        "api.routers.reminders_router",
        "api.routers.books_router",
        "api.routers.health_router",
        "api.routers.tts_router",
        "api.routers.roles_router",
        "api.routers.marketplace_router",
        "api.routers.packages_router",
        "api.routers.github_router",
        "api.routers.nutrition_router",
        "api.routers.baby_router",
        "api.routers.smarthome_router",
        "api.routers.women_router",
        "api.routers.daily_router",
        "api.routers.automations_router",
        "api.routers.plans_router",
        "api.routers.profile_router",
        # Core
        "core.llm",
        "core.memory",
        "core.tools",
        "core.agent",
        "core.scheduler",
        # Integrations
        "integrations.gmail",
        "integrations.calendar_google",
        "integrations.drive",
        "integrations.telegram",
        "integrations.tasks_db",
        # Skills
        "skills.tools_register",
        "skills.you_skills",
        # cryptography — Fernet encrypted leads file
        "cryptography",
        "cryptography.fernet",
        "cryptography.hazmat.primitives",
        "cryptography.hazmat.backends",
        # httpx — smart home webhooks
        "httpx",
        # AI providers
        "google.genai",
        "openai",
        "anthropic",
        # Tray — platform backends
        "pystray",
        "pystray._base",
        "pystray._darwin",     # macOS backend
        "pystray._win32",      # Windows backend
        "pystray._xorg",       # Linux X11 backend
        "PIL",
        "PIL.Image",
        "PIL.ImageDraw",
        "PIL.ImageFont",
        # macOS / PyObjC (required by pystray on Darwin)
        "objc",
        "AppKit",
        "Foundation",
        "Cocoa",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "matplotlib", "numpy", "pandas", "scipy", "tkinter",
        "PyQt5", "PyQt6", "wx", "gtk",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="OZY2",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,           # No terminal window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=(
        str(ROOT / "ui" / "static" / "icons" / "icon.icns")
        if sys.platform == "darwin" and (ROOT / "ui" / "static" / "icons" / "icon.icns").exists()
        else str(ROOT / "ui" / "static" / "icons" / "icon.ico")
        if sys.platform == "win32" and (ROOT / "ui" / "static" / "icons" / "icon.ico").exists()
        else None
    ),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="OZY2",
)

# macOS: wrap as .app bundle
if sys.platform == "darwin":
    _icns = ROOT / "ui" / "static" / "icons" / "icon.icns"
    app = BUNDLE(
        coll,
        name="OZY2.app",
        icon=str(_icns) if _icns.exists() else None,
        bundle_identifier="com.ozy2.app",
        info_plist={
            "CFBundleName":               "OZY2",
            "CFBundleDisplayName":        "OZY2",
            "CFBundleVersion":            "2.2.0",
            "CFBundleShortVersionString": "2.2.0",
            "CFBundleIdentifier":         "com.ozy2.app",
            "LSMinimumSystemVersion":     "12.0",
            "NSHighResolutionCapable":    True,
            "LSUIElement":                True,   # Menu-bar / tray app (no Dock icon)
            "NSHumanReadableCopyright":   "© 2026 OZY2. All rights reserved.",
        },
    )
