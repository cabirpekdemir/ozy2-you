#!/bin/bash
# OZY2 — Launch Script (double-click to run)

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$DIR/venv/bin/python3"

# Fall back to Ozy venv if no local venv
if [ ! -f "$PYTHON" ]; then
  PYTHON="/Users/cabirpekdemir/Ozy/venv/bin/python3"
fi

# Fall back to system Python
if [ ! -f "$PYTHON" ]; then
  PYTHON="python3"
fi

clear
echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║   ✦  OZY2  —  v2.0           ║"
echo "  ║   Personal AI Assistant       ║"
echo "  ╚═══════════════════════════════╝"
echo ""

cd "$DIR"

# Kill any existing OZY2 instance on port 8081
EXISTING=$(lsof -ti:8081 2>/dev/null)
if [ -n "$EXISTING" ]; then
  echo "  → Stopping existing instance..."
  kill "$EXISTING" 2>/dev/null
  sleep 1
fi

# Detect remote_access from settings
REMOTE=$("$PYTHON" -c "
import json, pathlib
cfg = pathlib.Path('$DIR/config/settings.json')
if cfg.exists():
    d = json.loads(cfg.read_text())
    print('true' if d.get('remote_access') else 'false')
else:
    print('false')
" 2>/dev/null)

if [ "$REMOTE" = "true" ]; then
  HOST="0.0.0.0"
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "0.0.0.0")
  echo "  → Remote access ON  — http://$LAN_IP:8081"
else
  HOST="127.0.0.1"
  LAN_IP="127.0.0.1"
  echo "  → Local only        — http://127.0.0.1:8081"
fi
echo "  → Press Ctrl+C to stop"
echo ""

# Open browser after 2 seconds
(sleep 2 && open "http://$LAN_IP:8081") &

exec "$PYTHON" -m uvicorn api.app:app \
  --host "$HOST" \
  --port 8081 \
  --reload \
  --reload-dir api \
  --reload-dir core \
  --reload-dir integrations \
  --reload-dir skills \
  --log-level warning
