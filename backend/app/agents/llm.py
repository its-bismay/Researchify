import asyncio
import time
from collections import deque
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings

# ──────────────────────────────────────────────
# Rate limit config (Gemini 3.1 Flash-Lite)
# ──────────────────────────────────────────────
MODEL_NAME = "gemini-3.1-flash-lite"
REQ_PER_MINUTE = 15
TOKENS_PER_MINUTE = 250_000
REQ_PER_DAY = 500


class _RateLimiter:
    """Sliding-window rate limiter — blocks instead of failing."""

    def __init__(
        self,
        max_req_min: int,
        max_tokens_min: int,
        max_req_day: int,
    ):
        self._max_req_min = max_req_min
        self._max_tokens_min = max_tokens_min
        self._max_req_day = max_req_day
        self._req_min: deque[float] = deque()
        self._tokens_min: deque[tuple[float, int]] = deque()
        self._req_day: deque[float] = deque()
        self._lock = asyncio.Lock()

    async def acquire(self, estimated_tokens: int = 1) -> None:
        """Block until a request is allowed under all rate limits."""
        while True:
            now = time.monotonic()
            async with self._lock:
                self._prune(now)

                # 500 req/day
                if len(self._req_day) >= self._max_req_day:
                    wait = self._req_day[0] + 86400 - now
                    if wait > 0:
                        await asyncio.sleep(min(wait, 30))
                        continue

                # 15 req/min
                if len(self._req_min) >= self._max_req_min:
                    wait = self._req_min[0] + 60 - now
                    if wait > 0:
                        await asyncio.sleep(min(wait, 30))
                        continue

                # 250k tokens/min
                total_tokens = sum(t for _, t in self._tokens_min)
                if total_tokens + estimated_tokens > self._max_tokens_min:
                    wait = self._tokens_min[0][0] + 60 - now
                    if wait > 0:
                        await asyncio.sleep(min(wait, 30))
                        continue

                self._req_min.append(now)
                self._tokens_min.append((now, estimated_tokens))
                self._req_day.append(now)
                return

    def _prune(self, now: float) -> None:
        cutoff60 = now - 60
        cutoff86400 = now - 86400
        while self._req_min and self._req_min[0] < cutoff60:
            self._req_min.popleft()
        while self._tokens_min and self._tokens_min[0][0] < cutoff60:
            self._tokens_min.popleft()
        while self._req_day and self._req_day[0] < cutoff86400:
            self._req_day.popleft()


_rate_limiter = _RateLimiter(
    max_req_min=REQ_PER_MINUTE,
    max_tokens_min=TOKENS_PER_MINUTE,
    max_req_day=REQ_PER_DAY,
)


@lru_cache
def get_llm(temperature: float = 0.4) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=temperature,
        google_api_key=settings.gemini_api_key,
    )


async def llm_invoke(llm: ChatGoogleGenerativeAI, messages: list, estimated_tokens: int = 2000):
    """Invoke the LLM with rate-limit-aware waiting."""
    await _rate_limiter.acquire(estimated_tokens)
    return await llm.ainvoke(messages)
