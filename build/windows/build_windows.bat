@echo off
REM ═══════════════════════════════════════════════════════
REM  OZY2 — Windows Build Script
REM  Output: dist\OZY2-Setup.exe  (Inno Setup installer)
REM ═══════════════════════════════════════════════════════
setlocal enabledelayedexpansion

set VERSION=2.0.0
set ROOT=%~dp0..\..
set DIST=%ROOT%\dist

echo.
echo   OZY2 Windows Build v%VERSION%
echo   ================================
echo.

cd /d "%ROOT%"

REM ── 1. Check Python ───────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from python.org
    exit /b 1
)

REM ── 2. Install build deps ─────────────────────────────
echo ^> Installing build tools...
python -m pip install pyinstaller pillow pystray --quiet
if errorlevel 1 ( echo ERROR: pip install failed & exit /b 1 )

REM ── 3. PyInstaller ────────────────────────────────────
echo ^> Building with PyInstaller...
if exist "%DIST%\OZY2" rd /s /q "%DIST%\OZY2"

python -m PyInstaller build\ozy2.spec ^
  --distpath "%DIST%" ^
  --workpath "%ROOT%\build\_work" ^
  --noconfirm ^
  --clean

if not exist "%DIST%\OZY2\OZY2.exe" (
    echo ERROR: Build failed - OZY2.exe not found
    exit /b 1
)
echo   [OK] OZY2.exe built

REM ── 4. Inno Setup installer ───────────────────────────
echo ^> Creating installer...
set ISCC=
for %%p in (
  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
  "C:\Program Files\Inno Setup 6\ISCC.exe"
) do (
  if exist %%p set ISCC=%%p
)

if defined ISCC (
  "%ISCC%" "%ROOT%\build\windows\installer.iss"
  echo   [OK] OZY2-Setup.exe created
) else (
  echo   [WARN] Inno Setup not found - skipping installer creation
  echo         Download from: https://jrsoftware.org/isinfo.php
  echo         Then run: ISCC build\windows\installer.iss
)

echo.
echo   Done!
echo   Output: %DIST%\OZY2-Setup.exe
echo.
