# SPDX-License-Identifier: Elastic-2.0
# Copyright (c) 2026 Cabir Pekdemir. All rights reserved.
# Licensed under the Elastic License 2.0 — see LICENSE for details.

"""
OZY2 — SOCIAL Tier Skills
Package: social

Includes: social_media, discord, spotify, music_id,
          whatsapp, youtube, debate, email_monitor
"""
from core.tools import register


def register_all():

    # ── Social Media ──────────────────────────────────────────────────────────
    @register(
        name="draft_social_post",
        description=(
            "Draft a social media post optimised for a specific platform. "
            "Use for: 'write a tweet about X', 'Instagram post for Y', 'LinkedIn update', 'social media content'."
        ),
        params={
            "topic":    {"type": "string", "description": "What to post about",   "required": True},
            "platform": {"type": "string", "description": "twitter | instagram | linkedin | facebook (default: twitter)"},
            "tone":     {"type": "string", "description": "casual | professional | funny | inspiring (default: casual)"},
            "hashtags": {"type": "boolean","description": "Include hashtags (default true)"},
            "count":    {"type": "integer","description": "Number of variants to generate (default 3)"},
        },
        package="social",
    )
    async def _draft_post(topic: str, platform: str = "twitter", tone: str = "casual",
                          hashtags: bool = True, count: int = 3):
        limits = {"twitter": 280, "instagram": 2200, "linkedin": 3000, "facebook": 500}
        char_limit = limits.get(platform, 280)
        ht_note = " Include relevant hashtags." if hashtags else " No hashtags."
        prompt = (f"Write {count} {platform.capitalize()} post variants about: {topic}\n"
                  f"Tone: {tone}. Max {char_limit} chars each.{ht_note}\n"
                  f"Format: numbered list.")
        return {
            "platform": platform, "topic": topic, "tone": tone,
            "char_limit": char_limit,
            "prompt": prompt,
            "instruction": "Feed this prompt to LLM to generate the posts."
        }

    @register(
        name="post_social",
        description=(
            "Post content to social media platforms via connected accounts. "
            "Requires API credentials in settings."
        ),
        params={
            "platform": {"type": "string", "description": "twitter | instagram | linkedin", "required": True},
            "content":  {"type": "string", "description": "Post text",                      "required": True},
            "image_url":{"type": "string", "description": "Optional image URL to attach"},
        },
        package="social",
    )
    async def _post(platform: str, content: str, image_url: str = ""):
        import json
        from pathlib import Path
        cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())

        if platform == "twitter":
            token = cfg.get("twitter_bearer_token", "") or cfg.get("twitter_api_key", "")
            if not token:
                return {"error": "twitter_bearer_token not set in settings.json"}
            # Placeholder — real Twitter v2 requires OAuth 2.0 PKCE
            return {"ok": False, "note": "Twitter posting requires OAuth flow. Draft ready.",
                    "draft": content, "char_count": len(content)}

        return {"error": f"Direct posting for '{platform}' not yet configured",
                "draft": content, "tip": "Set API credentials in config/settings.json"}

    # ── Discord ───────────────────────────────────────────────────────────────
    @register(
        name="send_discord",
        description="Send a message to a Discord channel via webhook.",
        params={
            "message":      {"type": "string", "description": "Message to send",     "required": True},
            "webhook_name": {"type": "string", "description": "Webhook name from settings (default: default)"},
            "username":     {"type": "string", "description": "Bot display name (optional)"},
        },
        package="social",
    )
    async def _discord_send(message: str, webhook_name: str = "default", username: str = "OZY2"):
        import urllib.request, urllib.parse, json
        from pathlib import Path
        cfg     = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        webhooks = cfg.get("discord_webhooks", {})
        url     = webhooks.get(webhook_name, cfg.get("discord_webhook_url", ""))
        if not url:
            return {"error": "discord_webhook_url not set in config/settings.json"}
        payload = json.dumps({"content": message, "username": username}).encode()
        req     = urllib.request.Request(url, data=payload,
                                         headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return {"ok": True, "status": r.status, "channel": webhook_name}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="list_discord_channels",
        description="List channels in a Discord server (requires bot token).",
        params={
            "guild_id": {"type": "string", "description": "Discord server (guild) ID", "required": True},
        },
        package="social",
    )
    async def _discord_channels(guild_id: str):
        import urllib.request, json
        from pathlib import Path
        cfg   = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        token = cfg.get("discord_bot_token", "")
        if not token:
            return {"error": "discord_bot_token not set in settings.json"}
        url = f"https://discord.com/api/v10/guilds/{guild_id}/channels"
        req = urllib.request.Request(url, headers={"Authorization": f"Bot {token}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                channels = json.loads(r.read())
            return {"ok": True, "channels": [{"id": c["id"], "name": c["name"],
                                               "type": c["type"]} for c in channels]}
        except Exception as e:
            return {"error": str(e)}

    # ── Spotify ───────────────────────────────────────────────────────────────
    @register(
        name="search_spotify",
        description=(
            "Search Spotify for tracks, albums or artists. "
            "Use for: 'find X on Spotify', 'play music by Y', 'what album is Z on'."
        ),
        params={
            "query": {"type": "string", "description": "Search query",  "required": True},
            "type":  {"type": "string", "description": "track | album | artist | playlist (default: track)"},
            "limit": {"type": "integer","description": "Results (default 8)"},
        },
        package="social",
    )
    async def _spotify_search(query: str, type: str = "track", limit: int = 8):
        import urllib.request, urllib.parse, json, base64
        from pathlib import Path
        cfg          = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        client_id    = cfg.get("spotify_client_id", "")
        client_secret= cfg.get("spotify_client_secret", "")
        if not client_id or not client_secret:
            return {"error": "spotify_client_id / spotify_client_secret not set in settings.json"}
        # Get access token
        creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        tok_req = urllib.request.Request(
            "https://accounts.spotify.com/api/token",
            data=b"grant_type=client_credentials",
            headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"}
        )
        with urllib.request.urlopen(tok_req, timeout=8) as r:
            tok = json.loads(r.read())["access_token"]
        # Search
        url = f"https://api.spotify.com/v1/search?q={urllib.parse.quote(query)}&type={type}&limit={limit}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            key     = f"{type}s"
            items   = data.get(key, {}).get("items", [])
            results = []
            for it in items:
                name    = it.get("name", "")
                artists = ", ".join(a["name"] for a in it.get("artists", []))
                results.append({
                    "name":    name,
                    "artists": artists,
                    "url":     it.get("external_urls", {}).get("spotify", ""),
                    "preview": it.get("preview_url", ""),
                })
            return {"ok": True, "query": query, "type": type, "results": results}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="get_spotify_now_playing",
        description="Get the track currently playing on Spotify.",
        params={},
        package="social",
    )
    async def _spotify_now():
        import urllib.request, json
        from pathlib import Path
        cfg   = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        token = cfg.get("spotify_access_token", "")
        if not token:
            return {"error": "spotify_access_token not set. Requires OAuth login flow."}
        req = urllib.request.Request(
            "https://api.spotify.com/v1/me/player/currently-playing",
            headers={"Authorization": f"Bearer {token}"}
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                if r.status == 204:
                    return {"playing": False, "message": "Nothing playing"}
                data = json.loads(r.read())
            item = data.get("item", {})
            return {
                "playing":  data.get("is_playing"),
                "track":    item.get("name"),
                "artists":  ", ".join(a["name"] for a in item.get("artists", [])),
                "album":    item.get("album", {}).get("name"),
                "progress": f"{data.get('progress_ms', 0) // 1000}s",
                "url":      item.get("external_urls", {}).get("spotify", ""),
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Music ID / Lyrics ──────────────────────────────────────────────────────
    @register(
        name="get_lyrics",
        description=(
            "Get lyrics for a song. "
            "Use for: 'lyrics of X by Y', 'what are the words to Z', 'song lyrics'."
        ),
        params={
            "song":   {"type": "string", "description": "Song title",  "required": True},
            "artist": {"type": "string", "description": "Artist name"},
        },
        package="social",
    )
    async def _lyrics(song: str, artist: str = ""):
        import urllib.request, urllib.parse, json
        query = f"{artist} {song}".strip()
        url   = f"https://lyrist.vercel.app/api/{urllib.parse.quote(song)}/{urllib.parse.quote(artist)}" if artist else f"https://lyrist.vercel.app/api/{urllib.parse.quote(song)}"
        req   = urllib.request.Request(url, headers={"User-Agent": "OZY2"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if data.get("lyrics"):
                return {"ok": True, "song": data.get("title", song),
                        "artist": data.get("artist", artist), "lyrics": data["lyrics"]}
            return {"ok": False, "error": "Lyrics not found", "query": query}
        except Exception:
            return {
                "ok": False,
                "tip": f"Search for '{query} lyrics' on the web for best results."
            }

    # ── WhatsApp ──────────────────────────────────────────────────────────────
    @register(
        name="send_whatsapp",
        description=(
            "Send a WhatsApp message. "
            "Use for: 'WhatsApp X that...', 'send a WhatsApp to Y', 'message Z on WhatsApp'."
        ),
        params={
            "to":      {"type": "string", "description": "Phone number with country code (+1234567890)", "required": True},
            "message": {"type": "string", "description": "Message text", "required": True},
        },
        package="social",
    )
    async def _send_wa(to: str, message: str):
        import json
        from pathlib import Path
        cfg     = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        wa_type = cfg.get("whatsapp_provider", "")

        if wa_type == "twilio":
            import urllib.request, urllib.parse, base64
            account_sid = cfg.get("twilio_account_sid", "")
            auth_token  = cfg.get("twilio_auth_token", "")
            from_number = cfg.get("twilio_whatsapp_number", "")
            if not all([account_sid, auth_token, from_number]):
                return {"error": "Twilio credentials not set in settings.json"}
            url  = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            data = urllib.parse.urlencode({
                "From": f"whatsapp:{from_number}", "To": f"whatsapp:{to}", "Body": message
            }).encode()
            creds = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
            req   = urllib.request.Request(url, data=data,
                                           headers={"Authorization": f"Basic {creds}"})
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    resp = json.loads(r.read())
                return {"ok": True, "sid": resp.get("sid"), "to": to}
            except Exception as e:
                return {"error": str(e)}

        # macOS fallback via AppleScript
        import sys, subprocess
        if sys.platform == "darwin":
            script = f'''
tell application "WhatsApp"
    activate
end tell
'''
            subprocess.Popen(["osascript", "-e", script])
            return {"ok": False, "note": f"WhatsApp opened. Manually send to {to}: {message}",
                    "tip": "Set twilio credentials in settings.json for automatic sending."}
        return {"error": "whatsapp_provider not configured in settings.json"}

    # ── YouTube ───────────────────────────────────────────────────────────────
    @register(
        name="search_youtube",
        description=(
            "Search YouTube videos. "
            "Use for: 'find YouTube videos about X', 'YouTube tutorial on Y', 'search YouTube'."
        ),
        params={
            "query": {"type": "string", "description": "Search query", "required": True},
            "limit": {"type": "integer","description": "Max results (default 8)"},
        },
        package="social",
    )
    async def _yt_search(query: str, limit: int = 8):
        import urllib.request, urllib.parse, json
        from pathlib import Path
        cfg = json.loads((Path(__file__).parent.parent / "config" / "settings.json").read_text())
        key = cfg.get("youtube_api_key", "")
        if not key:
            # Fallback: DuckDuckGo news search on YouTube
            try:
                try:
                    from ddgs import DDGS
                except ImportError:
                    from duckduckgo_search import DDGS
                results = []
                with DDGS() as ddgs:
                    for r in ddgs.text(f"site:youtube.com {query}", max_results=limit):
                        results.append({"title": r["title"], "url": r["href"], "snippet": r["body"]})
                return {"ok": True, "query": query, "results": results, "source": "ddg_fallback"}
            except Exception as e:
                return {"error": "youtube_api_key not set and fallback failed: " + str(e)}

        url = (f"https://www.googleapis.com/youtube/v3/search"
               f"?part=snippet&q={urllib.parse.quote(query)}&maxResults={limit}"
               f"&type=video&key={key}")
        try:
            with urllib.request.urlopen(url, timeout=10) as r:
                data = json.loads(r.read())
            results = []
            for item in data.get("items", []):
                vid_id = item["id"]["videoId"]
                snip   = item["snippet"]
                results.append({
                    "title":     snip["title"],
                    "channel":   snip["channelTitle"],
                    "published": snip["publishedAt"][:10],
                    "url":       f"https://www.youtube.com/watch?v={vid_id}",
                    "thumbnail": snip.get("thumbnails", {}).get("medium", {}).get("url", ""),
                })
            return {"ok": True, "query": query, "results": results}
        except Exception as e:
            return {"error": str(e)}

    @register(
        name="get_youtube_transcript",
        description="Get the transcript / captions of a YouTube video.",
        params={
            "url_or_id": {"type": "string", "description": "YouTube URL or video ID", "required": True},
            "language":  {"type": "string", "description": "Language code (default: en)"},
        },
        package="social",
    )
    async def _yt_transcript(url_or_id: str, language: str = "en"):
        import re
        video_id = url_or_id
        m = re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_\-]{11})", url_or_id)
        if m:
            video_id = m.group(1)
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[language, "en"])
            text = " ".join(t["text"] for t in transcript)
            return {"ok": True, "video_id": video_id, "language": language,
                    "transcript": text, "word_count": len(text.split())}
        except ImportError:
            return {"error": "youtube-transcript-api not installed. Run: pip install youtube-transcript-api"}
        except Exception as e:
            return {"error": str(e), "video_id": video_id}

    # ── Debate Mode ───────────────────────────────────────────────────────────
    @register(
        name="start_debate",
        description=(
            "Start a structured multi-perspective debate on any topic. "
            "Use for: 'debate X', 'pros and cons of Y', 'argue both sides of Z', 'devil's advocate'."
        ),
        params={
            "topic":  {"type": "string", "description": "Debate topic",          "required": True},
            "sides":  {"type": "integer","description": "Number of sides (2-4, default 2)"},
            "rounds": {"type": "integer","description": "Debate rounds (default 2)"},
            "style":  {"type": "string", "description": "academic | casual | socratic (default: academic)"},
        },
        package="social",
    )
    async def _debate(topic: str, sides: int = 2, rounds: int = 2, style: str = "academic"):
        sides  = max(2, min(sides, 4))
        rounds = max(1, min(rounds, 4))
        labels = ["Position A", "Position B", "Position C", "Position D"][:sides]
        round_fmt = "".join(f"[{l}]: <argument>\n" for l in labels)
        prompt = (
            f"Conduct a {style} debate on: '{topic}'\n"
            f"Participants: {', '.join(labels)}\n"
            f"Rounds: {rounds}\n\n"
            f"Format each round as:\n"
            f"{round_fmt}\n"
            f"End with a balanced summary of key points from all sides."
        )
        return {
            "topic": topic, "sides": sides, "rounds": rounds, "style": style,
            "prompt": prompt,
            "instruction": "Feed this prompt to LLM to run the debate."
        }

    # ── Email Monitor ─────────────────────────────────────────────────────────
    @register(
        name="monitor_emails",
        description=(
            "Set up an email watch for keywords or senders. "
            "Use for: 'alert me when I get email from X', 'notify me if Y email arrives', 'watch inbox for Z'."
        ),
        params={
            "keywords": {"type": "string", "description": "Keywords to watch (comma-separated)"},
            "from_addr":{"type": "string", "description": "Sender email to watch"},
            "action":   {"type": "string", "description": "notify | summarize | forward (default: notify)"},
        },
        package="social",
    )
    async def _email_monitor(keywords: str = "", from_addr: str = "", action: str = "notify"):
        import json
        from pathlib import Path
        from datetime import datetime
        if not keywords and not from_addr:
            return {"error": "Provide keywords or from_addr to watch"}
        watches_file = Path(__file__).parent.parent / "data" / "email_watches.json"
        watches_file.parent.mkdir(exist_ok=True)
        watches = json.loads(watches_file.read_text()) if watches_file.exists() else []
        watch   = {
            "id":        len(watches) + 1,
            "keywords":  [k.strip() for k in keywords.split(",") if k.strip()],
            "from_addr": from_addr,
            "action":    action,
            "created":   datetime.now().isoformat(),
            "active":    True,
        }
        watches.append(watch)
        watches_file.write_text(json.dumps(watches, indent=2))
        return {
            "ok": True, "watch_id": watch["id"],
            "watching": {"keywords": watch["keywords"], "from": from_addr, "action": action},
            "note": "Email watch saved. The scheduler will check Gmail periodically."
        }

    # ── Telegram ──────────────────────────────────────────────────────────────
    @register(
        name="send_telegram",
        description=(
            "Send a Telegram message to the configured chat. "
            "Use for: 'telegram at gönder', 'send telegram message', "
            "'telegram ile bildir', 'notify me on telegram'."
        ),
        params={
            "message": {"type": "string", "description": "Message to send", "required": True},
        },
        package="social",
    )
    async def _send_telegram(message: str):
        from integrations.telegram import send_message
        ok = await send_message(message)
        if ok:
            return {"ok": True, "sent": message}
        return {"ok": False, "error": "Message not delivered — check Telegram token and chat ID in Settings"}

    @register(
        name="get_telegram_messages",
        description=(
            "Read recent messages received on the Telegram bot. "
            "Use for: 'telegram mesajlarım', 'show telegram messages', 'check telegram'."
        ),
        params={
            "limit": {"type": "integer", "description": "Number of messages to fetch (default 10)"},
        },
        package="social",
    )
    async def _get_telegram_messages(limit: int = 10):
        from integrations.telegram import get_updates
        messages = await get_updates(limit=limit)
        if not messages:
            return {"ok": True, "messages": [], "note": "No new messages from Telegram bot"}
        return {"ok": True, "count": len(messages), "messages": messages}

    @register(
        name="list_email_watches",
        description="List active email monitors.",
        params={},
        package="social",
    )
    async def _list_watches():
        import json
        from pathlib import Path
        f = Path(__file__).parent.parent / "data" / "email_watches.json"
        if not f.exists():
            return {"watches": [], "hint": "No active watches. Use monitor_emails to set one."}
        watches = [w for w in json.loads(f.read_text()) if w.get("active")]
        return {"ok": True, "active_watches": len(watches), "watches": watches}
