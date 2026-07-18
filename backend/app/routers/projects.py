import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

MAX_PROJECTS_PER_HOUR = 10

from app.db import get_db
from app.models import Job, Project, ProjectReport, ResearchArtifact, User
from app.schemas import (
    ArtifactOut,
    PresignedUrlOut,
    ProjectCreate,
    ProjectDetailOut,
    ProjectOut,
    ProjectStatusOut,
)
from app.security import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


async def _get_owned_project(
    project_id: uuid.UUID, user: User, db: AsyncSession, *, load=False
) -> Project:
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == user.id
    )
    if load:
        stmt = stmt.options(
            selectinload(Project.report), selectinload(Project.artifacts)
        )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = await db.execute(
        select(func.count(Project.id)).where(
            Project.user_id == current_user.id,
            Project.created_at >= cutoff,
        )
    )
    if (recent.scalar_one() or 0) >= MAX_PROJECTS_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again later.",
        )

    project = Project(
        title=payload.title,
        topic_prompt=payload.topic,
        user_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    job = Job(project_id=project.id, status="queued")
    db.add(job)

    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{project_id}", response_model=ProjectDetailOut)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_project(project_id, current_user, db, load=True)


@router.get("/{project_id}/status", response_model=ProjectStatusOut)
async def project_status(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_project(project_id, current_user, db)


@router.get("/{project_id}/report", response_model=ProjectDetailOut)
async def project_report(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_project(project_id, current_user, db, load=True)


@router.get("/{project_id}/artifacts", response_model=list[ArtifactOut])
async def project_artifacts(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_project(project_id, current_user, db)
    result = await db.execute(
        select(ResearchArtifact).where(
            ResearchArtifact.project_id == project_id
        )
    )
    return list(result.scalars().all())


@router.get("/{project_id}/file", response_model=PresignedUrlOut)
async def project_file(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_project(project_id, current_user, db)
    result = await db.execute(
        select(ProjectReport).where(ProjectReport.project_id == project_id)
    )
    report = result.scalar_one_or_none()
    if report is None or not report.file_key:
        raise HTTPException(status_code=404, detail="Report file not ready")

    from app.services.storage import get_presigned_url

    expires_in = 3600
    url = await get_presigned_url(report.file_key, expires_in=expires_in)
    return PresignedUrlOut(url=url, expires_in=expires_in)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user, db)
    await db.delete(project)
    await db.commit()
