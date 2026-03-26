#!/bin/bash
# ═══════════════════════════════════════════════════════
#  OZY2 — Linux Build Script
#  Outputs:
#    dist/OZY2-linux-x86_64.AppImage   (universal, no install)
#    dist/ozy2_2.0.0_amd64.deb         (Debian/Ubuntu)
# ═══════════════════════════════════════════════════════
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="$ROOT/dist"
VERSION="2.0.0"
APPIMAGE_OUT="$DIST/OZY2-linux-x86_64.AppImage"
DEB_OUT="$DIST/ozy2_${VERSION}_amd64.deb"

echo ""
echo "  OZY2 Linux Build v$VERSION"
echo "  ================================"
echo ""

cd "$ROOT"

# ── 1. Build deps ─────────────────────────────────────
echo "→ Installing build tools..."
python3 -m pip install pyinstaller pillow pystray --quiet

# ── 2. PyInstaller ────────────────────────────────────
echo "→ Building with PyInstaller..."
rm -rf "$DIST/OZY2"
python3 -m PyInstaller build/ozy2.spec \
  --distpath "$DIST" \
  --workpath "$ROOT/build/_work" \
  --noconfirm \
  --clean

if [ ! -f "$DIST/OZY2/OZY2" ]; then
  echo "❌ Build failed — binary not found"
  exit 1
fi
echo "  ✓ Binary built"

# ── 3. AppImage ───────────────────────────────────────
echo "→ Creating AppImage..."

APPDIR="$DIST/OZY2.AppDir"
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/bin" "$APPDIR/usr/share/ozy2"

# Copy binary
cp -r "$DIST/OZY2/"* "$APPDIR/usr/bin/"

# Desktop entry
cat > "$APPDIR/OZY2.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=OZY2
Comment=Personal AI Assistant
Exec=OZY2
Icon=ozy2
Categories=Utility;Office;
Terminal=false
StartupWMClass=OZY2
EOF
cp "$APPDIR/OZY2.desktop" "$APPDIR/usr/share/ozy2/"

# Icon
if [ -f "$ROOT/ui/static/icons/icon-256.png" ]; then
  mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"
  cp "$ROOT/ui/static/icons/icon-256.png" \
     "$APPDIR/usr/share/icons/hicolor/256x256/apps/ozy2.png"
  cp "$ROOT/ui/static/icons/icon-256.png" "$APPDIR/ozy2.png"
fi

# AppRun wrapper
cat > "$APPDIR/AppRun" << 'APPRUN'
#!/bin/bash
SELF="$(readlink -f "$0")"
HERE="$(dirname "$SELF")"
export PATH="$HERE/usr/bin:$PATH"
exec "$HERE/usr/bin/OZY2" "$@"
APPRUN
chmod +x "$APPDIR/AppRun"

# Download appimagetool if missing
TOOL="$ROOT/build/linux/appimagetool"
if [ ! -f "$TOOL" ]; then
  echo "  Downloading appimagetool..."
  curl -fsSL -o "$TOOL" \
    "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage"
  chmod +x "$TOOL"
fi

ARCH=x86_64 "$TOOL" "$APPDIR" "$APPIMAGE_OUT"
echo "  ✓ AppImage: $APPIMAGE_OUT"

# ── 4. .deb package ───────────────────────────────────
echo "→ Creating .deb..."
DEB_DIR="$DIST/deb_build"
rm -rf "$DEB_DIR"
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/opt/ozy2"
mkdir -p "$DEB_DIR/usr/share/applications"
mkdir -p "$DEB_DIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$DEB_DIR/usr/bin"

cp -r "$DIST/OZY2/"* "$DEB_DIR/opt/ozy2/"

cat > "$DEB_DIR/DEBIAN/control" << EOF
Package: ozy2
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Maintainer: OZY2 <hello@ozy2.app>
Description: OZY2 Personal AI Assistant
 OZY2 is a personal AI assistant that runs locally.
 Supports Gemini, ChatGPT, Claude and local Ollama models.
EOF

# Launcher script
cat > "$DEB_DIR/usr/bin/ozy2" << 'LAUNCHER'
#!/bin/bash
exec /opt/ozy2/OZY2 "$@"
LAUNCHER
chmod +x "$DEB_DIR/usr/bin/ozy2"

# Desktop file
cat > "$DEB_DIR/usr/share/applications/ozy2.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=OZY2
Comment=Personal AI Assistant
Exec=/opt/ozy2/OZY2
Icon=ozy2
Categories=Utility;Office;
Terminal=false
EOF

if [ -f "$ROOT/ui/static/icons/icon-256.png" ]; then
  cp "$ROOT/ui/static/icons/icon-256.png" \
     "$DEB_DIR/usr/share/icons/hicolor/256x256/apps/ozy2.png"
fi

dpkg-deb --build "$DEB_DIR" "$DEB_OUT" 2>/dev/null || true
[ -f "$DEB_OUT" ] && echo "  ✓ .deb: $DEB_OUT" || echo "  ⚠  dpkg-deb not available, .deb skipped"

rm -rf "$DEB_DIR" "$APPDIR"

echo ""
echo "  ✅ Done!"
echo "  📦 AppImage : $APPIMAGE_OUT"
[ -f "$DEB_OUT" ] && echo "  📦 Debian   : $DEB_OUT"
echo ""
echo "  AppImage: chmod +x OZY2-linux-x86_64.AppImage && ./OZY2-linux-x86_64.AppImage"
echo "  Debian  : sudo dpkg -i ozy2_${VERSION}_amd64.deb"
