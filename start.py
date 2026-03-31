# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Start script"""
import os
import sys
import json
import subprocess
from pathlib import Path

ROOT    = Path(__file__).parent
CONFIG  = ROOT / "config" / "settings.json"
VENV    = ROOT / "venv" / "bin" / "python3"
PYTHON  = str(VENV) if VENV.exists() else sys.executable

BANNER = """
  ╔═══════════════════════════════╗
  ║   ✦  OZY2  —  v2.0           ║
  ║   Personal AI Assistant       ║
  ╚═══════════════════════════════╝
"""


def check_config():
    if not CONFIG.exists():
        print("  ⚠  No config found. Running setup...")
        setup()
    cfg = json.loads(CONFIG.read_text())
    if not cfg.get("api_key"):
        print("  ⚠  API key not set. Visit http://localhost:8082 → Settings")


def setup():
    CONFIG.parent.mkdir(exist_ok=True)
    defaults = {
        "provider": "gemini",
        "model": "gemini-2.5-flash",
        "api_key": "",
        "package": "full",
        "language": "en",
        "theme": "dark",
    }
    CONFIG.write_text(json.dumps(defaults, indent=2))
    print("  ✓  config/settings.json created")


def install_deps():
    req = ROOT / "requirements.txt"
    if req.exists():
        print("  → Installing dependencies...")
        subprocess.run([PYTHON, "-m", "pip", "install", "-r", str(req), "-q"])
        print("  ✓  Dependencies ready")


def run():
    print(BANNER)
    check_config()

    host = "127.0.0.1"
    port = 8082

    print(f"  → Starting at http://{host}:{port}")
    print(f"  → Press Ctrl+C to stop\n")

    os.execv(PYTHON, [
        PYTHON, "-m", "uvicorn",
        "api.app:app",
        "--host", host,
        "--port", str(port),
        "--reload",
        "--reload-dir", "api",
        "--reload-dir", "core",
        "--log-level", "warning",
    ])


if __name__ == "__main__":
    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))
    if "--setup" in sys.argv:
        install_deps()
    run()
