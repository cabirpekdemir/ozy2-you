# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — Business Tier Skills
Package: business

Includes: slack, teams, jira, linear, asana, hubspot, analytics,
          summarize_meeting, create_invoice
"""
from core.tools import register


def register_all():

    # ── Slack ─────────────────────────────────────────────────────────────────

    @register(
        name="slack_list_channels",
        description="List all Slack channels the bot is a member of.",
        params={},
        package="business",
        permission="slack.read",
    )
    async def _slack_list_channels():
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token = cfg.get("slack_token")
        if not token:
            return {"error": "slack_token not configured in settings"}
        req = urllib.request.Request(
            "https://slack.com/api/conversations.list",
            headers={"Authorization": f"Bearer {token}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if not data.get("ok"):
                return {"error": data.get("error", "Slack API error")}
            channels = [{"id": c["id"], "name": c["name"], "is_private": c.get("is_private", False)}
                        for c in data.get("channels", [])]
            return {"ok": True, "channels": channels}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="slack_read_messages",
        description="Read recent messages from a Slack channel.",
        params={
            "channel_id": {"type": "string", "description": "Slack channel ID", "required": True},
            "limit":      {"type": "integer", "description": "Max messages to return (default 20)"},
        },
        package="business",
        permission="slack.read",
    )
    async def _slack_read_messages(channel_id: str, limit: int = 20):
        import urllib.request, urllib.parse, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token = cfg.get("slack_token")
        if not token:
            return {"error": "slack_token not configured in settings"}
        url = f"https://slack.com/api/conversations.history?channel={urllib.parse.quote(channel_id)}&limit={limit}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if not data.get("ok"):
                return {"error": data.get("error", "Slack API error")}
            messages = [{"ts": m.get("ts"), "user": m.get("user"), "text": m.get("text", "")}
                        for m in data.get("messages", [])]
            return {"ok": True, "channel_id": channel_id, "messages": messages}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="slack_send_message",
        description="Send a message to a Slack channel.",
        params={
            "channel": {"type": "string", "description": "Channel ID or name", "required": True},
            "text":    {"type": "string", "description": "Message text to send", "required": True},
        },
        package="business",
        permission="slack.write",
    )
    async def _slack_send_message(channel: str, text: str):
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token = cfg.get("slack_token")
        if not token:
            return {"error": "slack_token not configured in settings"}
        body = json.dumps({"channel": channel, "text": text}).encode()
        req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if not data.get("ok"):
                return {"error": data.get("error", "Slack API error")}
            return {"ok": True, "ts": data.get("ts"), "channel": channel}
        except Exception as e:
            return {"error": str(e)}

    # ── Microsoft Teams ────────────────────────────────────────────────────────

    @register(
        name="teams_list_channels",
        description="List channels in a Microsoft Teams team.",
        params={},
        package="business",
        permission="teams.read",
    )
    async def _teams_list_channels():
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token   = cfg.get("teams_token")
        team_id = cfg.get("teams_team_id")
        if not token:
            return {"error": "teams_token not configured in settings"}
        if not team_id:
            return {"error": "teams_team_id not configured in settings"}
        url = f"https://graph.microsoft.com/v1.0/teams/{team_id}/channels"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            channels = [{"id": c["id"], "displayName": c.get("displayName", "")}
                        for c in data.get("value", [])]
            return {"ok": True, "channels": channels}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="teams_send_message",
        description="Send a message to a Microsoft Teams channel.",
        params={
            "channel_id": {"type": "string", "description": "Teams channel ID", "required": True},
            "text":       {"type": "string", "description": "Message content", "required": True},
        },
        package="business",
        permission="teams.write",
    )
    async def _teams_send_message(channel_id: str, text: str):
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token   = cfg.get("teams_token")
        team_id = cfg.get("teams_team_id")
        if not token:
            return {"error": "teams_token not configured in settings"}
        if not team_id:
            return {"error": "teams_team_id not configured in settings"}
        url  = f"https://graph.microsoft.com/v1.0/teams/{team_id}/channels/{channel_id}/messages"
        body = json.dumps({"body": {"content": text}}).encode()
        req  = urllib.request.Request(
            url, data=body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            return {"ok": True, "id": data.get("id"), "channel_id": channel_id}
        except Exception as e:
            return {"error": str(e)}

    # ── Jira ──────────────────────────────────────────────────────────────────

    @register(
        name="jira_list_issues",
        description="List Jira issues using a JQL query.",
        params={
            "jql":   {"type": "string", "description": "JQL query string (default: project is not EMPTY)", "required": False},
            "limit": {"type": "integer", "description": "Max results (default 20)"},
        },
        package="business",
        permission="jira.read",
    )
    async def _jira_list_issues(jql: str = "project is not EMPTY ORDER BY created DESC", limit: int = 20):
        import urllib.request, urllib.parse, json, base64
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        jira_url = cfg.get("jira_url")
        email    = cfg.get("jira_email")
        api_tok  = cfg.get("jira_api_token")
        if not jira_url:
            return {"error": "jira_url not configured in settings"}
        if not email or not api_tok:
            return {"error": "jira_email / jira_api_token not configured in settings"}
        creds   = base64.b64encode(f"{email}:{api_tok}".encode()).decode()
        url     = f"{jira_url.rstrip('/')}/rest/api/3/search?jql={urllib.parse.quote(jql)}&maxResults={limit}"
        req     = urllib.request.Request(url, headers={
            "Authorization": f"Basic {creds}",
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            issues = []
            for iss in data.get("issues", []):
                f = iss.get("fields", {})
                issues.append({
                    "key":     iss.get("key"),
                    "summary": f.get("summary"),
                    "status":  f.get("status", {}).get("name"),
                    "assignee": (f.get("assignee") or {}).get("displayName"),
                })
            return {"ok": True, "total": data.get("total", 0), "issues": issues}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="jira_create_issue",
        description="Create a new Jira issue.",
        params={
            "project_key": {"type": "string", "description": "Jira project key (e.g. PROJ)", "required": True},
            "summary":     {"type": "string", "description": "Issue summary/title", "required": True},
            "description": {"type": "string", "description": "Issue description"},
            "issue_type":  {"type": "string", "description": "Issue type (default: Task)"},
        },
        package="business",
        permission="jira.write",
    )
    async def _jira_create_issue(project_key: str, summary: str,
                                  description: str = "", issue_type: str = "Task"):
        import urllib.request, json, base64
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        jira_url = cfg.get("jira_url")
        email    = cfg.get("jira_email")
        api_tok  = cfg.get("jira_api_token")
        if not jira_url:
            return {"error": "jira_url not configured in settings"}
        if not email or not api_tok:
            return {"error": "jira_email / jira_api_token not configured in settings"}
        creds = base64.b64encode(f"{email}:{api_tok}".encode()).decode()
        url   = f"{jira_url.rstrip('/')}/rest/api/3/issue"
        body  = json.dumps({
            "fields": {
                "project":     {"key": project_key},
                "summary":     summary,
                "issuetype":   {"name": issue_type},
                "description": {
                    "type":    "doc",
                    "version": 1,
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": description}]}],
                },
            }
        }).encode()
        req = urllib.request.Request(url, data=body, headers={
            "Authorization": f"Basic {creds}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            return {"ok": True, "key": data.get("key"), "id": data.get("id")}
        except Exception as e:
            return {"error": str(e)}

    # ── Linear ────────────────────────────────────────────────────────────────

    @register(
        name="linear_list_issues",
        description="List issues from Linear.",
        params={
            "limit": {"type": "integer", "description": "Max issues to return (default 20)"},
        },
        package="business",
        permission="linear.read",
    )
    async def _linear_list_issues(limit: int = 20):
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        api_key = cfg.get("linear_api_key")
        if not api_key:
            return {"error": "linear_api_key not configured in settings"}
        query = f'{{ issues(first: {limit}) {{ nodes {{ id title state {{ name }} assignee {{ name }} }} }} }}'
        body  = json.dumps({"query": query}).encode()
        req   = urllib.request.Request(
            "https://api.linear.app/graphql", data=body,
            headers={
                "Authorization": api_key,
                "Content-Type":  "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if "errors" in data:
                return {"error": data["errors"][0].get("message", "Linear API error")}
            nodes = data.get("data", {}).get("issues", {}).get("nodes", [])
            issues = [
                {
                    "id":       n.get("id"),
                    "title":    n.get("title"),
                    "state":    (n.get("state") or {}).get("name"),
                    "assignee": (n.get("assignee") or {}).get("name"),
                }
                for n in nodes
            ]
            return {"ok": True, "issues": issues}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="linear_create_issue",
        description="Create a new issue in Linear.",
        params={
            "title":       {"type": "string", "description": "Issue title", "required": True},
            "description": {"type": "string", "description": "Issue description"},
        },
        package="business",
        permission="linear.write",
    )
    async def _linear_create_issue(title: str, description: str = ""):
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        api_key = cfg.get("linear_api_key")
        if not api_key:
            return {"error": "linear_api_key not configured in settings"}
        # Escape quotes in user-supplied strings for the inline GraphQL
        safe_title = title.replace('"', '\\"')
        safe_desc  = description.replace('"', '\\"')
        mutation = (
            f'mutation {{ issueCreate(input: {{ title: "{safe_title}", '
            f'description: "{safe_desc}" }}) {{ success issue {{ id title }} }} }}'
        )
        body = json.dumps({"query": mutation}).encode()
        req  = urllib.request.Request(
            "https://api.linear.app/graphql", data=body,
            headers={
                "Authorization": api_key,
                "Content-Type":  "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if "errors" in data:
                return {"error": data["errors"][0].get("message", "Linear API error")}
            result = data.get("data", {}).get("issueCreate", {})
            return {"ok": result.get("success", False), "issue": result.get("issue")}
        except Exception as e:
            return {"error": str(e)}

    # ── Asana ─────────────────────────────────────────────────────────────────

    @register(
        name="asana_list_tasks",
        description="List Asana tasks assigned to me in the configured workspace.",
        params={},
        package="business",
        permission="asana.read",
    )
    async def _asana_list_tasks():
        import urllib.request, urllib.parse, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token     = cfg.get("asana_token")
        workspace = cfg.get("asana_workspace")
        if not token:
            return {"error": "asana_token not configured in settings"}
        if not workspace:
            return {"error": "asana_workspace not configured in settings"}
        params = urllib.parse.urlencode({
            "workspace": workspace,
            "assignee":  "me",
            "opt_fields": "name,due_on,completed",
        })
        req = urllib.request.Request(
            f"https://app.asana.com/api/1.0/tasks?{params}",
            headers={"Authorization": f"Bearer {token}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            tasks = [
                {"gid": t.get("gid"), "name": t.get("name"), "due_on": t.get("due_on"), "completed": t.get("completed")}
                for t in data.get("data", [])
            ]
            return {"ok": True, "tasks": tasks}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="asana_create_task",
        description="Create a new task in Asana.",
        params={
            "name":  {"type": "string", "description": "Task name", "required": True},
            "notes": {"type": "string", "description": "Task notes/description"},
        },
        package="business",
        permission="asana.write",
    )
    async def _asana_create_task(name: str, notes: str = ""):
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token     = cfg.get("asana_token")
        workspace = cfg.get("asana_workspace")
        if not token:
            return {"error": "asana_token not configured in settings"}
        if not workspace:
            return {"error": "asana_workspace not configured in settings"}
        body = json.dumps({"data": {"name": name, "workspace": workspace, "notes": notes}}).encode()
        req  = urllib.request.Request(
            "https://app.asana.com/api/1.0/tasks", data=body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            t = data.get("data", {})
            return {"ok": True, "gid": t.get("gid"), "name": t.get("name")}
        except Exception as e:
            return {"error": str(e)}

    # ── HubSpot ───────────────────────────────────────────────────────────────

    @register(
        name="hubspot_list_contacts",
        description="List contacts from HubSpot CRM.",
        params={
            "limit": {"type": "integer", "description": "Max contacts to return (default 20)"},
        },
        package="business",
        permission="hubspot.read",
    )
    async def _hubspot_list_contacts(limit: int = 20):
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token = cfg.get("hubspot_token")
        if not token:
            return {"error": "hubspot_token not configured in settings"}
        url = f"https://api.hubapi.com/crm/v3/objects/contacts?limit={limit}&properties=firstname,lastname,email,phone"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            contacts = []
            for c in data.get("results", []):
                p = c.get("properties", {})
                contacts.append({
                    "id":        c.get("id"),
                    "firstname": p.get("firstname"),
                    "lastname":  p.get("lastname"),
                    "email":     p.get("email"),
                    "phone":     p.get("phone"),
                })
            return {"ok": True, "contacts": contacts}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="hubspot_create_contact",
        description="Create a new contact in HubSpot CRM.",
        params={
            "firstname": {"type": "string", "description": "First name", "required": True},
            "lastname":  {"type": "string", "description": "Last name"},
            "email":     {"type": "string", "description": "Email address", "required": True},
        },
        package="business",
        permission="hubspot.write",
    )
    async def _hubspot_create_contact(firstname: str, email: str, lastname: str = ""):
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        token = cfg.get("hubspot_token")
        if not token:
            return {"error": "hubspot_token not configured in settings"}
        body = json.dumps({"properties": {"firstname": firstname, "lastname": lastname, "email": email}}).encode()
        req  = urllib.request.Request(
            "https://api.hubapi.com/crm/v3/objects/contacts", data=body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            return {"ok": True, "id": data.get("id"), "email": email}
        except Exception as e:
            return {"error": str(e)}

    # ── Analytics (GA4) ───────────────────────────────────────────────────────

    @register(
        name="get_analytics_report",
        description="Fetch a 7-day sessions/users/pageviews report from Google Analytics 4.",
        params={},
        package="business",
        permission="analytics.read",
    )
    async def _get_analytics_report():
        import urllib.request, json
        from pathlib import Path
        try:
            cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        except Exception:
            cfg = {}
        property_id = cfg.get("ga4_property_id")
        api_secret  = cfg.get("ga4_api_secret")
        if not property_id or not api_secret:
            return {"error": "GA4 credentials not configured"}
        url  = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
        body = json.dumps({
            "dateRanges":  [{"startDate": "7daysAgo", "endDate": "today"}],
            "metrics":     [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "screenPageViews"}],
            "dimensions":  [{"name": "date"}],
        }).encode()
        req = urllib.request.Request(
            url, data=body,
            headers={
                "x-goog-api-key": api_secret,
                "Content-Type":   "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            return {"ok": True, "report": data}
        except Exception as e:
            return {"error": str(e)}

    # ── Meeting Summary ────────────────────────────────────────────────────────

    @register(
        name="summarize_meeting",
        description="Summarize a meeting transcript and extract key decisions and action items.",
        params={
            "transcript": {"type": "string", "description": "Full meeting transcript text", "required": True},
        },
        package="business",
        permission="meeting.read",
    )
    async def _summarize_meeting(transcript: str):
        try:
            from api.state import get_agent
            agent = get_agent()
            result = await agent.llm.chat(
                messages=[{
                    "role": "user",
                    "content": f"Summarize this meeting transcript and extract action items:\n\n{transcript}",
                }],
                system=(
                    "You are a meeting summarizer. Extract: summary, key decisions, "
                    "action items with owners."
                ),
            )
            return {"ok": True, "summary": result}
        except Exception as e:
            return {"error": str(e)}

    # ── Invoice ───────────────────────────────────────────────────────────────

    @register(
        name="create_invoice",
        description="Generate a structured invoice from client name, line items and currency.",
        params={
            "client_name": {"type": "string", "description": "Client or company name", "required": True},
            "items":       {"type": "string", "description": 'JSON array of {description, qty, unit_price} e.g. [{"description":"Dev","qty":10,"unit_price":150}]', "required": True},
            "currency":    {"type": "string", "description": "Currency code (default: USD)"},
        },
        package="business",
        permission="invoice.write",
    )
    async def _create_invoice(client_name: str, items: str, currency: str = "USD"):
        import json, random
        from datetime import date
        try:
            line_items = json.loads(items) if isinstance(items, str) else items
        except Exception:
            return {"error": "items must be a valid JSON array"}

        parsed = []
        subtotal = 0.0
        for it in line_items:
            qty        = float(it.get("qty", 1))
            unit_price = float(it.get("unit_price", 0))
            line_total = round(qty * unit_price, 2)
            subtotal  += line_total
            parsed.append({
                "description": it.get("description", ""),
                "qty":         qty,
                "unit_price":  unit_price,
                "line_total":  line_total,
            })

        subtotal = round(subtotal, 2)
        return {
            "ok":             True,
            "invoice_number": str(random.randint(10000, 99999)),
            "date":           date.today().isoformat(),
            "client_name":    client_name,
            "currency":       currency,
            "items":          parsed,
            "subtotal":       subtotal,
            "total":          subtotal,
        }
