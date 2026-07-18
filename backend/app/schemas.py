import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import ProjectStatus


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None = None
    telegram_chat_id: str | None = None
    created_at: datetime


class ProjectCreate(BaseModel):
    title: str
    topic: str


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    topic_prompt: str
    status: ProjectStatus
    created_at: datetime
    completed_at: datetime | None = None


class ProjectStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: ProjectStatus


class ArtifactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    url: str
    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    source_agent: str


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    summary_markdown: str
    sent_email_at: datetime | None = None
    sent_telegram_at: datetime | None = None


class ProjectDetailOut(ProjectOut):
    report: ReportOut | None = None
    artifacts: list[ArtifactOut] = []


class PresignedUrlOut(BaseModel):
    url: str
    expires_in: int


class IntegrationStatusOut(BaseModel):
    telegram_connected: bool
    email: str


class TelegramLinkOut(BaseModel):
    deep_link: str
