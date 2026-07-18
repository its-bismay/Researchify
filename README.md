# AI Research Agent Platform

Full-stack app: Google login → create a research Project → a LangGraph multi-agent
pipeline (Gemini) researches the topic, builds a report, uploads it to S3, and
delivers it via email + Telegram. Background work runs on a Postgres-backed job
queue (no Redis).

## Structure

```
backend/   FastAPI + async SQLAlchemy + LangGraph + worker  (managed with uv)
frontend/  React + TypeScript + Vite + Tailwind
```

## Backend (uv)

```bash
cd backend
cp .env.example .env        # fill in real values
uv sync                     # install deps
uv run alembic revision --autogenerate -m "initial"   # after DATABASE_URL is set
uv run alembic upgrade head
uv run uvicorn app.main:app --reload   # API on :8000
uv run python worker.py                # background worker (separate process)
```

## Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies API to :8000)
```

## Deployment (two processes)

```
web:    uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
worker: uv run python worker.py
```

## Key design notes

- **Job queue**: `jobs` table polled with `SELECT ... FOR UPDATE SKIP LOCKED`
  (`app/queue.py`); worker retries via `attempts` and requeues stuck jobs.
- **Agents**: orchestrator → parallel web/image/video → synthesis
  (`app/agents/graph.py`), each node restricted to its own tools.
- **Storage**: only the S3 object key is stored; `/projects/{id}/file` returns a
  fresh presigned URL.
- **Rate limit**: max 10 projects/user/hour on `POST /projects`.
