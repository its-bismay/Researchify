from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers import auth, integrations, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AI Research Agent Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
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


@app.get("/health")
async def health():
    return {"status": "ok"}
