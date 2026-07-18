import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers import auth, integrations, projects

_worker_task: asyncio.Task | None = None


async def _run_worker_background():
    """Background worker — polls jobs table and runs research pipeline."""
    import logging

    from app.db import AsyncSessionLocal
    from app.pipeline import run_research_pipeline
    from app.queue import (
        fetch_next_job,
        mark_job_done,
        mark_job_failed,
        requeue_stuck_jobs,
    )
    from app.services.telegram_poll import poll_telegram_links

    logger = logging.getLogger("worker")
    idle = 0

    while True:
        try:
            async with AsyncSessionLocal() as db:
                job = await fetch_next_job(db)

            if job is None:
                idle += 1
                if idle % 30 == 0:
                    async with AsyncSessionLocal() as db:
                        requeued = await requeue_stuck_jobs(db)
                        if requeued:
                            logger.warning("Requeued %d stuck job(s)", requeued)
                if idle % 5 == 0:
                    await poll_telegram_links(AsyncSessionLocal)
                await asyncio.sleep(2)
                continue

            idle = 0
            job_id, project_id = job.id, job.project_id
            logger.info("Picked up job %s for project %s", job_id, project_id)

            try:
                await run_research_pipeline(str(project_id))
                async with AsyncSessionLocal() as db:
                    await mark_job_done(db, job_id)
                logger.info("Job %s completed", job_id)
            except Exception as exc:
                logger.exception("Job %s failed: %s", job_id, exc)
                async with AsyncSessionLocal() as db:
                    await mark_job_failed(db, job_id, str(exc))
        except Exception:
            await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _worker_task
    _worker_task = asyncio.create_task(_run_worker_background())
    yield
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass


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


@app.get("/health")
async def health():
    return {"status": "ok"}
