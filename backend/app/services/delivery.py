import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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
    if not settings.email_from:
        logger.warning("email skipped: EMAIL_FROM not set")
        return False

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

    # Try sending via Brevo HTTP API if configured
    if settings.brevo_api_key:
        logger.info("attempting to send email via Brevo API to %s", user.email)
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    headers={
                        "api-key": settings.brevo_api_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "sender": {"email": settings.email_from or "noreply@researchify.dev", "name": settings.site_name},
                        "to": [{"email": user.email}],
                        "subject": subject,
                        "htmlContent": html,
                    },
                )
                if resp.status_code in (200, 201, 202):
                    logger.info("email sent via Brevo to %s", user.email)
                    return True
                else:
                    logger.warning("Brevo send failed: %s %s. Falling back to SMTP or SendGrid if configured.", resp.status_code, resp.text[:200])
        except Exception as exc:
            logger.error("Brevo API send error: %s. Falling back to SMTP or SendGrid if configured.", exc, exc_info=True)

    # Try sending via SendGrid HTTP API if configured
    if settings.sendgrid_api_key:
        logger.info("attempting to send email via SendGrid API to %s", user.email)
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {settings.sendgrid_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "personalizations": [
                            {
                                "to": [{"email": user.email}],
                                "subject": subject
                            }
                        ],
                        "from": {"email": settings.email_from or "noreply@researchify.dev"},
                        "content": [
                            {
                                "type": "text/html",
                                "value": html
                            }
                        ]
                    },
                )
                if resp.status_code in (200, 201, 202):
                    logger.info("email sent via SendGrid to %s", user.email)
                    return True
                else:
                    logger.warning("SendGrid send failed: %s %s. Falling back to SMTP if configured.", resp.status_code, resp.text[:200])
        except Exception as exc:
            logger.error("SendGrid API send error: %s. Falling back to SMTP if configured.", exc, exc_info=True)

    if not settings.smtp_host:
        logger.warning("email failed: no SMTP fallback configured")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.email_from or "noreply@researchify.dev"
    msg["To"] = user.email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_pass)
            server.sendmail(settings.email_from or "noreply@researchify.dev", [user.email], msg.as_string())
        logger.info("email sent via SMTP to %s", user.email)
        return True
    except Exception as exc:
        logger.warning("email failed to %s: %s", user.email, exc)
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
