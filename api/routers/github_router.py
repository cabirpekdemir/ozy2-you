# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""OZY2 — GitHub Router (repos, issues, PRs, commits via REST API v3)"""
import json
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/api/github", tags=["GitHub"])

_CONFIG = Path(__file__).parent.parent.parent / "config" / "settings.json"
_GH_API = "https://api.github.com"


def _token() -> str:
    try:
        return json.loads(_CONFIG.read_text()).get("github_token", "")
    except Exception:
        return ""


def _headers() -> dict:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    t = _token()
    if t:
        h["Authorization"] = f"Bearer {t}"
    return h


async def _gh_get(path: str, params: Optional[dict] = None) -> list | dict:
    async with httpx.AsyncClient(timeout=12) as client:
        r = await client.get(
            f"{_GH_API}{path}",
            headers=_headers(),
            params=params or {},
        )
        r.raise_for_status()
        return r.json()


# ── User ──────────────────────────────────────────────────────────────────────

@router.get("/user")
async def github_user():
    if not _token():
        return {"ok": False, "error": "github_token not configured in Settings"}
    try:
        d = await _gh_get("/user")
        return {"ok": True, "user": {
            "login":        d.get("login"),
            "name":         d.get("name"),
            "avatar_url":   d.get("avatar_url"),
            "bio":          d.get("bio"),
            "public_repos": d.get("public_repos", 0),
            "followers":    d.get("followers", 0),
            "following":    d.get("following", 0),
            "html_url":     d.get("html_url"),
        }}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Repos ─────────────────────────────────────────────────────────────────────

@router.get("/repos")
async def github_repos(sort: str = "pushed", per_page: int = 50):
    if not _token():
        return {"ok": False, "error": "github_token not configured in Settings"}
    try:
        data = await _gh_get("/user/repos", {
            "sort": sort,
            "per_page": per_page,
            "affiliation": "owner",
        })
        repos = [{
            "id":             r.get("id"),
            "name":           r.get("name"),
            "full_name":      r.get("full_name"),
            "description":    r.get("description") or "",
            "private":        r.get("private"),
            "stars":          r.get("stargazers_count", 0),
            "forks":          r.get("forks_count", 0),
            "language":       r.get("language") or "",
            "updated_at":     (r.get("pushed_at") or r.get("updated_at") or "")[:10],
            "html_url":       r.get("html_url"),
            "open_issues":    r.get("open_issues_count", 0),
            "default_branch": r.get("default_branch", "main"),
        } for r in data]
        return {"ok": True, "repos": repos}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Issues ────────────────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/issues")
async def github_issues(owner: str, repo: str, state: str = "open", per_page: int = 30):
    if not _token():
        return {"ok": False, "error": "github_token not configured"}
    try:
        data = await _gh_get(f"/repos/{owner}/{repo}/issues", {
            "state": state,
            "per_page": per_page,
        })
        # GitHub issues endpoint also returns PRs — filter them out
        issues = [{
            "number":   i.get("number"),
            "title":    i.get("title"),
            "state":    i.get("state"),
            "created_at": (i.get("created_at") or "")[:10],
            "user":     i.get("user", {}).get("login", ""),
            "labels":   [lb.get("name") for lb in i.get("labels", [])],
            "comments": i.get("comments", 0),
            "html_url": i.get("html_url"),
        } for i in data if "pull_request" not in i]
        return {"ok": True, "issues": issues}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Pull Requests ─────────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/pulls")
async def github_pulls(owner: str, repo: str, state: str = "open", per_page: int = 30):
    if not _token():
        return {"ok": False, "error": "github_token not configured"}
    try:
        data = await _gh_get(f"/repos/{owner}/{repo}/pulls", {
            "state": state,
            "per_page": per_page,
        })
        pulls = [{
            "number":     p.get("number"),
            "title":      p.get("title"),
            "state":      p.get("state"),
            "created_at": (p.get("created_at") or "")[:10],
            "user":       p.get("user", {}).get("login", ""),
            "head":       p.get("head", {}).get("ref", ""),
            "base":       p.get("base", {}).get("ref", ""),
            "draft":      p.get("draft", False),
            "html_url":   p.get("html_url"),
        } for p in data]
        return {"ok": True, "pulls": pulls}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Commits ───────────────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/commits")
async def github_commits(owner: str, repo: str, per_page: int = 20):
    if not _token():
        return {"ok": False, "error": "github_token not configured"}
    try:
        data = await _gh_get(f"/repos/{owner}/{repo}/commits", {"per_page": per_page})
        commits = [{
            "sha":      c.get("sha", "")[:7],
            "message":  (c.get("commit", {}).get("message") or "").split("\n")[0],
            "author":   c.get("commit", {}).get("author", {}).get("name", ""),
            "date":     (c.get("commit", {}).get("author", {}).get("date") or "")[:10],
            "html_url": c.get("html_url"),
        } for c in data]
        return {"ok": True, "commits": commits}
    except Exception as e:
        return {"ok": False, "error": str(e)}
