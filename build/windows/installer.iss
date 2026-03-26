; ═══════════════════════════════════════════════════════
;  OZY2 — Inno Setup Script (Windows Installer)
;  Creates: OZY2-Setup.exe
;  Install dir: C:\Users\{username}\AppData\Local\OZY2\
; ═══════════════════════════════════════════════════════

#define MyAppName      "OZY2"
#define MyAppVersion   "2.0.0"
#define MyAppPublisher "OZY2"
#define MyAppURL       "https://github.com/yourusername/ozy2"
#define MyAppExeName   "OZY2.exe"
#define MyAppId        "{{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\..\dist
OutputBaseFilename=OZY2-Setup
SetupIconFile=..\..\ui\static\icons\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=130
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#MyAppExeName}
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=OZY2 Personal AI Assistant
MinVersion=10.0.17763

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";   Description: "Create a &desktop shortcut";    GroupDescription: "Additional icons:"; Flags: checkedonce
Name: "startupentry";  Description: "Launch OZY2 when Windows starts"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
; Main application
Source: "..\..\dist\OZY2\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}";                    Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}";          Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}";            Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}";              Filename: "{app}\{#MyAppExeName}"; Tasks: startupentry

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch OZY2 now"; \
  Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\OZY2\data"
Type: filesandordirs; Name: "{localappdata}\OZY2\config"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
