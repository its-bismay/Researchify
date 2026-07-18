import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models import Project, ProjectStatus


async def run_research_pipeline(project_id: str) -> None:
    """Entry point invoked by the worker for each job.

    Phase 4 wires the full LangGraph multi-agent graph here. For now this
    drives the Project through its status lifecycle so the end-to-end job
    flow (enqueue -> worker -> completion) can be verified.
    """
    pid = uuid.UUID(project_id)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.id == pid))
        project = result.scalar_one_or_none()
        if project is None:
            return

        try:
            from app.agents.graph import run_graph

            await _set_status(db, project, ProjectStatus.researching)
            await run_graph(db, project)
            project.status = ProjectStatus.done
            project.completed_at = datetime.now(timezone.utc)
            await db.commit()
        except Exception:
            project.status = ProjectStatus.failed
            await db.commit()
            raise


async def _set_status(db, project: Project, status: ProjectStatus) -> None:
    project.status = status
    await db.commit()
