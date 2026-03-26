"""OZY2 — FastAPI Application"""
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Path setup
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import HTMLResponse

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


app = FastAPI(title="OZY2", version="2.0.0", lifespan=lifespan)

# Static files
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")

# Templates
templates = Jinja2Templates(directory=str(TEMPLATES))

# ── Routers ──────────────────────────────────────────────
from api.routers.chat         import router as chat_router
from api.routers.i18n         import router as i18n_router
from api.routers.settings     import router as settings_router
from api.routers.gmail        import router as gmail_router
from api.routers.calendar_router  import router as calendar_router
from api.routers.drive_router     import router as drive_router
from api.routers.tasks_router     import router as tasks_router
from api.routers.memory_router    import router as memory_router
from api.routers.telegram_router  import router as telegram_router
from api.routers.briefing_router  import router as briefing_router

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


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
