import secrets

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import IntegrationStatusOut, TelegramLinkOut
from app.security import get_current_user

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/status", response_model=IntegrationStatusOut)
async def integration_status(current_user: User = Depends(get_current_user)):
    return IntegrationStatusOut(
        telegram_connected=current_user.telegram_chat_id is not None,
        email=current_user.email,
    )


@router.post("/telegram/link", response_model=TelegramLinkOut)
async def telegram_link(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = secrets.token_urlsafe(24)
    current_user.telegram_link_token = token
    await db.commit()
    deep_link = f"https://t.me/{settings.telegram_bot_username}?start={token}"
    return TelegramLinkOut(deep_link=deep_link)


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    update = await request.json()
    message = update.get("message") or {}
    text = message.get("text", "")
    chat = message.get("chat") or {}
    chat_id = chat.get("id")

    if text.startswith("/start") and chat_id is not None:
        parts = text.split(maxsplit=1)
        if len(parts) == 2:
            token = parts[1].strip()
            result = await db.execute(
                select(User).where(User.telegram_link_token == token)
            )
            user = result.scalar_one_or_none()
            if user is not None:
                user.telegram_chat_id = str(chat_id)
                user.telegram_link_token = None
                await db.commit()

    return {"ok": True}


@router.delete("/telegram")
async def telegram_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.telegram_chat_id = None
    current_user.telegram_link_token = None
    await db.commit()
    return {"status": "disconnected"}
