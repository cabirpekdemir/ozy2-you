# OZY2 Skill Developer Guide

Build and publish AI-powered skills for the OZY2 ecosystem.
Earn **85%** of every sale — 15% platform commission.

---

## Table of Contents

1. [What is a Skill?](#what-is-a-skill)
2. [Quick Start](#quick-start)
3. [@register Decorator](#register-decorator)
4. [Parameter Types](#parameter-types)
5. [Package Tiers](#package-tiers)
6. [Permissions](#permissions)
7. [Skill Manifest](#skill-manifest)
8. [Testing Locally](#testing-locally)
9. [Publishing to Marketplace](#publishing-to-marketplace)
10. [Revenue & Payouts](#revenue--payouts)
11. [Categories](#categories)
12. [Best Practices](#best-practices)

---

## What is a Skill?

A **Skill** is an async Python function registered with the OZY2 tool registry.
When a user asks the AI assistant something, OZY2 automatically calls the right skill and returns a structured result.

Skills can do anything: call external APIs, read files, query databases, send messages, run calculations — the AI handles when and how to use them.

---

## Quick Start

Minimum viable skill — one file, one function:

```python
# my_skill.py
from core.tools import register

def register_all():

    @register(
        name="hello_world",
        description="Greet a person by name.",
        params={
            "name": {"type": "string", "description": "Person's name", "required": True},
        },
        package="you",
    )
    async def _hello(name: str):
        return {"message": f"Hello, {name}! 👋"}
```

That's it. OZY2's AI will automatically call this when someone says *"greet John"*.

---

## @register Decorator

Every skill uses the `@register` decorator from `core.tools`:

```python
@register(
    name="tool_name",          # unique snake_case identifier
    description="...",         # shown to AI — be specific and include trigger phrases
    params={...},              # input parameters (see below)
    package="you",             # tier: you | pro | social | business
    permission="scope.read",   # optional permission scope (default: "*")
)
async def _handler(arg1: str, arg2: int = 3):
    ...
    return {"ok": True, "result": ...}
```

> **💡 Description tip:** Write it from the AI's perspective. Include trigger phrases like:
> *"Use for: 'weather', 'is it raining', 'forecast this week'".*
> The better the description, the more accurately the AI calls your skill.

---

## Parameter Types

Parameters are defined as a dict. Each key is a parameter name:

```python
params={
    "city":     {"type": "string",  "description": "City name"},
    "forecast": {"type": "boolean", "description": "True for multi-day forecast"},
    "days":     {"type": "integer", "description": "Days 1–7 (default 3)"},
    "query":    {"type": "string",  "description": "Search query", "required": True},
}
```

| JSON type  | Python  | Example           |
|------------|---------|-------------------|
| `string`   | `str`   | `"Istanbul"`      |
| `integer`  | `int`   | `7`               |
| `boolean`  | `bool`  | `True / False`    |
| `number`   | `float` | `3.14`            |
| `array`    | `list`  | `["a", "b", "c"]` |
| `object`   | `dict`  | `{"key": "val"}`  |

Add `"required": True` to any param the AI must always provide.

---

## Package Tiers

Every skill belongs to a tier. Users can only call skills in their tier or below:

| Tier         | `package=`   | Typical use                                    |
|--------------|--------------|------------------------------------------------|
| ⚡ YOU        | `"you"`      | Weather, web search, notes, reminders, tasks   |
| 💼 PRO        | `"pro"`      | Email, calendar, drive, documents, TTS         |
| 🌐 SOCIAL     | `"social"`   | YouTube, content creation, Instagram           |
| 🏢 BUSINESS   | `"business"` | Slack, Jira, Linear, HubSpot, GA4, invoices    |
| ✨ FULL (core)| `"core"`     | Available in all tiers                         |

Choose the lowest tier that makes sense for your skill's audience.

---

## Permissions

Permissions let admins grant specific capabilities to collaborator roles.
Use `permission="scope.action"` on skills that touch sensitive data:

```python
@register(
    name="send_slack_message",
    description="Send a message to a Slack channel.",
    package="business",
    permission="slack.write",   # role must have this permission
)
async def _send(channel: str, text: str):
    ...
```

Use `permission="*"` (default) for unrestricted skills.

**Built-in permission scopes:**

```
email.read      email.write
calendar.read   calendar.write
drive.read      drive.write
task.read       task.write
slack.read      slack.write
teams.read      teams.write
jira.read       jira.write
linear.read     linear.write
asana.read      asana.write
hubspot.read    hubspot.write
analytics.read
meeting.read
invoice.write
memory.read     memory.write
```

---

## Skill Manifest

When submitting to the marketplace, include a `manifest` object describing your skill's requirements:

```json
{
  "tools": ["my_tool_name"],
  "settings_keys": [
    "openweather_api_key"
  ],
  "external_apis": [
    "api.openweathermap.org"
  ],
  "min_ozy2_version": "2.0.0"
}
```

| Field               | Description                                      |
|---------------------|--------------------------------------------------|
| `tools`             | List of registered tool names your skill exposes |
| `settings_keys`     | Keys your skill reads from `config/settings.json`|
| `external_apis`     | Third-party domains your skill calls             |
| `min_ozy2_version`  | Minimum compatible OZY2 version                  |

---

## Testing Locally

**1.** Place your skill file in `skills/`

**2.** Import and call `register_all()` in `skills/tools_register.py`:

```python
from skills.my_skill import register_all as reg_mine
reg_mine()
```

**3.** Start OZY2 and open the chat:

```bash
cd ~/Ozy2 && ./OZY2.command
```

**4.** Ask the AI to use your skill: *"Test my skill with X"*

**5.** Watch the terminal logs:
```
[Tools] Registered: my_tool (you)
[Agent] tool_call: my_tool {"arg": "value"}
```

> **🐛 Debug tip:** If your skill isn't being called, check the `description` — the AI needs
> clear trigger phrases to know when to use it.

---

## Publishing to Marketplace

Submit via the **Marketplace → Publish** tab in OZY2, or directly via API:

```http
POST /api/marketplace/skills
Content-Type: application/json

{
  "name":             "My Awesome Skill",
  "description":      "One-line summary for the marketplace card",
  "long_description": "Full details shown on the skill detail page",
  "developer_id":     "your-github-username",
  "developer_name":   "Your Name",
  "category":         "Productivity",
  "price":            4.99,
  "icon":             "⚡",
  "tags":             ["automation", "api"],
  "version":          "1.0.0",
  "manifest":         { "tools": ["my_tool"] }
}
```

**Response:**
```json
{ "ok": true, "id": 42, "message": "Skill submitted for review" }
```

**Status flow:**

```
pending  →  (admin review)  →  published
                            →  rejected  →  (fix & resubmit)
```

Rejected submissions receive feedback. Fix the issue and resubmit at any time.

---

## Revenue & Payouts

| Split         | Rate  |
|---------------|-------|
| Developer     | **85%** |
| Platform      | 15%   |

- **Free skills** (`price: 0`) are fully allowed and encouraged
- Recommended pricing: **$0.99 – $9.99** for single skills, **$4.99 – $19.99** for bundles
- Track earnings: **Marketplace → Revenue → Developer Revenue Lookup** (use your `developer_id`)
- Every purchase generates a transaction record with commission breakdown

---

## Categories

Choose the most specific category for better discoverability:

- `Productivity`
- `Communication`
- `Finance`
- `Analytics`
- `Developer Tools`
- `AI & ML`
- `Smart Home`
- `Social Media`
- `Education`
- `Utilities`
- `Health`
- `Entertainment`
- `E-commerce`
- `Marketing`

---

## Best Practices

**Always return a dict.**
```python
# Success
return {"ok": True, "result": data}

# Failure
return {"error": "API key not configured in settings"}
```

**Use stdlib for HTTP.** Don't add pip dependencies unless truly necessary.
```python
import urllib.request, json
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
```

**Read config from settings.json.** Never hardcode API keys.
```python
from pathlib import Path
import json

cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
api_key = cfg.get("my_service_api_key")
if not api_key:
    return {"error": "my_service_api_key not configured in settings"}
```

**Always set timeouts.** External calls should never hang indefinitely.
```python
urllib.request.urlopen(req, timeout=10)
```

**Be async.** OZY2's agent engine is fully async — always use `async def`.

**One skill = one responsibility.** Prefer two focused skills over one that does too much.

**Write description for the AI, not humans.** Include use cases and trigger phrases.

---

## Full Example

A complete skill with config reading, error handling, and multiple tools:

```python
# skills/my_currency_skill.py
from core.tools import register
from pathlib import Path
import json, urllib.request, urllib.parse

def register_all():

    def _get_api_key():
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
            return cfg.get("exchangerate_api_key")
        except Exception:
            return None

    @register(
        name="convert_currency",
        description=(
            "Convert an amount between currencies. "
            "Use for: 'convert USD to EUR', 'how much is 100 dollars in pounds'."
        ),
        params={
            "amount": {"type": "number",  "description": "Amount to convert",  "required": True},
            "from":   {"type": "string",  "description": "Source currency code (e.g. USD)", "required": True},
            "to":     {"type": "string",  "description": "Target currency code (e.g. EUR)", "required": True},
        },
        package="you",
    )
    async def _convert(amount: float, **kwargs):
        from_cur = kwargs.get("from", "USD").upper()
        to_cur   = kwargs.get("to", "EUR").upper()

        api_key = _get_api_key()
        if not api_key:
            return {"error": "exchangerate_api_key not configured in settings"}

        url = f"https://v6.exchangerate-api.com/v6/{api_key}/pair/{from_cur}/{to_cur}/{amount}"
        try:
            with urllib.request.urlopen(url, timeout=10) as r:
                data = json.loads(r.read())
            if data.get("result") != "success":
                return {"error": data.get("error-type", "Conversion failed")}
            return {
                "ok":             True,
                "from":           from_cur,
                "to":             to_cur,
                "amount":         amount,
                "converted":      data["conversion_result"],
                "rate":           data["conversion_rate"],
            }
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="list_exchange_rates",
        description="List all exchange rates for a base currency. Use for: 'show rates for USD'.",
        params={
            "base": {"type": "string", "description": "Base currency code (default: USD)"},
        },
        package="you",
    )
    async def _rates(base: str = "USD"):
        api_key = _get_api_key()
        if not api_key:
            return {"error": "exchangerate_api_key not configured in settings"}
        url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/{base.upper()}"
        try:
            with urllib.request.urlopen(url, timeout=10) as r:
                data = json.loads(r.read())
            if data.get("result") != "success":
                return {"error": "Failed to fetch rates"}
            return {"ok": True, "base": base.upper(), "rates": data["conversion_rates"]}
        except Exception as e:
            return {"error": str(e)}
```

---

*OZY2 Skill Marketplace — built with ❤️ by [Cabir Pekdemir](https://github.com/cabirpekdemir)*
