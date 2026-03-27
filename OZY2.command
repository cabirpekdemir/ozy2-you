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

# Read port + remote_access from settings
eval $("$PYTHON" -c "
import json, pathlib
cfg = pathlib.Path('$DIR/config/settings.json')
d = json.loads(cfg.read_text()) if cfg.exists() else {}
print('PORT=' + str(d.get('port', 8081)))
print('REMOTE=' + ('true' if d.get('remote_access') else 'false'))
" 2>/dev/null)
PORT=${PORT:-8081}
REMOTE=${REMOTE:-false}

# Kill any existing OZY2 instance on this port
EXISTING=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$EXISTING" ]; then
  echo "  → Stopping existing instance on :$PORT..."
  kill "$EXISTING" 2>/dev/null
  sleep 1
fi

if [ "$REMOTE" = "true" ]; then
  HOST="0.0.0.0"
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "0.0.0.0")
  echo "  → Remote access ON  — http://$LAN_IP:$PORT"
else
  HOST="127.0.0.1"
  LAN_IP="127.0.0.1"
  echo "  → Local only        — http://127.0.0.1:$PORT"
fi
echo "  → Press Ctrl+C to stop"
echo ""

# Open browser after 2 seconds
(sleep 2 && open "http://$LAN_IP:$PORT") &

exec "$PYTHON" -m uvicorn api.app:app \
  --host "$HOST" \
  --port "$PORT" \
  --reload \
  --reload-dir api \
  --reload-dir core \
  --reload-dir integrations \
  --reload-dir skills \
  --log-level warning
