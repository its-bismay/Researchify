from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers import auth, integrations, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AI Research Agent Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, settings.backend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,
    same_site="lax",
    https_only=settings.cookie_secure,
)

app.include_router(auth.router)
app.include_router(integrations.router)
app.include_router(projects.router)

# In production, serve the pre-built frontend from backend
_frontend_build = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_build.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_build), html=True), name="frontend")


@app.get("/health")
async def health():
    return {"status": "ok"}
