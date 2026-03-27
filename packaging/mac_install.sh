#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║   OZY2 — Mac Installer (Full Developer Edition)     ║
# ║   github.com/cabirpekdemir/ozy2                     ║
# ╚══════════════════════════════════════════════════════╝
set -e

OZY2_DIR="$HOME/Ozy2"
VENV="$OZY2_DIR/venv"
APP="/Applications/OZY2.app"
PORT=8082

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║   ✦  OZY2 Installer — v2.0.1     ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# ── 1. Homebrew ────────────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "  → Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
else
  echo "  ✅ Homebrew found"
fi

# ── 2. Python 3 ────────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "  → Installing Python..."
  brew install python
else
  echo "  ✅ Python $(python3 --version | cut -d' ' -f2) found"
fi

# ── 3. Clone / update repo ─────────────────────────────────────────────────────
if [ -d "$OZY2_DIR/.git" ]; then
  echo "  → Updating OZY2..."
  git -C "$OZY2_DIR" pull --quiet
else
  echo "  → Cloning OZY2..."
  git clone --quiet https://github.com/cabirpekdemir/ozy2.git "$OZY2_DIR"
fi
echo "  ✅ OZY2 source ready at $OZY2_DIR"

# ── 4. Virtual environment ─────────────────────────────────────────────────────
if [ ! -d "$VENV" ]; then
  echo "  → Creating Python venv..."
  python3 -m venv "$VENV"
fi

echo "  → Installing packages (this may take a minute)..."
"$VENV/bin/pip" install --upgrade pip --quiet
"$VENV/bin/pip" install -r "$OZY2_DIR/requirements.txt" --quiet
echo "  ✅ All packages installed"

# ── 5. Config (full package, pre-filled for Cabir) ────────────────────────────
CONFIG_DIR="$OZY2_DIR/config"
CONFIG_FILE="$CONFIG_DIR/settings.json"
mkdir -p "$CONFIG_DIR"
mkdir -p "$HOME/.ozy2/data"

if [ ! -f "$CONFIG_FILE" ] || ! python3 -c "import json; d=json.load(open('$CONFIG_FILE')); exit(0 if d.get('api_key') else 1)" 2>/dev/null; then
  echo "  → Writing default config (full package)..."
  cat > "$CONFIG_FILE" << 'ENDJSON'
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "api_key": "",
  "package": "full",
  "theme": "dark",
  "language": "en",
  "user_name": "Cabir",
  "_first_run": true
}
ENDJSON
  echo "  ⚠  Add your API key at http://localhost:$PORT/setup after launch"
else
  echo "  ✅ Config already set"
fi

# ── 6. Build .app bundle ───────────────────────────────────────────────────────
echo "  → Building OZY2.app..."
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

# Copy icon
ICON="$OZY2_DIR/ui/static/icons/icon.icns"
[ -f "$ICON" ] && cp "$ICON" "$APP/Contents/Resources/icon.icns"

# Info.plist
cat > "$APP/Contents/Info.plist" << 'ENDPLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key><string>OZY2</string>
    <key>CFBundleDisplayName</key><string>OZY2</string>
    <key>CFBundleIdentifier</key><string>com.ozy2.app</string>
    <key>CFBundleVersion</key><string>2.0.1</string>
    <key>CFBundleShortVersionString</key><string>2.0.1</string>
    <key>CFBundleExecutable</key><string>OZY2</string>
    <key>CFBundleIconFile</key><string>icon</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>LSMinimumSystemVersion</key><string>12.0</string>
    <key>NSHighResolutionCapable</key><true/>
    <key>NSHumanReadableCopyright</key><string>© 2026 Cabir Pekdemir</string>
</dict>
</plist>
ENDPLIST

# Launcher script
cat > "$APP/Contents/MacOS/OZY2" << ENDLAUNCHER
#!/bin/bash
OZY2_DIR="\$HOME/Ozy2"
PYTHON="\$OZY2_DIR/venv/bin/python3"
HOST="127.0.0.1"
PORT="$PORT"
URL="http://\$HOST:\$PORT"
LOG="\$HOME/.ozy2/ozy2.log"

mkdir -p "\$HOME/.ozy2"

# Kill existing instance
EXISTING=\$(lsof -ti:\$PORT 2>/dev/null)
[ -n "\$EXISTING" ] && kill "\$EXISTING" 2>/dev/null && sleep 0.5

# Start server
cd "\$OZY2_DIR"
"\$PYTHON" -m uvicorn api.app:app \\
  --host "\$HOST" --port "\$PORT" \\
  --log-level warning --no-access-log \\
  >> "\$LOG" 2>&1 &

SERVER_PID=\$!

# Wait until ready
for i in \$(seq 1 30); do
  curl -s --max-time 1 "\$URL" > /dev/null 2>&1 && break
  sleep 0.5
done

open "\$URL"
wait \$SERVER_PID
ENDLAUNCHER

chmod +x "$APP/Contents/MacOS/OZY2"

# Remove quarantine + sign
xattr -rd com.apple.quarantine "$APP" 2>/dev/null || true
codesign --force --deep --sign - "$APP" 2>/dev/null || true

echo "  ✅ /Applications/OZY2.app created"

# ── 7. Add to Dock (optional) ──────────────────────────────────────────────────
defaults write com.apple.dock persistent-apps -array-add \
  "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>/Applications/OZY2.app</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>" \
  2>/dev/null && killall Dock 2>/dev/null || true

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║   OZY2 kurulumu tamamlandi!           ║"
echo "  ║                                       ║"
echo "  ║   Launchpad veya Dock uzerinden ac.   ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""
echo "  -> Ilk acilista API key girmeni isteyecek."
echo "  -> Gemini ucretsiz: https://aistudio.google.com"
echo ""
echo "  -> OZY2 baslatiliyor..."
sleep 1
open "$APP"
