# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — FastAPI Application"""
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Path setup
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware

from api.state import get_agent
from core.scheduler import scheduler
from skills.tools_register import register_all

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

STATIC    = ROOT / "ui" / "static"
TEMPLATES = ROOT / "ui" / "templates"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[OZY2] Starting up...")
    from api.routers.auth_router import load_sessions_from_db
    load_sessions_from_db()
    register_all()   # register all skill tools
    get_agent()
    scheduler.start()

    # ── Telegram: mesaj al + AI ile otomatik cevapla (her 8 saniye) ─────────
    from integrations.telegram import poll_and_reply
    scheduler.add_interval("telegram_poller", poll_and_reply, seconds=8, delay=10)

    # ── Günde 2 kez otomatik sağlık kontrolü (09:00 ve 21:00) ────────────────
    from core.health_check import health_check_and_notify
    scheduler.add_daily("health_check_morning", health_check_and_notify, hour=9,  minute=0)
    scheduler.add_daily("health_check_evening", health_check_and_notify, hour=21, minute=0)

    yield
    scheduler.stop()
    logger.info("[OZY2] Shut down.")


# ── Security Middleware: Localhost-only (disabled when remote_access=true) ────
class LocalhostOnlyMiddleware(BaseHTTPMiddleware):
    _ALLOWED = {"localhost", "127.0.0.1"}

    async def dispatch(self, request: FastAPIRequest, call_next):
        from api.routers.auth_router import remote_access_enabled
        if remote_access_enabled():
            return await call_next(request)
        host = request.headers.get("host", "").split(":")[0]
        if host not in self._ALLOWED:
            return JSONResponse(
                {"ok": False, "error": "Access denied — OZY2 is local-only."},
                status_code=403,
            )
        return await call_next(request)


# ── Auth Middleware: Redirect to /login if PIN is set and no valid session ────
_PUBLIC = {"/login", "/api/auth/login", "/api/auth/status", "/api/google/auth/callback", "/static", "/favicon"}

# Internal bypass token — health check uses this to call internal endpoints
import secrets as _secrets
_INTERNAL_TOKEN = _secrets.token_urlsafe(32)


def get_internal_token() -> str:
    return _INTERNAL_TOKEN


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: FastAPIRequest, call_next):
        from api.routers.auth_router import pin_required, is_valid_session, COOKIE
        path = request.url.path

        # Always allow public paths
        if any(path.startswith(p) for p in _PUBLIC):
            return await call_next(request)

        # Internal health check bypass
        if request.headers.get("X-OZY2-Internal") == _INTERNAL_TOKEN:
            return await call_next(request)

        # If no PIN set — allow everything
        if not pin_required():
            return await call_next(request)

        # Check session cookie
        token = request.cookies.get(COOKIE)
        if is_valid_session(token):
            return await call_next(request)

        # API calls get 401, pages get redirect
        if path.startswith("/api/"):
            return JSONResponse({"ok": False, "error": "Not authenticated"}, status_code=401)
        return RedirectResponse("/login")


app = FastAPI(
    title="OZY2 — Personal AI Assistant",
    version="2.0.0",
    description="""
## OZY2 API

Personal AI assistant backend. All endpoints return `{"ok": true, ...}` on success.

### Authentication
No auth required — runs locally on `127.0.0.1:8082`.

### Streaming Chat
Use `GET /api/chat/stream?message=...` for SSE streaming.
Each event: `data: {"chunk": "..."}` — final event: `data: [DONE]`

### Integrations
Google OAuth token required for Gmail, Calendar, Drive.
Run `python3 reauth_google.py` once to authorize.
""",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS: restrict to known origins ──────────────────────────────────────────
def _get_allowed_origins() -> list[str]:
    try:
        import json
        cfg  = json.loads((ROOT / "config" / "settings.json").read_text())
        port = int(cfg.get("port", 8082))
        base = [
            f"http://localhost:{port}",
            f"http://127.0.0.1:{port}",
            f"https://localhost:{port}",
        ]
        # Explicit extra origins from settings (e.g. "https://demo.ozy2.com")
        extra = cfg.get("allowed_origins", [])
        if isinstance(extra, str):
            extra = [o.strip() for o in extra.split(",") if o.strip()]
        return base + extra
    except Exception:
        return ["http://localhost:8082", "http://127.0.0.1:8082"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT", "PATCH"],
    allow_headers=["Content-Type"],
)


# ── Security Headers Middleware ───────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: FastAPIRequest, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]         = "DENY"
        response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=()"
        return response

# ── Security headers ──────────────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)
# ── Auth guard ────────────────────────────────────────────────────────────────
app.add_middleware(AuthMiddleware)
# ── Localhost-only guard ───────────────────────────────────────────────────────
app.add_middleware(LocalhostOnlyMiddleware)

# Static files
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")

# Templates
templates = Jinja2Templates(directory=str(TEMPLATES))

# ── Routers ──────────────────────────────────────────────
from api.routers.auth_router  import router as auth_router
from api.routers.chat         import router as chat_router
from api.routers.i18n         import router as i18n_router
from api.routers.settings     import router as settings_router
from api.routers.setup_router import router as setup_router
from api.routers.gmail        import router as gmail_router
from api.routers.calendar_router  import router as calendar_router
from api.routers.drive_router     import router as drive_router
from api.routers.tasks_router     import router as tasks_router
from api.routers.memory_router    import router as memory_router
from api.routers.telegram_router  import router as telegram_router
from api.routers.briefing_router  import router as briefing_router
from api.routers.youtube_router   import router as youtube_router
from api.routers.books_router     import router as books_router
from api.routers.smarthome_router import router as smarthome_router
from api.routers.health_router    import router as health_router
from api.routers.tts_router       import router as tts_router
from api.routers.notes_router     import router as notes_router
from api.routers.reminders_router import router as reminders_router
from api.routers.pro_router         import router as pro_router
from api.routers.roles_router       import router as roles_router
from api.routers.business_router    import router as business_router
from api.routers.github_router      import router as github_router
from api.routers.marketplace_router import router as marketplace_router
from api.routers.packages_router    import router as packages_router
from api.routers.stocks_router      import router as stocks_router

app.include_router(auth_router)
app.include_router(setup_router)
app.include_router(chat_router)
app.include_router(i18n_router)
app.include_router(settings_router)
app.include_router(gmail_router)
app.include_router(calendar_router)
app.include_router(drive_router)
app.include_router(tasks_router)
app.include_router(memory_router)
app.include_router(telegram_router)
app.include_router(briefing_router)
app.include_router(youtube_router)
app.include_router(books_router)
app.include_router(smarthome_router)
app.include_router(health_router)
app.include_router(tts_router)
app.include_router(notes_router)
app.include_router(reminders_router)
app.include_router(pro_router)
app.include_router(roles_router)
app.include_router(business_router)
app.include_router(github_router)
app.include_router(marketplace_router)
app.include_router(packages_router)
app.include_router(stocks_router)


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")
