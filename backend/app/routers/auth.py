from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import UserOut
from app.security import (
    clear_auth_cookies,
    create_access_token,
    decode_token,
    get_current_user,
    set_auth_cookies,
)

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{settings.backend_url}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(status_code=400, detail="OAuth authorization failed")

    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    google_id = userinfo["sub"]
    email = userinfo["email"]
    name = userinfo.get("name", email)
    avatar_url = userinfo.get("picture")

    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
        )
        db.add(user)
    else:
        user.email = email
        user.name = name
        user.avatar_url = avatar_url

    await db.commit()
    await db.refresh(user)

    response = RedirectResponse(url=f"{settings.frontend_url}/dashboard")
    set_auth_cookies(response, user.id)
    return response


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh")
async def refresh(request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    user_id = decode_token(refresh_token, "refresh")
    response = RedirectResponse(url=f"{settings.frontend_url}/dashboard")
    access = create_access_token(user_id)
    response.set_cookie(
        "access_token",
        access,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="none" if settings.cookie_secure else "lax",
        domain=settings.cookie_domain,
        max_age=settings.access_token_expire_minutes * 60,
    )
    return response


@router.post("/logout")
async def logout():
    from fastapi.responses import JSONResponse

    response = JSONResponse({"status": "logged_out"})
    clear_auth_cookies(response)
    return response
