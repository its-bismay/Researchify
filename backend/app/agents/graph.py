from functools import lru_cache

from langgraph.graph import END, START, StateGraph
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.nodes import (
    image_node,
    orchestrator_node,
    synthesis_node,
    video_node,
    web_research_node,
)
from app.agents.state import ResearchState
from app.models import Project, ProjectReport, ProjectStatus, ResearchArtifact


@lru_cache
def build_graph():
    graph = StateGraph(ResearchState)

    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("web_research", web_research_node)
    graph.add_node("image", image_node)
    graph.add_node("video", video_node)
    graph.add_node("synthesis", synthesis_node)

    graph.add_edge(START, "orchestrator")
    # Fan-out (parallel) to the three research agents.
    graph.add_edge("orchestrator", "web_research")
    graph.add_edge("orchestrator", "image")
    graph.add_edge("orchestrator", "video")
    # Fan-in to synthesis (waits for all three).
    graph.add_edge("web_research", "synthesis")
    graph.add_edge("image", "synthesis")
    graph.add_edge("video", "synthesis")
    graph.add_edge("synthesis", END)

    return graph.compile()


async def run_graph(db: AsyncSession, project: Project) -> None:
    """Run the multi-agent research graph and persist results."""
    compiled = build_graph()
    initial: ResearchState = {
        "project_id": str(project.id),
        "topic": project.topic_prompt,
        "status": "researching",
    }
    final_state: ResearchState = await compiled.ainvoke(initial)

    await _persist_artifacts(db, project, final_state)

    project.status = ProjectStatus.generating_file
    await db.commit()

    summary_md = final_state.get("final_summary_markdown", "")

    from app.services.report_builder import build_and_upload_report

    file_key = await build_and_upload_report(project, summary_md, final_state)

    report = ProjectReport(
        project_id=project.id,
        summary_markdown=summary_md,
        file_key=file_key,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    from app.services.delivery import deliver_report

    await deliver_report(db, project, report, final_state)


async def _persist_artifacts(
    db: AsyncSession, project: Project, state: ResearchState
) -> None:
    await db.execute(
        delete(ResearchArtifact).where(
            ResearchArtifact.project_id == project.id
        )
    )
    artifacts: list[ResearchArtifact] = []

    for f in state.get("web_findings", []):
        artifacts.append(
            ResearchArtifact(
                project_id=project.id,
                type="source_link",
                url=f.get("url", ""),
                title=f.get("title"),
                description=f.get("snippet"),
                source_agent="web_research",
            )
        )
    for img in state.get("images", []):
        artifacts.append(
            ResearchArtifact(
                project_id=project.id,
                type="image",
                url=img.get("url", ""),
                title=img.get("caption"),
                thumbnail_url=img.get("thumbnail"),
                source_agent="image",
            )
        )
    for v in state.get("videos", []):
        artifacts.append(
            ResearchArtifact(
                project_id=project.id,
                type="video_link",
                url=v.get("url", ""),
                title=v.get("title"),
                description=v.get("channel"),
                thumbnail_url=v.get("thumbnail"),
                source_agent="video",
            )
        )

    db.add_all(artifacts)
    await db.commit()
