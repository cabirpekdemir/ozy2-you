# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — Google Re-Authorization
Run once to get a token with all required scopes.
"""
from pathlib import Path

ROOT   = Path(__file__).parent
TOKEN  = ROOT / "config" / "google_token.json"
CREDS  = ROOT / "config" / "google_credentials.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
]

if __name__ == "__main__":
    from google_auth_oauthlib.flow import InstalledAppFlow

    if not CREDS.exists():
        print("ERROR: config/google_credentials.json not found")
        exit(1)

    print("Opening browser for Google authorization...")
    print("Please authorize all requested scopes.\n")

    flow = InstalledAppFlow.from_client_secrets_file(str(CREDS), SCOPES)
    creds = flow.run_local_server(port=0)

    TOKEN.write_text(creds.to_json())
    print(f"\n✓ Token saved to {TOKEN}")
    print("You can now restart OZY2 — Gmail and Drive will work.")
