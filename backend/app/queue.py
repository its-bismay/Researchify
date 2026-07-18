import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def fetch_next_job(db: AsyncSession):
    """Atomically claim the next queued job using FOR UPDATE SKIP LOCKED."""
    result = await db.execute(
        text(
            """
            UPDATE jobs
            SET status = 'running', locked_at = now(), attempts = attempts + 1
            WHERE id = (
                SELECT id FROM jobs
                WHERE status = 'queued'
                ORDER BY created_at
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            RETURNING id, project_id
            """
        )
    )
    await db.commit()
    return result.first()


async def mark_job_done(db: AsyncSession, job_id: uuid.UUID) -> None:
    await db.execute(
        text("UPDATE jobs SET status = 'done' WHERE id = :id"),
        {"id": job_id},
    )
    await db.commit()


async def mark_job_failed(db: AsyncSession, job_id: uuid.UUID, error: str) -> None:
    await db.execute(
        text("UPDATE jobs SET status = 'failed', error = :err WHERE id = :id"),
        {"id": job_id, "err": error[:4000]},
    )
    await db.commit()


async def requeue_stuck_jobs(db: AsyncSession, max_attempts: int = 3, stale_minutes: int = 15) -> int:
    """Requeue jobs stuck in 'running' past the stale threshold, up to max_attempts."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    result = await db.execute(
        text(
            """
            UPDATE jobs
            SET status = CASE WHEN attempts >= :max_attempts THEN 'failed' ELSE 'queued' END,
                error = CASE WHEN attempts >= :max_attempts THEN 'max attempts exceeded' ELSE error END
            WHERE status = 'running' AND locked_at < :cutoff
            RETURNING id
            """
        ),
        {"cutoff": cutoff, "max_attempts": max_attempts},
    )
    await db.commit()
    return len(result.fetchall())
