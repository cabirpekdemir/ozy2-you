"""OZY2 — YouTube Router (channel following via RSS, no API key needed)"""
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])

DATA_DIR = Path.home() / ".ozy2"
CHANNELS_FILE = DATA_DIR / "youtube_channels.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)

RSS_BASE = "https://www.youtube.com/feeds/videos.xml"
YT_BASE  = "https://www.youtube.com"

NS = {
    "atom":   "http://www.w3.org/2005/Atom",
    "media":  "http://search.yahoo.com/mrss/",
    "yt":     "http://www.youtube.com/xml/schemas/2015",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_channels() -> list[dict]:
    if CHANNELS_FILE.exists():
        return json.loads(CHANNELS_FILE.read_text())
    return []


def _save_channels(channels: list[dict]):
    CHANNELS_FILE.write_text(json.dumps(channels, indent=2, ensure_ascii=False))


async def _fetch_rss(channel_id: str) -> list[dict]:
    url = f"{RSS_BASE}?channel_id={channel_id}"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, headers={"User-Agent": "OZY2/2.0"})
        r.raise_for_status()

    root = ET.fromstring(r.text)
    videos = []
    for entry in root.findall("atom:entry", NS)[:10]:
        vid_id = entry.findtext("yt:videoId", namespaces=NS, default="")
        title  = entry.findtext("atom:title", namespaces=NS, default="")
        pub    = entry.findtext("atom:published", namespaces=NS, default="")
        thumb_el = entry.find("media:group/media:thumbnail", NS)
        thumb  = thumb_el.get("url", "") if thumb_el is not None else ""
        views_el = entry.find("media:group/media:community/media:statistics", NS)
        views  = views_el.get("views", "0") if views_el is not None else "0"
        desc_el  = entry.find("media:group/media:description", NS)
        desc   = (desc_el.text or "")[:200] if desc_el is not None else ""

        videos.append({
            "id":          vid_id,
            "title":       title,
            "published":   pub[:10],
            "url":         f"https://www.youtube.com/watch?v={vid_id}",
            "thumbnail":   thumb,
            "views":       views,
            "description": desc,
        })
    return videos


async def _resolve_channel_id(url_or_name: str) -> Optional[dict]:
    """Try to resolve a YouTube channel URL/handle to channel_id + name."""
    url_or_name = url_or_name.strip()

    # Already a raw channel ID (UCxxxxxxxx)
    if url_or_name.startswith("UC") and len(url_or_name) == 24:
        return {"channel_id": url_or_name, "name": url_or_name, "handle": ""}

    # Extract from URL
    for prefix in ["youtube.com/channel/", "youtube.com/c/", "youtube.com/@"]:
        if prefix in url_or_name:
            slug = url_or_name.split(prefix)[-1].split("/")[0].split("?")[0]
            if prefix == "youtube.com/channel/" and slug.startswith("UC"):
                return {"channel_id": slug, "name": slug, "handle": ""}
            url_or_name = slug
            break

    # Fetch the channel page to get canonical channel_id
    handle = url_or_name.lstrip("@")
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            page_url = f"https://www.youtube.com/@{handle}"
            r = await client.get(page_url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                              "AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
            })
            html = r.text
            # Extract channel_id from HTML
            import re
            m = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]{22})"', html)
            if not m:
                m = re.search(r'channel/(UC[a-zA-Z0-9_-]{22})', html)
            if m:
                ch_id = m.group(1)
                # Extract channel name
                nm = re.search(r'"vanityUrl":"@([^"]+)"', html)
                name_m = re.search(r'"title":"([^"]+)","description"', html)
                name = name_m.group(1) if name_m else handle
                h = nm.group(1) if nm else handle
                return {"channel_id": ch_id, "name": name, "handle": f"@{h}"}
    except Exception:
        pass

    return None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/channels")
async def list_channels():
    return {"ok": True, "channels": _load_channels()}


class FollowRequest(BaseModel):
    url: str  # channel URL, handle (@name), or UC... ID


@router.post("/channels/follow")
async def follow_channel(req: FollowRequest):
    info = await _resolve_channel_id(req.url)
    if not info:
        return {"ok": False, "error": "Could not resolve channel. Try using the full YouTube URL."}

    channels = _load_channels()
    if any(c["channel_id"] == info["channel_id"] for c in channels):
        return {"ok": False, "error": "Already following this channel"}

    channels.append({
        "channel_id": info["channel_id"],
        "name":       info["name"],
        "handle":     info["handle"],
        "url":        f"https://www.youtube.com/channel/{info['channel_id']}",
    })
    _save_channels(channels)
    return {"ok": True, "channel": channels[-1]}


@router.delete("/channels/{channel_id}")
async def unfollow_channel(channel_id: str):
    channels = [c for c in _load_channels() if c["channel_id"] != channel_id]
    _save_channels(channels)
    return {"ok": True}


@router.get("/feed")
async def get_feed(limit: int = 20):
    """Latest videos from all followed channels, merged and sorted by date."""
    channels = _load_channels()
    if not channels:
        return {"ok": True, "videos": [], "message": "No channels followed yet."}

    all_videos = []
    async with httpx.AsyncClient(timeout=10) as _:
        for ch in channels:
            try:
                videos = await _fetch_rss(ch["channel_id"])
                for v in videos:
                    v["channel_name"] = ch["name"]
                    v["channel_id"]   = ch["channel_id"]
                all_videos.extend(videos)
            except Exception:
                pass

    all_videos.sort(key=lambda v: v.get("published", ""), reverse=True)
    return {"ok": True, "videos": all_videos[:limit]}


@router.get("/channels/{channel_id}/videos")
async def get_channel_videos(channel_id: str):
    try:
        videos = await _fetch_rss(channel_id)
        return {"ok": True, "videos": videos}
    except Exception as e:
        return {"ok": False, "error": str(e), "videos": []}
