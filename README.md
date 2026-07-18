# AI Research Agent Platform

A full-stack research automation platform where users authenticate via Google, create research projects, and a **LangGraph multi-agent pipeline** (powered by **Gemini 3.1 Flash-Lite**) researches the topic in parallel — collecting web content, images (Unsplash), and videos (YouTube) — then synthesizes a markdown report, uploads it to **AWS S3**, and delivers it via **email (Gmail SMTP)** and **Telegram**. All background work is orchestrated through a **Postgres-backed job queue** (zero infrastructure dependencies — no Redis, no Celery).

---

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────────────────┐
│   Browser   │     │                 Render (single web service)          │
│  (Vercel)   │────▶│                                                      │
│ React + TS  │     │  FastAPI (uvicorn) ───┬─── Auth (Google OAuth + JWT) │
│             │     │                       ├─── Project CRUD endpoints    │
│  Vercel     │     │                       ├─── LangGraph Pipeline (async)│
│ rewrites:   │     │                       ├─── S3 Storage (aioboto3)     │
│ /* → /index │     │                       └─── Email (Gmail SMTP) + TG   │
│    .html    │     │                                                      │
└─────────────┘     │  ┌─────────────────────────────────────────────────┐  │
                    │  │  Background Worker (asyncio.create_task)         │  │
                    │  │                                                 │  │
                    │  │  Poll ──▶ jobs table ──▶ run_research_pipeline   │  │
                    │  │  (FOR UPDATE        (LangGraph graph)           │  │
                    │  │   SKIP LOCKED)                                  │  │
                    │  │             ◀── deliver_report ── email + TG    │  │
                    │  └─────────────────────────────────────────────────┘  │
                    │                                                      │
                    │              ┌──────────────────┐                    │
                    │              │  PostgreSQL       │                    │
                    │              │  (NeonDB)         │                    │
                    │              │  users / projects  │                    │
                    │              │  artifacts / jobs  │                    │
                    │              │  reports          │                    │
                    │              └──────────────────┘                    │
                    └──────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, TanStack React Query, Axios |
| **Backend** | Python 3.13, FastAPI, async SQLAlchemy + asyncpg, Alembic |
| **AI / Agents** | LangGraph, LangChain, Google Gemini 3.1 Flash-Lite |
| **Auth** | Google OAuth (Authlib), JWT (PyJWT), HttpOnly cookies |
| **Storage** | AWS S3 (aioboto3) |
| **Email** | Gmail SMTP + App Password |
| **Messaging** | Telegram Bot API (polling) |
| **Database** | PostgreSQL 16 (NeonDB — serverless) |
| **Deployment** | Frontend: Vercel; Backend: Render (single web service) |

---

## End-to-End Workflow

```
User clicks "Login with Google"
        │
        ▼
Google OAuth callback → JWT access + refresh tokens set as HttpOnly cookies
        │
        ▼
User creates a project (title + topic prompt)
        │
        ▼
POST /projects → inserts row into `projects` (status=pending) + enqueues a `jobs` row (status=queued)
        │
        ▼
Background worker polls `jobs` table every 2 seconds via:
  UPDATE jobs SET status='running'
  WHERE id = (SELECT id FROM jobs WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        │
        ▼
Worker calls run_research_pipeline(project_id) — compiles & invokes the LangGraph graph:
        │
        ├── Orchestrator node — initializes state
        ├── Web Research node — (fetches web pages)
        ├── Image node ─────── queries Unsplash API
        ├── Video node ─────── queries YouTube Data API v3
        │   (All three fan out in parallel — LangGraph waits for all to complete before proceeding)
        │
        ▼
Synthesis node — LLM receives all findings + wrote a comprehensive markdown report
        │
        ▼
Artifacts persisted (sources, images, videos) — status → generating_file
        │
        ▼
Report builder:
  1. Renders markdown → HTML (Jinja2 template)
  2. Uploads HTML to S3
  3. Attempts PDF generation (WeasyPrint) — uploads if successful
        │
        ▼
Report row inserted — job marked done
        │
        ▼
Delivery:
  1. Email sent via Gmail SMTP (branded HTML template)
  2. Telegram message sent with dashboard + download link (if user linked their account)
        │
        ▼
User sees live status updates (polling every 5s) + final report on dashboard
```

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── graph.py          # LangGraph state graph definition
│   │   │   ├── llm.py            # Gemini LLM wrapper + sliding-window rate limiter
│   │   │   ├── nodes.py          # Graph node implementations (orchestrator, web, image, video, synthesis)
│   │   │   ├── state.py          # Typed ResearchState dataclass
│   │   │   └── tools.py          # web_search, web_fetch, image_search, youtube_search
│   │   ├── routers/
│   │   │   ├── auth.py           # Google OAuth login/callback, /me, logout, refresh
│   │   │   ├── projects.py       # CRUD: create, list, get, status, artifacts, file, delete
│   │   │   └── integrations.py   # Telegram link/unlink, integration status
│   │   ├── services/
│   │   │   ├── delivery.py       # Email (SMTP) + Telegram delivery with branded templates
│   │   │   ├── report_builder.py # Markdown → HTML → PDF → S3 upload
│   │   │   ├── storage.py        # S3 upload_bytes, upload_file, get_presigned_url
│   │   │   └── telegram_poll.py  # Poll Telegram /getUpdates for /start <token> linking
│   │   ├── templates/
│   │   │   ├── email.html        # Branded email template (Jinja2)
│   │   │   └── report.html       # Report HTML template (Jinja2)
│   │   ├── config.py             # Pydantic-settings, .env loader, DB URL cleaner
│   │   ├── db.py                 # AsyncSession factory, get_db dependency
│   │   ├── main.py               # FastAPI app, lifespan (starts background worker), CORS, routes
│   │   ├── models.py             # SQLAlchemy ORM: User, Project, ResearchArtifact, ProjectReport, Job
│   │   ├── pipeline.py           # run_research_pipeline — wraps graph execution
│   │   ├── queue.py              # Job queue: fetch_next_job, mark_job_done/failed, requeue_stuck_jobs
│   │   ├── schemas.py            # Pydantic request/response schemas (ProjectOut, UserOut, etc.)
│   │   └── security.py           # JWT create/decode, cookie management, current_user dependency
│   ├── alembic/                  # DB migrations (async, uses DATABASE_URL_DIRECT for raw psycopg)
│   ├── .env.example
│   ├── pyproject.toml
│   └── uv.lock
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api.ts                # Axios client + all API functions
│   │   ├── App.tsx               # Router setup (login, dashboard, project, settings)
│   │   ├── useAuth.ts            # Auth hook (fetches /auth/me, redirects)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx     # Google login button
│   │   │   ├── Dashboard.tsx     # Project grid with live status polling
│   │   │   ├── ProjectPage.tsx   # Live status, artifacts gallery, report viewer
│   │   │   └── SettingsPage.tsx  # Telegram linking, email display
│   │   └── components/
│   │       ├── Layout.tsx        # App shell (sidebar/header)
│   │       ├── NewProjectModal.tsx
│   │       └── StatusBadge.tsx   # Colored status indicator
│   ├── vercel.json               # SPA rewrites: /* → /index.html
│   ├── vite.config.ts            # Dev proxy to backend
│   └── package.json
│
└── README.md
```

---

## Key Design Decisions

### Job Queue (No Redis)
PostgreSQL serves as the job queue using `SELECT ... FOR UPDATE SKIP LOCKED` — atomic row-level locking without external infrastructure. The worker runs as an `asyncio.create_task` inside the same FastAPI process (avoids separate worker deployment on Render's free tier). Supports retries (`attempts` column) and automatic requeue of jobs stuck in `running` state past a configurable threshold.

### LangGraph Pipeline
The research pipeline is a **directed state graph** with fan-out/fan-in parallelism:

- **Orchestrator** — initializes state, sets the topic
- **Web Research** — fetches web pages (via `web_fetch` tool)
- **Image Search** — queries Unsplash API for relevant images
- **Video Search** — queries YouTube Data API for relevant videos
- **Synthesis** — receives all parallel outputs, asks Gemini to write a comprehensive markdown report

Agents run concurrently where possible; the synthesis node waits for all three research agents to complete (fan-in).

### Rate Limiter (Gemini)
A sliding-window rate limiter at the LLM layer enforces:
- 15 requests per minute
- 250,000 tokens per minute
- 500 requests per day

It blocks (awaits) instead of failing, retrying automatically when capacity frees up.

### Cross-Domain Auth
Frontend on Vercel, backend on Render. Cookies use:
- `SameSite=None` + `Secure=true` in production
- `SameSite=Lax` + `Secure=false` in local dev

### Telegram Integration
Since Render's free tier cannot receive webhooks, Telegram user linking uses **polling** — the worker periodically calls `getUpdates` to check for `/start <token>` messages and links the chat ID to the user account.

### Single Service Deployment
The worker is not a separate process. It starts as a background `asyncio.Task` inside the FastAPI lifespan, avoiding a separate worker dyno on Render's free plan.

---

## Setup

### Prerequisites
- Python 3.13+, Node.js 20+, `uv` package manager
- PostgreSQL (local or NeonDB)
- API keys: Google OAuth, Gemini, Unsplash, YouTube, Telegram Bot, AWS S3

### Backend

```bash
cd backend
cp .env.example .env
# Fill in .env with your credentials
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `JWT_SECRET` | Secret key for JWT signing |
| `GEMINI_API_KEY` | Google Gemini API key |
| `DATABASE_URL` | NeonDB pooled connection string (asyncpg) |
| `DATABASE_URL_DIRECT` | NeonDB direct connection string (for Alembic) |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret key |
| `S3_BUCKET` | S3 bucket name |
| `EMAIL_FROM` | Sender email address |
| `SMTP_HOST` | SMTP server (e.g. smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (587 for TLS) |
| `SMTP_USER` | SMTP username (full Gmail address) |
| `SMTP_PASS` | Gmail App Password (16 chars) |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TELEGRAM_BOT_USERNAME` | Bot username (for deep linking) |
| `UNSPLASH_ACCESS_KEY` | Unsplash API access key |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `FRONTEND_URL` | Frontend URL (for CORS) |
| `BACKEND_URL` | Backend URL (for CORS) |
| `COOKIE_SECURE` | Set to `true` in production (HTTPS) |

---

## Deployment

### Frontend → Vercel
1. Connect the GitHub repo to Vercel
2. Set `VITE_API_URL=https://your-backend.onrender.com`
3. Deploy — Vercel will use `vercel.json` to route all paths to `index.html` for SPA support

### Backend → Render
1. Create a **Web Service** on Render from the same repo
2. Root directory: `backend`
3. Build command: `uv sync`
4. Start command: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set all environment variables in Render dashboard
6. Ensure `COOKIE_SECURE=true`, `FRONTEND_URL=https://your-app.vercel.app`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/auth/google/login` | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Clear auth cookies |
| `POST` | `/projects` | Create project (rate limited: 10/hr) |
| `GET` | `/projects` | List user's projects |
| `GET` | `/projects/{id}` | Get project detail (with report + artifacts) |
| `GET` | `/projects/{id}/status` | Get project status only |
| `GET` | `/projects/{id}/artifacts` | List artifacts |
| `GET` | `/projects/{id}/file` | Get presigned S3 URL for report file |
| `DELETE` | `/projects/{id}` | Delete project |
| `GET` | `/integrations/status` | Get email + Telegram connection status |
| `POST` | `/integrations/telegram/link` | Generate Telegram deep link |
| `DELETE` | `/integrations/telegram` | Disconnect Telegram |
