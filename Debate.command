#!/bin/bash
# OZY2 — AI Debate (double-click to run)

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="/Users/cabirpekdemir/Ozy/venv/bin/python3"

[ ! -f "$PYTHON" ] && PYTHON="python3"

cd "$DIR"
clear
exec "$PYTHON" debate.py
