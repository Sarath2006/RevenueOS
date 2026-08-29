"""
============================================================
RevenueOS Mock AI Provider
============================================================

Deterministic provider used for:

- development
- unit tests
- integration tests
- CI/CD
- local development

No external API call is made.
"""

from __future__ import annotations

from time import perf_counter

from .base import AIProvider
from .types import (
    AIClassificationRequest,
    AIClassificationResponse,
    AIProviderMetadata,
)


class MockAIProvider(AIProvider):
    """
    Deterministic AI provider.

    This provider intentionally does not use an LLM.
    """

    @property
    def provider_name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return "mock-v1"

    async def classify(
        self,
        request: AIClassificationRequest,
    ) -> AIClassificationResponse:

        started = perf_counter()

        label = (
            request.allowed_labels[0]
            if request.allowed_labels
            else "UNKNOWN"
        )

        confidence = 0.50

        explanation = (
            "Deterministic mock provider response."
        )

        latency_ms = int(
            (perf_counter() - started) * 1000
        )

        return AIClassificationResponse(
            label=label,
            confidence=confidence,
            explanation=explanation,
            provider_metadata=AIProviderMetadata(
                provider=self.provider_name,
                model=self.model_name,
                model_version="1",
                latency_ms=latency_ms,
                fallback_used=False,
            ),
            raw_response={
                "mock": True,
                "label": label,
            },
        )