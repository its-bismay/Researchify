# AI Research Agent Platform — Full Build Specification

Use this as a complete prompt for a coding agent (e.g. Claude Code) or as a spec to build the system yourself.

---

## 1. Product Summary

Build a full-stack web application where:

1. Users **log in with Google** (OAuth 2.0).
2. A logged-in user can **create a "Project"** by giving a topic/prompt.
3. On creation, a **multi-agent AI pipeline** (LangChain + LangGraph + Gemini) automatically:
   - Researches the topic across the web.
   - Collects relevant **images, article links, and video links**.
   - Synthesizes a **detailed report/dashboard** for that project.
4. The generated dashboard is:
   - Rendered in the **React frontend** as an interactive project dashboard.
   - Saved as a **file** (PDF/HTML) tied to the project, stored in **S3**.
   - **Emailed** to the user automatically.
   - **Sent to Telegram** automatically, if the user has connected their Telegram account.
5. All heavy research work runs on a **background job**, not the request thread — no Redis required.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python), fully async |
| Agent Orchestration | LangChain + LangGraph |
| LLM | Google Gemini (via `langchain-google-genai`) |
| Background Jobs | **Postgres-backed job queue** (no Redis) — see Section 6 |
| Database | **NeonDB (serverless Postgres)**, accessed via async SQLAlchemy + `asyncpg` |
| File Storage | **AWS S3** (or S3-compatible: Cloudflare R2 / Backblaze B2) |
| Auth | Google OAuth 2.0 (Authlib) + JWT sessions |
| Email | SMTP via SendGrid/Resend/SES |
| Telegram | Telegram Bot API |
| Frontend | React (Vite) + TypeScript + Tailwind |
| Realtime status updates | WebSockets or polling `/status` endpoint |

**Why no Redis:** Since you're already on Postgres (NeonDB), a Postgres-based queue removes an entire moving part (no separate service to provision, monitor, or pay for). It uses `SELECT ... FOR UPDATE SKIP LOCKED`, which is the same mechanism Redis-based queues use internally for safe concurrent job pickup — you just don't need a second database to get it.

---

## 3. NeonDB Setup (Async Postgres)

### 3.1 Create the database
1. Sign up at neon.tech, create a new **Project**.
2. Create a database (e.g. `research_platform`).
3. Copy the **connection string** from the Neon dashboard. Neon gives you two useful variants:
   - **Pooled connection** (via PgBouncer) — use this for your normal FastAPI app traffic.
   - **Direct connection** — use this for migrations (Alembic) and for the background worker's `LISTEN/NOTIFY` or `SKIP LOCKED` polling, since pooled (transaction-mode) connections don't reliably support session-level features like advisory locks.

### 3.2 Install async driver
```bash
pip install "sqlalchemy[asyncio]" asyncpg alembic
```

### 3.3 Async engine setup
```python
# db.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = "postgresql+asyncpg://user:password@ep-xxxx-pooler.neon.tech/research_platform"

engine = create_async_engine(DATABASE_URL, pool_size=10, max_overflow=5, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

Use `postgresql+asyncpg://` (not `postgresql://`) so SQLAlchemy routes through asyncpg.

### 3.4 Alembic (migrations)
- Point Alembic's `sqlalchemy.url` at the **direct** (non-pooled) Neon connection string — migrations run DDL and shouldn't go through a transaction pooler.
- In `env.py`, use `asyncio.run()` to run migrations with the async engine, or simply use a sync `psycopg2` URL just for Alembic (common pattern — Alembic itself doesn't need to be async even if your app is).

### 3.5 Neon-specific tips
- Neon **autosuspends** on the free tier after inactivity — the first query after idle time has a cold-start delay (a second or two). Fine for a web app, but be aware your background worker's first poll after idle may be slightly slow.
- Enable **connection pooling** (pooled connection string) for FastAPI request-scoped sessions to avoid exhausting Postgres connections under load.
- Use Neon's **branching** feature to create a throwaway DB branch for testing migrations before applying to production.

---

## 4. S3 Bucket Setup (step-by-step)

### 4.1 Create the bucket
1. AWS Console → S3 → **Create bucket**.
2. Name: e.g. `research-platform-files` (must be globally unique).
3. Region: pick one close to your backend (e.g. `ap-south-1` if you're in India).
4. **Block all public access**: keep this ON. You will serve files via **presigned URLs**, not public bucket policies — this is safer and works fine for per-user files like reports.
5. Enable **default encryption** (SSE-S3) — leave as default.
6. Create the bucket.

### 4.2 Create an IAM user for programmatic access
1. IAM → Users → **Create user** (e.g. `research-platform-backend`).
2. **Do not** attach `AdministratorAccess`. Instead create a scoped policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::research-platform-files/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::research-platform-files"
    }
  ]
}
```
3. Attach this policy to the user.
4. Generate an **Access Key ID / Secret Access Key** for this user (Security credentials tab). Store these only in your backend's env vars / secrets manager — never in frontend code or git.

### 4.3 CORS configuration (only needed if the frontend uploads/downloads directly)
Since files are generated server-side and served via presigned URLs, you usually don't need CORS on the bucket. If you ever let the frontend fetch files directly by URL, add:
```json
[
  {
    "AllowedOrigins": ["https://yourapp.com", "http://localhost:5173"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"]
  }
]
```

### 4.4 Backend integration (boto3, async-friendly)
```bash
pip install boto3 aioboto3
```

```python
# storage.py
import aioboto3
from datetime import timedelta

S3_BUCKET = "research-platform-files"
session = aioboto3.Session()

async def upload_file(local_path: str, key: str, content_type: str = "application/pdf") -> str:
    async with session.client(
        "s3",
        region_name="ap-south-1",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    ) as s3:
        await s3.upload_file(local_path, S3_BUCKET, key, ExtraArgs={"ContentType": content_type})
        return key  # store this key in the DB, not a raw URL

async def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    async with session.client(
        "s3",
        region_name="ap-south-1",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    ) as s3:
        return await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": key},
            ExpiresIn=expires_in,
        )
```

**Key design decision:** store the S3 **object key** in `ProjectReport.file_key`, not a permanent URL. Generate a fresh presigned URL every time the frontend requests `/projects/{id}/file` — this way access stays revocable and time-limited, and you can rotate credentials without breaking old links.

### 4.5 Suggested key structure
```
projects/{project_id}/report.pdf
projects/{project_id}/report.html
projects/{project_id}/images/{artifact_id}.jpg
```

---

## 5. Data Models (async SQLAlchemy)

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import ForeignKey, Enum, DateTime, func
import uuid, enum

class Base(DeclarativeBase):
    pass

class ProjectStatus(str, enum.Enum):
    pending = "pending"
    researching = "researching"
    writing = "writing"
    generating_file = "generating_file"
    done = "done"
    failed = "failed"

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    avatar_url: Mapped[str | None]
    google_id: Mapped[str] = mapped_column(unique=True)
    telegram_chat_id: Mapped[str | None]
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str]
    topic_prompt: Mapped[str]
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.pending)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[DateTime | None]

class ResearchArtifact(Base):
    __tablename__ = "research_artifacts"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"))
    type: Mapped[str]  # source_link | image | video_link | note
    url: Mapped[str]
    title: Mapped[str | None]
    description: Mapped[str | None]
    thumbnail_url: Mapped[str | None]
    source_agent: Mapped[str]

class ProjectReport(Base):
    __tablename__ = "project_reports"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"))
    summary_markdown: Mapped[str]
    file_key: Mapped[str]          # S3 object key, not a raw URL
    sent_email_at: Mapped[DateTime | None]
    sent_telegram_at: Mapped[DateTime | None]

# Job queue table — see Section 6
class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"))
    status: Mapped[str] = mapped_column(default="queued")  # queued | running | done | failed
    attempts: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None]
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    locked_at: Mapped[DateTime | None]
```

All routes and services use `async def` with `AsyncSession`, e.g. `await db.execute(select(Project).where(...))`.

---

## 6. Background Jobs — No Redis, Postgres-backed Queue

Since you're already paying for and running NeonDB, use it as your job queue too. Two good options, in order of simplicity:

### Option A (simplest): FastAPI `BackgroundTasks`
For a single-instance deployment, `BackgroundTasks` runs the research pipeline after the response is sent, in the same process:
```python
@app.post("/projects")
async def create_project(payload: ProjectCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    project = Project(title=payload.title, topic_prompt=payload.topic, user_id=current_user.id)
    db.add(project)
    await db.commit()
    background_tasks.add_task(run_research_pipeline, str(project.id))
    return project
```
**Limitation:** if the server restarts mid-job, that job is lost, and it doesn't scale across multiple server instances. Fine for an MVP / single-instance deployment, not for production scale.

### Option B (recommended, still no Redis): Postgres job table + polling worker
This is durable (survives restarts) and works across multiple worker instances, using only Postgres.

**1. Enqueue a job** (inside the same transaction as creating the project):
```python
job = Job(project_id=project.id, status="queued")
db.add(job)
await db.commit()
```

**2. A standalone worker process** polls the `jobs` table using `SKIP LOCKED` so multiple workers never grab the same job:
```python
# worker.py — run as: python worker.py
import asyncio
from sqlalchemy import text

async def fetch_next_job(db):
    result = await db.execute(text("""
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
    """))
    await db.commit()
    return result.first()

async def worker_loop():
    while True:
        async with AsyncSessionLocal() as db:
            job = await fetch_next_job(db)
            if job is None:
                await asyncio.sleep(2)  # poll every 2s when idle
                continue
            try:
                await run_research_pipeline(str(job.project_id))
                await mark_job_done(db, job.id)
            except Exception as e:
                await mark_job_failed(db, job.id, str(e))

if __name__ == "__main__":
    asyncio.run(worker_loop())
```

**3. Run it** as a second process alongside your FastAPI app (e.g. a second Docker service / Railway process / systemd unit):
```
web:    uvicorn main:app --host 0.0.0.0 --port 8000
worker: python worker.py
```

This gives you retry logic (`attempts` column), crash-safety (a stuck `running` job with an old `locked_at` can be requeued by a periodic cleanup query), and horizontal scaling (run 2+ worker processes — `SKIP LOCKED` guarantees each job goes to exactly one of them) — all without Redis.

**Optional nicety:** use Postgres `LISTEN/NOTIFY` instead of polling, so the worker wakes up instantly when a job is enqueued rather than waiting up to 2s. Simple version: after inserting a job, run `NOTIFY new_job;`; the worker holds a raw connection with `LISTEN new_job;` and wakes on notification. This is a nice-to-have — 2-second polling is already good enough for research jobs that take minutes.

> **If you outgrow this:** the moment you need scheduled/delayed jobs, job priorities, or dashboards out of the box, look at **Procrastinate** (`pip install procrastinate`) — an async, Postgres-native task queue library that implements the exact pattern above for you, still with zero Redis.

---

## 7. Authentication Flow (Google Login)

1. Frontend redirects to Google OAuth consent screen (`/auth/google/login`).
2. Backend exchanges the auth code for tokens, fetches user profile (email, name, avatar).
3. Backend creates/updates a `User` record, issues a signed JWT (access + refresh token) as an HttpOnly cookie.
4. Frontend stores auth state via `/auth/me` endpoint.
5. User can connect Telegram via a one-time deep link (`https://t.me/<bot>?start=<user_token>`) that binds their `telegram_chat_id` once they message the bot.

**Backend endpoints:**
```
GET  /auth/google/login
GET  /auth/google/callback
GET  /auth/me
POST /auth/logout
POST /integrations/telegram/link       # generates deep link
POST /integrations/telegram/webhook    # receives /start command with token
```

---

## 8. Agent Architecture (LangGraph)

```
                 ┌─────────────────┐
                 │   Orchestrator   │  (Gemini, plans task decomposition)
                 └────────┬─────────┘
        ┌──────────────┬──┴───┬──────────────┐
        ▼              ▼      ▼              ▼
 ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
 │ Web Research │ │  Image   │ │  Video   │ │  Writer/  │
 │    Agent     │ │  Agent   │ │  Agent   │ │ Synthesis │
 └─────────────┘ └──────────┘ └──────────┘ │   Agent   │
                                              └─────┬─────┘
                                                    ▼
                                          ┌───────────────────┐
                                          │  File/Report       │
                                          │  Builder Agent      │
                                          └───────────────────┘
                                                    ▼
                                          ┌───────────────────┐
                                          │  Delivery Agent     │
                                          │ (email + Telegram)  │
                                          └───────────────────┘
```

### Agent roles & tool access

| Agent | Tools it can call | Restricted from |
|---|---|---|
| **Orchestrator** | task-planning only (no external calls) | web/image/video tools |
| **Web Research Agent** | `web_search`, `web_fetch`, `wikipedia_lookup` | image/video APIs |
| **Image Agent** | `image_search_api` (Google Custom Search Image / Bing / Unsplash) | web search, video APIs |
| **Video Agent** | `youtube_search_api` | web/image tools |
| **Writer/Synthesis Agent** | none (pure LLM reasoning over collected artifacts) | all external tools |
| **File Builder Agent** | `pdf_generator`, `html_renderer`, `s3_upload` | search/image/video tools |
| **Delivery Agent** | `send_email`, `send_telegram_message` | all research tools |

Bind each tool only to its corresponding LangGraph node at graph-compile time, so agents literally cannot invoke tools outside their scope.

### LangGraph state object

```python
class ResearchState(TypedDict):
    project_id: str
    topic: str
    plan: list[str]
    web_findings: list[dict]      # {title, url, snippet}
    images: list[dict]            # {url, thumbnail, caption, source_url}
    videos: list[dict]            # {title, url, thumbnail, channel}
    draft_summary: str
    final_summary_markdown: str
    file_key: str                 # S3 object key
    status: str
```

### Graph flow
1. `orchestrator_node` → breaks topic into sub-questions, updates `plan`.
2. Fan-out (parallel) to `web_research_node`, `image_node`, `video_node`.
3. `synthesis_node` → Gemini writes a **detailed** markdown summary with:
   - Clear sections (Overview, Key Findings, Deep Dive, Sources).
   - Inline images with captions.
   - Inline article link citations.
   - A "Watch" section with video links/thumbnails.
4. `file_builder_node` → renders markdown into a styled PDF/HTML dashboard file, uploads to **S3**, stores `file_key`.
5. `delivery_node` → sends email (with file link) and, if `telegram_chat_id` exists, sends a Telegram message with summary + file link.
6. Updates `Project.status = done`.

---

## 9. Backend API Surface (FastAPI, async)

```
POST   /projects                     # create project → enqueues job
GET    /projects                     # list user's projects
GET    /projects/{id}                # project details + status
GET    /projects/{id}/status         # lightweight polling endpoint
GET    /projects/{id}/report         # full markdown + artifacts
GET    /projects/{id}/file           # returns fresh presigned S3 URL
DELETE /projects/{id}

GET    /projects/{id}/artifacts      # images/links/videos collected
GET    /ws/projects/{id}             # websocket for live progress

POST   /integrations/telegram/link
POST   /integrations/telegram/webhook
GET    /integrations/status          # is telegram connected?
```

---

## 10. Frontend (React + TypeScript + Tailwind)

**Pages/components:**
- `LoginPage` — "Continue with Google" button.
- `Dashboard` — grid of project cards (status badges: pending/researching/done).
- `NewProjectModal` — input topic, submit → optimistic UI, redirects to project page.
- `ProjectPage`:
  - Live progress tracker (Researching → Writing → Building file → Delivered), driven by WebSocket/polling.
  - Rendered markdown report with embedded images and clickable link cards.
  - "Videos" section with thumbnail grid linking out to YouTube.
  - "Sources" list.
  - Download button (fetches fresh presigned URL from `/projects/{id}/file`).
  - Delivery status: "Emailed ✅", "Sent to Telegram ✅ / Connect Telegram".
- `SettingsPage` — connect/disconnect Telegram, view email used.

Use React Query (TanStack Query) for data fetching + polling, and a WebSocket hook for live status.

---

## 11. Email & Telegram Delivery Requirements

**Email (HTML template):**
- Subject: `Your research on "{topic}" is ready`
- Body includes: summary excerpt, 2–3 embedded images, top 3 source links, top 2 video thumbnails/links, "View full dashboard" CTA linking to the project page, and a download link (presigned S3 URL, generated fresh at send time).

**Telegram message:**
- Short summary (split into multiple messages if it exceeds Telegram's length limit).
- Send images via `sendPhoto`; video links as plain URLs (Telegram auto-previews YouTube links).
- Include a link back to the web dashboard.

---

## 12. Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
JWT_SECRET=

DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxxx-pooler.neon.tech/research_platform
DATABASE_URL_DIRECT=postgresql://user:pass@ep-xxxx.neon.tech/research_platform   # for Alembic

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET=research-platform-files

SMTP_HOST= / SMTP_USER= / SMTP_PASS= / EMAIL_FROM=
TELEGRAM_BOT_TOKEN=
IMAGE_SEARCH_API_KEY=        # Google Custom Search / Bing / Unsplash
YOUTUBE_API_KEY=
FRONTEND_URL=
```

---

## 13. Build Order (recommended)

1. NeonDB project + async SQLAlchemy models + Alembic migrations (Section 3, 5).
2. Google OAuth login + JWT sessions (Section 7).
3. `POST /projects` creating a DB row + a queued `Job` row + React login/dashboard shell.
4. Standalone worker process polling `jobs` (Section 6, Option B) — confirm end-to-end async flow with a dummy task first.
5. S3 bucket + IAM user + `storage.py` upload/presign helpers (Section 4).
6. Build the LangGraph pipeline node-by-node, testing each agent's tool access in isolation.
7. Wire the full graph into the worker's `run_research_pipeline`.
8. Build the markdown → PDF/HTML file generator, upload output to S3.
9. Add email delivery.
10. Add Telegram bot + linking flow + delivery.
11. Build out the full React dashboard/report UI with live status.
12. Add retries, job-cleanup for stuck jobs, and rate limiting on project creation.

---

## 14. Prompt to Feed a Coding Agent (Claude Code, etc.)

> "Build the AI Research Agent Platform described in this spec. Start with the FastAPI backend using fully async SQLAlchemy against NeonDB (asyncpg driver), with Alembic migrations run against the direct (non-pooled) connection string. Set up Google OAuth login with JWT sessions. Implement the background job system as a Postgres-backed queue (a `jobs` table polled with `SELECT ... FOR UPDATE SKIP LOCKED`, run as a separate worker process) — do not use Redis or Celery. Implement the LangGraph multi-agent research pipeline using Gemini, with each agent restricted to its own tools as defined in Section 8. Set up an S3 bucket with a scoped IAM policy and implement upload + presigned URL helpers using aioboto3, storing only S3 object keys in the database. Add the file-builder step that renders the markdown summary (with inline images, links, and video links) into a PDF/HTML dashboard file uploaded to S3. Add email and Telegram delivery. Finally, scaffold the React + TypeScript + Tailwind frontend with Google login, a project dashboard, a live-updating project detail page, and a settings page to connect Telegram. Follow the API surface and data models exactly as specified."

---

*This spec is intentionally implementation-ready — hand Section 14 (or the whole document) directly to a coding agent to start scaffolding.*
