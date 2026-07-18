import logging

import httpx
from sqlalchemy import select

from app.config import settings
from app.models import User

logger = logging.getLogger(__name__)

_offset: int = 0


async def poll_telegram_links(db_session_factory):
    """Poll Telegram for /start <token> messages (for local dev without webhooks)."""
    global _offset
    if not settings.telegram_bot_token:
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/getUpdates"
    params = {"timeout": 5}
    if _offset:
        params["offset"] = _offset

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return
            data = resp.json()
    except httpx.HTTPError:
        return

    for item in (data.get("result") or []):
        update_id = item.get("update_id", 0)
        _offset = update_id + 1

        msg = item.get("message") or {}
        text = msg.get("text", "")
        chat = msg.get("chat") or {}
        chat_id = chat.get("id")

        if not text.startswith("/start") or not chat_id:
            logger.debug("skipping non-/start update %s", update_id)
            continue

        parts = text.split(maxsplit=1)
        if len(parts) != 2:
            logger.debug("skipping /start without token (update %s)", update_id)
            continue

        token = parts[1].strip()
        async with db_session_factory() as db:
            result = await db.execute(
                select(User).where(User.telegram_link_token == token)
            )
            user = result.scalar_one_or_none()
            if user is not None:
                user.telegram_chat_id = str(chat_id)
                user.telegram_link_token = None
                await db.commit()
                logger.info(
                    "telegram linked for user %s (chat %s)", user.email, chat_id
                )
            else:
                logger.warning(
                    "no user found for telegram token %s... (update %s)",
                    token[:8],
                    update_id,
                )
