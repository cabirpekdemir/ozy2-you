#!/bin/bash
# ═══════════════════════════════════════════════════════
#  OZY2 — macOS Build Script
#  Output: dist/OZY2.dmg  (drag-to-Applications installer)
# ═══════════════════════════════════════════════════════
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="$ROOT/dist"
APP="$DIST/OZY2.app"
DMG="$DIST/OZY2-mac.dmg"
VERSION="2.0.0"

echo ""
echo "  ╔════════════════════════════════╗"
echo "  ║  OZY2 macOS Build v$VERSION     ║"
echo "  ╚════════════════════════════════╝"
echo ""

cd "$ROOT"

# ── 1. Check deps ──────────────────────────────────────
echo "→ Checking build tools..."
python3 -m pip install pyinstaller pillow pystray --quiet
if ! command -v create-dmg &>/dev/null; then
  echo "  Installing create-dmg..."
  brew install create-dmg 2>/dev/null || npm install -g create-dmg 2>/dev/null || true
fi

# ── 2. Create .icns if missing ─────────────────────────
ICONS_DIR="$ROOT/ui/static/icons"
ICNS="$ICONS_DIR/icon.icns"
if [ ! -f "$ICNS" ] && [ -f "$ICONS_DIR/icon-512.png" ]; then
  echo "→ Generating .icns..."
  ICONSET="$ICONS_DIR/icon.iconset"
  mkdir -p "$ICONSET"
  for SIZE in 16 32 64 128 256 512; do
    sips -z $SIZE $SIZE "$ICONS_DIR/icon-512.png" \
      --out "$ICONSET/icon_${SIZE}x${SIZE}.png" &>/dev/null
    sips -z $((SIZE*2)) $((SIZE*2)) "$ICONS_DIR/icon-512.png" \
      --out "$ICONSET/icon_${SIZE}x${SIZE}@2x.png" &>/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$ICNS"
  rm -rf "$ICONSET"
fi

# ── 3. PyInstaller ────────────────────────────────────
echo "→ Building with PyInstaller..."
rm -rf "$DIST/OZY2" "$APP"
python3 -m PyInstaller build/ozy2.spec \
  --distpath "$DIST" \
  --workpath "$ROOT/build/_work" \
  --noconfirm \
  --clean

if [ ! -d "$APP" ]; then
  echo "❌ Build failed — OZY2.app not found"
  exit 1
fi
echo "  ✓ OZY2.app built"

# ── 4. Code sign (optional — needs Apple Developer account) ───────────────────
CERT="${CODESIGN_IDENTITY:-}"
if [ -n "$CERT" ]; then
  echo "→ Code signing..."
  codesign --deep --force --verify --verbose \
    --sign "$CERT" \
    --entitlements "$ROOT/build/mac/entitlements.plist" \
    "$APP"
  echo "  ✓ Signed"
else
  echo "  ⚠  Skipping code sign (set CODESIGN_IDENTITY to enable)"
fi

# ── 5. Create DMG ─────────────────────────────────────
echo "→ Creating DMG..."
rm -f "$DMG"

if command -v create-dmg &>/dev/null; then
  create-dmg \
    --volname "OZY2 $VERSION" \
    --volicon "$ICNS" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "OZY2.app" 175 190 \
    --hide-extension "OZY2.app" \
    --app-drop-link 425 190 \
    "$DMG" "$APP"
else
  # Fallback: simple hdiutil DMG
  hdiutil create -volname "OZY2 $VERSION" \
    -srcfolder "$APP" \
    -ov -format UDZO \
    "$DMG"
fi

echo ""
echo "  ✅ Done!"
echo "  📦 $DMG"
echo "  Size: $(du -sh "$DMG" | cut -f1)"
echo ""
echo "  Distribute this .dmg — users drag OZY2 to Applications."
