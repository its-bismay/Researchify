import json

from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm import get_llm, llm_invoke
from app.agents.state import ResearchState
from app.agents.tools import (
    image_search,
    web_fetch,
    web_search,
    youtube_search,
)


async def orchestrator_node(state: ResearchState) -> ResearchState:
    """Plans task decomposition only. No external tool access."""
    llm = get_llm(temperature=0.3)
    topic = state["topic"]
    prompt = (
        "You are a research orchestrator. Break the topic into 4-6 focused "
        "sub-questions that together give comprehensive coverage. "
        "Return ONLY a JSON array of strings.\n\nTopic: " + topic
    )
    resp = await llm_invoke(
        llm,
        [
            SystemMessage(content="You output only valid JSON arrays."),
            HumanMessage(content=prompt),
        ],
        estimated_tokens=200,
    )
    plan = _parse_json_list(_to_text(resp.content)) or [topic]
    return {"plan": plan, "status": "researching"}


async def web_research_node(state: ResearchState) -> ResearchState:
    """Tools: web_search, web_fetch. Restricted from image/video APIs."""
    queries = state.get("plan") or [state["topic"]]
    findings: list[dict] = []
    seen: set[str] = set()
    for q in queries:
        for result in await web_search(q, num=5):
            url = result.get("url")
            if url and url not in seen:
                seen.add(url)
                findings.append(result)
    return {"web_findings": findings}


async def image_node(state: ResearchState) -> ResearchState:
    """Tools: image_search only."""
    images = await image_search(state["topic"], num=6)
    return {"images": images}


async def video_node(state: ResearchState) -> ResearchState:
    """Tools: youtube_search only."""
    videos = await youtube_search(state["topic"], num=5)
    return {"videos": videos}


async def synthesis_node(state: ResearchState) -> ResearchState:
    """Pure LLM reasoning over collected artifacts. No external tools."""
    llm = get_llm(temperature=0.5)
    topic = state["topic"]
    web = state.get("web_findings", [])
    images = state.get("images", [])
    videos = state.get("videos", [])

    context = {
        "topic": topic,
        "sources": web[:12],
        "images": images[:6],
        "videos": videos[:5],
    }
    prompt = (
        "Write a DETAILED research report in Markdown about the topic using the "
        "provided sources, images, and videos. Structure it with these sections:\n"
        "## Overview\n## Key Findings\n## Deep Dive\n"
        "Embed relevant images inline using Markdown image syntax with captions. "
        "Cite article links inline. Add a '## Watch' section listing the videos "
        "with links, and a final '## Sources' list of all article links.\n\n"
        "Data (JSON):\n" + json.dumps(context)[:12000]
    )
    resp = await llm_invoke(
        llm,
        [
            SystemMessage(
                content="You are an expert research writer producing thorough, "
                "well-structured Markdown reports."
            ),
            HumanMessage(content=prompt),
        ],
        estimated_tokens=4000,
    )
    summary = _to_text(resp.content)
    return {
        "final_summary_markdown": summary,
        "draft_summary": summary,
        "status": "writing",
    }


def _to_text(content) -> str:
    """Normalize LLM message content to a plain string.

    Gemini 3.x may return content as a list of parts/blocks instead of a str.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                parts.append(block.get("text", ""))
            else:
                parts.append(str(block))
        return "".join(parts)
    return str(content)


def _parse_json_list(text: str) -> list[str]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return [str(x) for x in data]
    except (json.JSONDecodeError, ValueError):
        pass
    return []
