from typing import TypedDict


class ResearchState(TypedDict, total=False):
    project_id: str
    topic: str
    plan: list[str]
    web_findings: list[dict]  # {title, url, snippet}
    images: list[dict]  # {url, thumbnail, caption, source_url}
    videos: list[dict]  # {title, url, thumbnail, channel}
    draft_summary: str
    final_summary_markdown: str
    file_key: str  # S3 object key
    status: str
