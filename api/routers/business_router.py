# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — Business Router"""
import json
import base64
import urllib.request
import urllib.parse
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(tags=["Business"])
_CFG = Path(__file__).parent.parent.parent / "config" / "settings.json"


def _cfg() -> dict:
    try:
        return json.loads(_CFG.read_text())
    except Exception:
        return {}


# ── Pydantic models ────────────────────────────────────────────────────────────

class SlackSendBody(BaseModel):
    channel: str
    text: str


class JiraIssueBody(BaseModel):
    project_key: str
    summary: str
    description: str = ""
    issue_type: str = "Task"


class LinearIssueBody(BaseModel):
    title: str
    description: str = ""


class AsanaTaskBody(BaseModel):
    name: str
    notes: str = ""


class HubSpotContactBody(BaseModel):
    firstname: str
    lastname: str = ""
    email: str


class InvoiceItem(BaseModel):
    description: str
    qty: float
    unit_price: float


class InvoiceBody(BaseModel):
    client_name: str
    items: List[InvoiceItem]
    currency: str = "USD"


# ── Slack ──────────────────────────────────────────────────────────────────────

@router.get("/api/slack/channels")
async def slack_channels():
    cfg   = _cfg()
    token = cfg.get("slack_token")
    if not token:
        return JSONResponse({"ok": False, "error": "slack_token not configured"})
    req = urllib.request.Request(
        "https://slack.com/api/conversations.list",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        if not data.get("ok"):
            return JSONResponse({"ok": False, "error": data.get("error", "Slack API error")})
        channels = [{"id": c["id"], "name": c["name"], "is_private": c.get("is_private", False)}
                    for c in data.get("channels", [])]
        return {"ok": True, "channels": channels}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


@router.get("/api/slack/channels/{channel_id}/messages")
async def slack_messages(channel_id: str, limit: int = 20):
    cfg   = _cfg()
    token = cfg.get("slack_token")
    if not token:
        return JSONResponse({"ok": False, "error": "slack_token not configured"})
    url = (
        f"https://slack.com/api/conversations.history"
        f"?channel={urllib.parse.quote(channel_id)}&limit={limit}"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        if not data.get("ok"):
            return JSONResponse({"ok": False, "error": data.get("error", "Slack API error")})
        messages = [{"ts": m.get("ts"), "user": m.get("user"), "text": m.get("text", "")}
                    for m in data.get("messages", [])]
        return {"ok": True, "channel_id": channel_id, "messages": messages}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


@router.post("/api/slack/send")
async def slack_send(body: SlackSendBody):
    cfg   = _cfg()
    token = cfg.get("slack_token")
    if not token:
        return JSONResponse({"ok": False, "error": "slack_token not configured"})
    payload = json.dumps({"channel": body.channel, "text": body.text}).encode()
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage", data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        if not data.get("ok"):
            return JSONResponse({"ok": False, "error": data.get("error", "Slack API error")})
        return {"ok": True, "ts": data.get("ts")}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


# ── Jira ───────────────────────────────────────────────────────────────────────

@router.get("/api/jira/issues")
async def jira_issues(jql: str = "project is not EMPTY ORDER BY created DESC", limit: int = 20):
    cfg      = _cfg()
    jira_url = cfg.get("jira_url")
    email    = cfg.get("jira_email")
    api_tok  = cfg.get("jira_api_token")
    if not jira_url or not email or not api_tok:
        return JSONResponse({"ok": False, "error": "jira_url / jira_email / jira_api_token not configured"})
    creds = base64.b64encode(f"{email}:{api_tok}".encode()).decode()
    url   = f"{jira_url.rstrip('/')}/rest/api/3/search?jql={urllib.parse.quote(jql)}&maxResults={limit}"
    req   = urllib.request.Request(url, headers={
        "Authorization": f"Basic {creds}",
        "Accept":        "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        issues = []
        for iss in data.get("issues", []):
            f = iss.get("fields", {})
            issues.append({
                "key":      iss.get("key"),
                "summary":  f.get("summary"),
                "status":   f.get("status", {}).get("name"),
                "assignee": (f.get("assignee") or {}).get("displayName"),
            })
        return {"ok": True, "total": data.get("total", 0), "issues": issues}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


@router.post("/api/jira/issues")
async def jira_create(body: JiraIssueBody):
    cfg      = _cfg()
    jira_url = cfg.get("jira_url")
    email    = cfg.get("jira_email")
    api_tok  = cfg.get("jira_api_token")
    if not jira_url or not email or not api_tok:
        return JSONResponse({"ok": False, "error": "jira_url / jira_email / jira_api_token not configured"})
    creds   = base64.b64encode(f"{email}:{api_tok}".encode()).decode()
    url     = f"{jira_url.rstrip('/')}/rest/api/3/issue"
    payload = json.dumps({
        "fields": {
            "project":     {"key": body.project_key},
            "summary":     body.summary,
            "issuetype":   {"name": body.issue_type},
            "description": {
                "type":    "doc",
                "version": 1,
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": body.description}]}],
            },
        }
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Authorization": f"Basic {creds}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        return {"ok": True, "key": data.get("key"), "id": data.get("id")}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


# ── Linear ─────────────────────────────────────────────────────────────────────

@router.get("/api/linear/issues")
async def linear_issues(limit: int = 20):
    cfg     = _cfg()
    api_key = cfg.get("linear_api_key")
    if not api_key:
        return JSONResponse({"ok": False, "error": "linear_api_key not configured"})
    query   = f'{{ issues(first: {limit}) {{ nodes {{ id title state {{ name }} assignee {{ name }} }} }} }}'
    payload = json.dumps({"query": query}).encode()
    req     = urllib.request.Request(
        "https://api.linear.app/graphql", data=payload,
        headers={
            "Authorization": api_key,
            "Content-Type":  "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        if "errors" in data:
            return JSONResponse({"ok": False, "error": data["errors"][0].get("message", "Linear error")})
        nodes  = data.get("data", {}).get("issues", {}).get("nodes", [])
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
        return JSONResponse({"ok": False, "error": str(e)})


@router.post("/api/linear/issues")
async def linear_create(body: LinearIssueBody):
    cfg     = _cfg()
    api_key = cfg.get("linear_api_key")
    if not api_key:
        return JSONResponse({"ok": False, "error": "linear_api_key not configured"})
    safe_title = body.title.replace('"', '\\"')
    safe_desc  = body.description.replace('"', '\\"')
    mutation   = (
        f'mutation {{ issueCreate(input: {{ title: "{safe_title}", '
        f'description: "{safe_desc}" }}) {{ success issue {{ id title }} }} }}'
    )
    payload = json.dumps({"query": mutation}).encode()
    req     = urllib.request.Request(
        "https://api.linear.app/graphql", data=payload,
        headers={
            "Authorization": api_key,
            "Content-Type":  "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        if "errors" in data:
            return JSONResponse({"ok": False, "error": data["errors"][0].get("message", "Linear error")})
        result = data.get("data", {}).get("issueCreate", {})
        return {"ok": result.get("success", False), "issue": result.get("issue")}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


# ── Asana ──────────────────────────────────────────────────────────────────────

@router.get("/api/asana/tasks")
async def asana_tasks():
    cfg       = _cfg()
    token     = cfg.get("asana_token")
    workspace = cfg.get("asana_workspace")
    if not token:
        return JSONResponse({"ok": False, "error": "asana_token not configured"})
    if not workspace:
        return JSONResponse({"ok": False, "error": "asana_workspace not configured"})
    params = urllib.parse.urlencode({
        "workspace":  workspace,
        "assignee":   "me",
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
        return JSONResponse({"ok": False, "error": str(e)})


@router.post("/api/asana/tasks")
async def asana_create(body: AsanaTaskBody):
    cfg       = _cfg()
    token     = cfg.get("asana_token")
    workspace = cfg.get("asana_workspace")
    if not token:
        return JSONResponse({"ok": False, "error": "asana_token not configured"})
    if not workspace:
        return JSONResponse({"ok": False, "error": "asana_workspace not configured"})
    payload = json.dumps({"data": {"name": body.name, "workspace": workspace, "notes": body.notes}}).encode()
    req     = urllib.request.Request(
        "https://app.asana.com/api/1.0/tasks", data=payload,
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
        return JSONResponse({"ok": False, "error": str(e)})


# ── HubSpot ────────────────────────────────────────────────────────────────────

@router.get("/api/hubspot/contacts")
async def hubspot_contacts(limit: int = 20):
    cfg   = _cfg()
    token = cfg.get("hubspot_token")
    if not token:
        return JSONResponse({"ok": False, "error": "hubspot_token not configured"})
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
        return JSONResponse({"ok": False, "error": str(e)})


@router.post("/api/hubspot/contacts")
async def hubspot_create(body: HubSpotContactBody):
    cfg   = _cfg()
    token = cfg.get("hubspot_token")
    if not token:
        return JSONResponse({"ok": False, "error": "hubspot_token not configured"})
    payload = json.dumps({"properties": {
        "firstname": body.firstname,
        "lastname":  body.lastname,
        "email":     body.email,
    }}).encode()
    req = urllib.request.Request(
        "https://api.hubapi.com/crm/v3/objects/contacts", data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        return {"ok": True, "id": data.get("id"), "email": body.email}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


# ── Analytics ──────────────────────────────────────────────────────────────────

@router.get("/api/analytics/report")
async def analytics_report(days: int = 7):
    cfg         = _cfg()
    property_id = cfg.get("ga4_property_id")
    api_secret  = cfg.get("ga4_api_secret")
    if not property_id or not api_secret:
        return JSONResponse({"ok": False, "error": "GA4 credentials not configured"})
    url     = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    payload = json.dumps({
        "dateRanges":  [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "metrics":     [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "screenPageViews"}],
        "dimensions":  [{"name": "date"}],
    }).encode()
    req = urllib.request.Request(
        url, data=payload,
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
        return JSONResponse({"ok": False, "error": str(e)})


# ── Invoice ────────────────────────────────────────────────────────────────────

@router.post("/api/invoice/generate")
async def invoice_generate(body: InvoiceBody):
    import random
    from datetime import date

    parsed   = []
    subtotal = 0.0
    for it in body.items:
        line_total  = round(it.qty * it.unit_price, 2)
        subtotal   += line_total
        parsed.append({
            "description": it.description,
            "qty":         it.qty,
            "unit_price":  it.unit_price,
            "line_total":  line_total,
        })

    subtotal = round(subtotal, 2)
    return {
        "ok":             True,
        "invoice_number": str(random.randint(10000, 99999)),
        "date":           date.today().isoformat(),
        "client_name":    body.client_name,
        "currency":       body.currency,
        "items":          parsed,
        "subtotal":       subtotal,
        "total":          subtotal,
    }
