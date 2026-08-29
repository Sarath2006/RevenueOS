"""
============================================================
RevenueOS AI Provider Factory
============================================================
"""

from __future__ import annotations

import os
from functools import lru_cache

from .base import AIProvider
from .mock_provider import MockAIProvider
from .openai_provider import OpenAIProvider


@lru_cache(maxsize=8)
def get_ai_provider(
    provider: str | None = None,
) -> AIProvider:

    selected_provider = (
        provider
        or os.getenv(
            "AI_PROVIDER",
            "mock",
        )
    ).strip().lower()

    if selected_provider == "mock":
        return MockAIProvider()

    if selected_provider == "openai":
        return OpenAIProvider()

    raise ValueError(
        f"Unsupported AI provider: "
        f"{selected_provider}"
    )