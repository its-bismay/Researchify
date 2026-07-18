import asyncio
import logging

from app.db import AsyncSessionLocal
from app.pipeline import run_research_pipeline
from app.queue import (
    fetch_next_job,
    mark_job_done,
    mark_job_failed,
    requeue_stuck_jobs,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [worker] %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 2
CLEANUP_EVERY_ITERATIONS = 30


async def worker_loop() -> None:
    logger.info("Worker started, polling for jobs...")
    idle_iterations = 0

    while True:
        async with AsyncSessionLocal() as db:
            job = await fetch_next_job(db)

        if job is None:
            idle_iterations += 1
            if idle_iterations % CLEANUP_EVERY_ITERATIONS == 0:
                async with AsyncSessionLocal() as db:
                    requeued = await requeue_stuck_jobs(db)
                    if requeued:
                        logger.warning("Requeued %d stuck job(s)", requeued)
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            continue

        idle_iterations = 0
        job_id, project_id = job.id, job.project_id
        logger.info("Picked up job %s for project %s", job_id, project_id)

        try:
            await run_research_pipeline(str(project_id))
            async with AsyncSessionLocal() as db:
                await mark_job_done(db, job_id)
            logger.info("Job %s completed", job_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Job %s failed: %s", job_id, exc)
            async with AsyncSessionLocal() as db:
                await mark_job_failed(db, job_id, str(exc))


if __name__ == "__main__":
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker stopped")
