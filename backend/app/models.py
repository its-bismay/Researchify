import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ProjectStatus(str, enum.Enum):
    pending = "pending"
    researching = "researching"
    writing = "writing"
    generating_file = "generating_file"
    done = "done"
    failed = "failed"


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    name: Mapped[str]
    avatar_url: Mapped[str | None]
    google_id: Mapped[str] = mapped_column(unique=True, index=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(default=None)
    telegram_link_token: Mapped[str | None] = mapped_column(default=None, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    projects: Mapped[list["Project"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str]
    topic_prompt: Mapped[str] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    user: Mapped["User"] = relationship(back_populates="projects")
    artifacts: Mapped[list["ResearchArtifact"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    report: Mapped["ProjectReport | None"] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )


class ResearchArtifact(Base):
    __tablename__ = "research_artifacts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"))
    type: Mapped[str]  # source_link | image | video_link | note
    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str | None]
    description: Mapped[str | None] = mapped_column(Text, default=None)
    thumbnail_url: Mapped[str | None]
    source_agent: Mapped[str]

    project: Mapped["Project"] = relationship(back_populates="artifacts")


class ProjectReport(Base):
    __tablename__ = "project_reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"))
    summary_markdown: Mapped[str] = mapped_column(Text)
    file_key: Mapped[str]  # S3 object key, not a raw URL
    sent_email_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    sent_telegram_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    project: Mapped["Project"] = relationship(back_populates="report")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"))
    status: Mapped[str] = mapped_column(default="queued")
    attempts: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
