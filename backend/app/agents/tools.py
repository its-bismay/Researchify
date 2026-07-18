import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

USER_AGENT = "ResearchPlatformBot/1.0"


async def web_search(query: str, num: int = 6) -> list[dict]:
    """Search the web via Google Custom Search (falls back to empty list)."""
    if not settings.image_search_api_key or not settings.image_search_cx:
        return []
    params = {
        "key": settings.image_search_api_key,
        "cx": settings.image_search_cx,
        "q": query,
        "num": min(num, 10),
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://www.googleapis.com/customsearch/v1", params=params
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        logger.warning("web_search failed: %s", exc)
        return []
    results = []
    for item in data.get("items", []):
        results.append(
            {
                "title": item.get("title"),
                "url": item.get("link"),
                "snippet": item.get("snippet"),
            }
        )
    return results


async def web_fetch(url: str, max_chars: int = 8000) -> str:
    """Fetch and return raw text content of a page (truncated)."""
    try:
        async with httpx.AsyncClient(
            timeout=20, follow_redirects=True, headers={"User-Agent": USER_AGENT}
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text[:max_chars]
    except httpx.HTTPError:
        return ""


async def image_search(query: str, num: int = 6) -> list[dict]:
    """Search images via Unsplash API."""
    if not settings.unsplash_access_key:
        return []
    params = {"query": query, "per_page": min(num, 20)}
    headers = {"Authorization": f"Client-ID {settings.unsplash_access_key}"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://api.unsplash.com/search/photos",
                params=params,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        logger.warning("image_search (Unsplash) failed: %s", exc)
        return []
    results = []
    for item in data.get("results", []):
        results.append(
            {
                "url": item.get("urls", {}).get("regular"),
                "thumbnail": item.get("urls", {}).get("thumb"),
                "caption": (
                    item.get("alt_description")
                    or item.get("description")
                    or ""
                ),
                "source_url": item.get("links", {}).get("html"),
            }
        )
    return results


async def youtube_search(query: str, num: int = 5) -> list[dict]:
    """Search YouTube videos via the Data API v3."""
    if not settings.youtube_api_key:
        return []
    params = {
        "key": settings.youtube_api_key,
        "q": query,
        "part": "snippet",
        "type": "video",
        "maxResults": min(num, 10),
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search", params=params
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        logger.warning("youtube_search failed: %s", exc)
        return []
    results = []
    for item in data.get("items", []):
        vid = item.get("id", {}).get("videoId")
        snippet = item.get("snippet", {})
        if not vid:
            continue
        results.append(
            {
                "title": snippet.get("title"),
                "url": f"https://www.youtube.com/watch?v={vid}",
                "thumbnail": snippet.get("thumbnails", {})
                .get("high", {})
                .get("url"),
                "channel": snippet.get("channelTitle"),
            }
        )
    return results
