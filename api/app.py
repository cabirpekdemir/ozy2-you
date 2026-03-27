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
    register_all()   # register all skill tools
    get_agent()
    scheduler.start()
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
_PUBLIC = {"/login", "/api/auth/login", "/api/auth/status", "/static", "/favicon"}

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: FastAPIRequest, call_next):
        from api.routers.auth_router import pin_required, is_valid_session, COOKIE
        path = request.url.path

        # Always allow public paths
        if any(path.startswith(p) for p in _PUBLIC):
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

# ── CORS: allow localhost on configured port ──────────────────────────────────
def _get_port() -> int:
    try:
        import json
        cfg = ROOT / "config" / "settings.json"
        return int(json.loads(cfg.read_text()).get("port", 8082))
    except Exception:
        return 8082

_PORT = _get_port()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{_PORT}",
        f"http://127.0.0.1:{_PORT}",
        "*",  # allow Tailscale / LAN when remote_access is on
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "PUT"],
    allow_headers=["Content-Type"],
)

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


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")
