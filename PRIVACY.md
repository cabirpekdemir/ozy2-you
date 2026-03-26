# Privacy Policy

**Effective date:** 2026-03-26
**Product:** OZY2 — Personal AI Assistant

---

## 1. Local-first architecture

OZY2 runs **entirely on your own device**.
We do not operate any servers, collect any usage data, or receive any information
from your installation.

| What                        | Where it lives                    |
|-----------------------------|-----------------------------------|
| Your API keys               | `~/.ozy2/config/settings.json` (your device only) |
| Conversation history        | `~/.ozy2/data/memory.db` (SQLite, local) |
| Tasks & projects            | `~/.ozy2/data/` (local SQLite) |
| Email / calendar data       | Fetched on demand, never stored permanently |
| Logs                        | `~/.ozy2/ozy2.log` (local, rotated) |

**Nothing is transmitted to OZY2 developers or any third party operated by us.**

---

## 2. Third-party services you choose to connect

When you configure an integration, OZY2 communicates **directly** between
your device and that service:

| Service | What OZY2 sends | Their privacy policy |
|---------|-----------------|----------------------|
| Google (Gmail / Calendar / Drive) | OAuth token + API requests | [policies.google.com](https://policies.google.com/privacy) |
| OpenAI | Your chat messages | [openai.com/privacy](https://openai.com/privacy) |
| Google Gemini | Your chat messages | [policies.google.com](https://policies.google.com/privacy) |
| Anthropic Claude | Your chat messages | [anthropic.com/privacy](https://www.anthropic.com/privacy) |
| Telegram | Messages you explicitly send | [telegram.org/privacy](https://telegram.org/privacy) |
| Twilio (WhatsApp) | Messages you explicitly send | [twilio.com/legal/privacy](https://www.twilio.com/legal/privacy) |
| Spotify | Search queries | [spotify.com/privacy](https://www.spotify.com/privacy) |
| GitHub | Search queries | [docs.github.com/privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) |
| Yahoo Finance | Stock ticker symbols | [yahoo.com/privacy](https://legal.yahoo.com/us/en/yahoo/privacy) |
| Notion / Trello | API requests with your token | Their respective policies |

You are in control of which integrations you enable.
Disable any integration in **Settings → Integrations** at any time.

---

## 3. AI agent actions — your responsibility

OZY2 is an **autonomous AI agent**. When you grant it access to an integration,
it may take real-world actions on your behalf:

- Send or reply to emails
- Create or delete calendar events
- Post to social media
- Send Telegram or WhatsApp messages
- Create or modify files

> ⚠️ **Always review the permissions you grant. The OZY2 authors are not
> responsible for any unintended actions taken by the AI agent.**

Recommendations:
- Start with the **OZY2 You** plan and enable only the integrations you actively use
- Enable **confirm before send** for email and social posting (Settings → Safety)
- Review the conversation history regularly (`~/.ozy2/data/memory.db`)

---

## 4. Children

OZY2 is not designed for or directed at children under 13 (or the applicable
age in your jurisdiction). Do not use OZY2 if you are under the minimum age.

---

## 5. Changes to this policy

We may update this policy with new versions of OZY2.
Changes are documented in [CHANGELOG.md](CHANGELOG.md).
The effective date at the top of this file always reflects the latest revision.

---

## 6. Contact

Issues and questions: [github.com/cabirpekdemir/ozy2/issues](https://github.com/cabirpekdemir/ozy2/issues)
