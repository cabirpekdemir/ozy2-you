#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OZY2 — Linux Installer
# Installs OZY2 to ~/.local/share/ozy2 and creates a desktop entry + CLI link
# Usage:  ./install.sh        (from extracted tarball directory)
# ─────────────────────────────────────────────────────────────────────────────
set -e

APP_NAME="OZY2"
INSTALL_DIR="$HOME/.local/share/ozy2"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║   ✦  OZY2 Installer  v2.0         ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# ── Check permissions ─────────────────────────────────────────────────────────
if [[ "$EUID" -eq 0 ]]; then
  echo "  ⚠  Do not run as root. Run as your normal user."
  exit 1
fi

# ── Copy files ────────────────────────────────────────────────────────────────
echo "  → Installing to $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR"/. "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/OZY2"

# ── CLI symlink ───────────────────────────────────────────────────────────────
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/OZY2" "$BIN_DIR/ozy2"
echo "  ✓  CLI command: ozy2"

# ── Desktop entry ─────────────────────────────────────────────────────────────
mkdir -p "$DESKTOP_DIR"
ICON_SRC="$INSTALL_DIR/ui/static/icons/icon-192.png"
ICON_DEST="$HOME/.local/share/icons/ozy2.png"
mkdir -p "$(dirname "$ICON_DEST")"
if [[ -f "$ICON_SRC" ]]; then
  cp "$ICON_SRC" "$ICON_DEST"
fi

cat > "$DESKTOP_DIR/ozy2.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=OZY2
Comment=Personal AI Assistant
Exec=$INSTALL_DIR/OZY2
Icon=$ICON_DEST
Terminal=false
Categories=Utility;Office;
StartupNotify=true
EOF

chmod +x "$DESKTOP_DIR/ozy2.desktop"
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
echo "  ✓  Desktop entry created"

# ── PATH reminder ─────────────────────────────────────────────────────────────
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo ""
  echo "  ⓘ  Add ~/.local/bin to your PATH:"
  echo "     echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
  echo "     source ~/.bashrc"
fi

echo ""
echo "  ✓  OZY2 installed successfully!"
echo "  → Launch:   ozy2"
echo "  →           or find 'OZY2' in your app launcher"
echo ""
