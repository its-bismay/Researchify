import logging
from datetime import datetime, timezone
from pathlib import Path
import httpx


logger = logging.getLogger(__name__)
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.state import ResearchState
from app.config import settings
from app.models import Project, ProjectReport, User
from app.services.storage import get_presigned_url

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


async def deliver_report(
    db: AsyncSession,
    project: Project,
    report: ProjectReport,
    state: ResearchState,
) -> None:
    result = await db.execute(select(User).where(User.id == project.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return

    download_url = None
    if report.file_key:
        download_url = await get_presigned_url(report.file_key, expires_in=86400)

    dashboard_url = f"{settings.frontend_url}/projects/{project.id}"
    excerpt = (report.summary_markdown or "")[:400]

    try:
        sent_email = await _send_email(user, project, state, dashboard_url, download_url, excerpt, settings.site_name)
        if sent_email:
            report.sent_email_at = datetime.now(timezone.utc)
    except Exception as e:
        logger.error("Failed sending email notification: %s", e, exc_info=True)

    if user.telegram_chat_id:
        try:
            sent_tg = await _send_telegram(user, project, dashboard_url, download_url, excerpt)
            if sent_tg:
                report.sent_telegram_at = datetime.now(timezone.utc)
        except Exception as e:
            logger.error("Failed sending Telegram notification: %s", e, exc_info=True)

    await db.commit()


async def _send_email(
    user: User,
    project: Project,
    state: ResearchState,
    dashboard_url: str,
    download_url: str | None,
    excerpt: str,
    site_name: str = "AI Research Agent",
) -> bool:
    template = _env.get_template("email.html")
    html = template.render(
        site_name=site_name,
        topic=project.topic_prompt,
        excerpt=excerpt,
        images=state.get("images", [])[:3],
        sources=state.get("web_findings", [])[:3],
        videos=state.get("videos", [])[:2],
        dashboard_url=dashboard_url,
        download_url=download_url,
    )

    subject = f'Your research on "{project.topic_prompt}" is ready'
    text_content = f"Your research on \"{project.topic_prompt}\" is ready.\n\n{excerpt}\n\nView full dashboard: {dashboard_url}"
    if download_url:
        text_content += f"\nDownload report: {download_url}"

    logger.info("attempting to send email via custom hosted email service to %s", user.email)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                settings.email_service_url,
                json={
                    "recipient": user.email,
                    "subject": subject,
                    "text_content": text_content,
                    "html_content": html,
                },
            )
            if resp.status_code in (200, 201, 202):
                logger.info("email sent successfully via custom service to %s", user.email)
                return True
            else:
                logger.error("custom email service failed: %s %s", resp.status_code, resp.text[:200])
                return False
    except Exception as exc:
        logger.error("custom email service error: %s", exc, exc_info=True)
        return False



async def _send_telegram(
    user: User,
    project: Project,
    dashboard_url: str,
    download_url: str | None,
    excerpt: str,
) -> bool:
    if not settings.telegram_bot_token:
        logger.warning("telegram skipped: bot token not set")
        return False

    text = (
        f"*Your research on \"{project.topic_prompt}\" is ready*\n\n"
        f"{excerpt}\n\n"
        f"[View dashboard]({dashboard_url})"
    )
    if download_url:
        text += f"\n[Download report]({download_url})"

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                url,
                json={
                    "chat_id": user.telegram_chat_id,
                    "text": text[:4000],
                    "parse_mode": "Markdown",
                    "disable_web_page_preview": False,
                },
            )
            ok = resp.status_code == 200
            if ok:
                logger.info("telegram sent to chat %s", user.telegram_chat_id)
            else:
                logger.warning("telegram send failed: %s %s", resp.status_code, resp.text[:200])
            return ok
    except Exception as exc:
        logger.error("telegram send error: %s", exc, exc_info=True)
        return False
