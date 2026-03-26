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

echo "  → Starting at http://127.0.0.1:8081"
echo "  → Press Ctrl+C to stop"
echo ""

# Open browser after 2 seconds
(sleep 2 && open "http://127.0.0.1:8081") &

exec "$PYTHON" -m uvicorn api.app:app \
  --host 127.0.0.1 \
  --port 8081 \
  --reload \
  --reload-dir api \
  --reload-dir core \
  --reload-dir integrations \
  --reload-dir skills \
  --log-level warning
