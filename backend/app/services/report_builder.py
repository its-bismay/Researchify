from pathlib import Path

import markdown as md
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.agents.state import ResearchState
from app.models import Project
from app.services.storage import upload_bytes

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_html(project: Project, summary_markdown: str) -> str:
    body_html = md.markdown(
        summary_markdown,
        extensions=["extra", "sane_lists", "tables", "nl2br"],
    )
    template = _env.get_template("report.html")
    return template.render(
        title=project.title,
        topic=project.topic_prompt,
        body_html=body_html,
    )


def render_pdf(html: str) -> bytes | None:
    try:
        from weasyprint import HTML

        return HTML(string=html).write_pdf()
    except Exception:
        return None


async def build_and_upload_report(
    project: Project, summary_markdown: str, state: ResearchState
) -> str:
    """Render report to HTML (+PDF if possible), upload to S3, return file key."""
    html = render_html(project, summary_markdown)

    html_key = f"projects/{project.id}/report.html"
    await upload_bytes(html.encode("utf-8"), html_key, "text/html")

    pdf_bytes = render_pdf(html)
    if pdf_bytes:
        pdf_key = f"projects/{project.id}/report.pdf"
        await upload_bytes(pdf_bytes, pdf_key, "application/pdf")
        return pdf_key

    return html_key
