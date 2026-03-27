; OZY2 — NSIS Windows Installer
; Replaces __VERSION__ and __OUTFILE__ at CI build time.

Unicode True

!define APP_NAME    "OZY2"
!define APP_VERSION "__VERSION__"
!define APP_PUBLISHER "OZY2"
!define APP_URL     "https://github.com/cabirpekdemir/ozy2"
!define APP_EXE     "OZY2.exe"
!define INSTALL_DIR "$PROGRAMFILES64\${APP_NAME}"

OutFile    "__OUTFILE__"
Name       "${APP_NAME} ${APP_VERSION}"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel admin

; ── UI ────────────────────────────────────────────────────────────────────────
; Note: paths are relative to repo root (makensis runs from there via CI)
!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_ICON "ui\static\icons\icon.ico"
!define MUI_UNICON "ui\static\icons\icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "PRIVACY.md"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch OZY2 now"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Install ───────────────────────────────────────────────────────────────────
Section "OZY2 (required)" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; Copy all PyInstaller output files (path relative to repo root)
  File /r "dist\OZY2\*.*"

  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
  CreateShortCut  "$DESKTOP\${APP_NAME}.lnk"                "$INSTDIR\${APP_EXE}"

  ; Write registry for uninstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "DisplayName"    "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "Publisher"      "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "URLInfoAbout"   "${APP_URL}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "UninstallString" "$INSTDIR\Uninstall.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; ── Uninstall ─────────────────────────────────────────────────────────────────
Section "Uninstall"
  ; Kill running instance
  ExecWait 'taskkill /IM "${APP_EXE}" /F'

  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  RMDir  "$SMPROGRAMS\${APP_NAME}"

  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd
