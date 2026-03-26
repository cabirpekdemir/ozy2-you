"""
OZY2 — Smart Launcher
─────────────────────
• Detects first-run → opens Setup Wizard
• Starts FastAPI server
• Auto-opens browser
• Zero terminal interaction for end users
"""
import os
import sys
import json
import time
import socket
import logging
import threading
import webbrowser
import subprocess
from pathlib import Path

# ── Path resolution (works both frozen PyInstaller & dev) ─────────────────────
if getattr(sys, "frozen", False):
    ROOT     = Path(sys._MEIPASS)          # PyInstaller bundle
    USER_DIR = Path.home() / ".ozy2"       # user's writable data dir
else:
    ROOT     = Path(__file__).parent
    USER_DIR = ROOT                        # dev: same directory

CONFIG_DIR  = USER_DIR / "config"
CONFIG_FILE = CONFIG_DIR / "settings.json"
DATA_DIR    = USER_DIR / "data"
LOG_FILE    = USER_DIR / "ozy2.log"

PORT        = 8081
HOST        = "127.0.0.1"
URL         = f"http://{HOST}:{PORT}"
SETUP_URL   = f"{URL}/setup"

DEFAULTS = {
    "provider":  "gemini",
    "model":     "gemini-2.5-flash",
    "api_key":   "",
    "package":   "you",
    "theme":     "dark",
    "language":  "en",
    "user_name": "",
    "_first_run": True,
}


# ── Logging ────────────────────────────────────────────────────────────────────
def setup_logging():
    USER_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(str(LOG_FILE), encoding="utf-8"),
            # No StreamHandler → no terminal output for end users
        ],
    )


# ── Port helpers ───────────────────────────────────────────────────────────────
def is_port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, port)) != 0


def wait_for_server(port: int, timeout: float = 15.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if not is_port_free(port):
            return True
        time.sleep(0.25)
    return False


# ── Config ─────────────────────────────────────────────────────────────────────
def ensure_dirs():
    for d in (CONFIG_DIR, DATA_DIR):
        d.mkdir(parents=True, exist_ok=True)


def is_first_run() -> bool:
    if not CONFIG_FILE.exists():
        return True
    try:
        cfg = json.loads(CONFIG_FILE.read_text())
        return bool(cfg.get("_first_run")) or not cfg.get("api_key")
    except Exception:
        return True


def write_defaults():
    ensure_dirs()
    if not CONFIG_FILE.exists():
        CONFIG_FILE.write_text(json.dumps(DEFAULTS, indent=2))


# ── Server ─────────────────────────────────────────────────────────────────────
def kill_existing():
    """Kill any process already on PORT."""
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(
                f"netstat -ano | findstr :{PORT}", shell=True, text=True
            )
            for line in out.splitlines():
                parts = line.split()
                if parts and parts[-1].isdigit():
                    subprocess.run(f"taskkill /PID {parts[-1]} /F",
                                   shell=True, capture_output=True)
        except Exception:
            pass
    else:
        try:
            out = subprocess.check_output(
                f"lsof -ti:{PORT}", shell=True, text=True
            ).strip()
            if out:
                for pid in out.splitlines():
                    os.kill(int(pid), 9)
        except Exception:
            pass


def start_server():
    """Start uvicorn in a subprocess (background)."""
    python = sys.executable
    env    = os.environ.copy()

    # Point the app to the user's writable config/data dirs
    env["OZY2_ROOT"]     = str(ROOT)
    env["OZY2_USER_DIR"] = str(USER_DIR)

    cmd = [
        python, "-m", "uvicorn",
        "api.app:app",
        "--host", HOST,
        "--port", str(PORT),
        "--log-level", "warning",
        "--no-access-log",
    ]

    kwargs = dict(env=env, cwd=str(ROOT))
    if sys.platform == "win32":
        # Hide console window on Windows
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = subprocess.SW_HIDE
        kwargs["startupinfo"] = si

    proc = subprocess.Popen(cmd, **kwargs)
    return proc


# ── Platform notification / tray (optional) ───────────────────────────────────
def open_browser(url: str):
    """Open URL in default browser."""
    try:
        webbrowser.open(url)
    except Exception:
        pass


# ── Tray icon (optional, works on all platforms if pystray installed) ─────────
def try_tray(proc):
    try:
        import pystray
        from PIL import Image as PILImage
        import io

        icon_path = ROOT / "ui" / "static" / "icons" / "icon-192.png"
        if icon_path.exists():
            image = PILImage.open(str(icon_path))
        else:
            # Minimal 16x16 icon fallback
            image = PILImage.new("RGBA", (64, 64), "#4f8ef7")

        def on_open(_icon, _item):
            open_browser(URL)

        def on_quit(_icon, _item):
            proc.terminate()
            _icon.stop()
            sys.exit(0)

        menu = pystray.Menu(
            pystray.MenuItem("Open OZY2", on_open, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", on_quit),
        )
        icon = pystray.Icon("OZY2", image, "OZY2", menu)
        icon.run()          # blocks — run in main thread on macOS/Windows

    except ImportError:
        # No tray icon — just keep main thread alive while server runs
        proc.wait()
    except Exception as e:
        logging.warning(f"Tray icon error: {e}")
        proc.wait()


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    setup_logging()
    logging.info("OZY2 Launcher starting")

    ensure_dirs()
    write_defaults()

    # Add ROOT to Python path so imports work
    sys.path.insert(0, str(ROOT))

    kill_existing()

    first_run = is_first_run()
    logging.info(f"First run: {first_run}")

    proc = start_server()
    logging.info(f"Server process started (PID {proc.pid})")

    # Wait for server to be ready
    ready = wait_for_server(PORT, timeout=20)
    if not ready:
        logging.error("Server did not start in time")
        open_browser("about:blank#OZY2-failed-to-start")
        sys.exit(1)

    # Choose where to open
    target = SETUP_URL if first_run else URL
    logging.info(f"Opening: {target}")
    open_browser(target)

    # Keep app alive + optional tray icon
    try_tray(proc)


if __name__ == "__main__":
    main()
