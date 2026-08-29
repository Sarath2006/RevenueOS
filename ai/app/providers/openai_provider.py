"""
============================================================
RevenueOS OpenAI Provider
============================================================

OpenAI-specific implementation.

IMPORTANT:
No other RevenueOS module should import the OpenAI
SDK directly.

Only this provider is allowed to know about the
provider-specific implementation.
"""

from __future__ import annotations

import os
from time import perf_counter
from typing import Any, Dict

from .base import AIProvider
from .types import (
    AIClassificationRequest,
    AIClassificationResponse,
    AIProviderMetadata,
)


class OpenAIProvider(AIProvider):
    """
    OpenAI-backed AI provider.

    The SDK is imported lazily so that RevenueOS can
    still run using the mock provider when OpenAI is
    not configured.
    """

    def __init__(
        self,
        model: str | None = None,
    ) -> None:

        self._model = (
            model
            or os.getenv(
                "AI_MODEL",
                "gpt-4o-mini",
            )
        )

        self._api_key = os.getenv(
            "OPENAI_API_KEY"
        )

        if not self._api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not configured"
            )

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model

    async def classify(
        self,
        request: AIClassificationRequest,
    ) -> AIClassificationResponse:

        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise RuntimeError(
                "OpenAI SDK is not installed. "
                "Install the configured OpenAI dependency."
            ) from exc

        started = perf_counter()

        client = AsyncOpenAI(
            api_key=self._api_key
        )

        allowed_labels = ", ".join(
            request.allowed_labels
        )

        system_prompt = f"""
You are the RevenueOS financial recovery
classification engine.

Return a classification using ONLY one of
the following labels:

{allowed_labels}

You must provide:
- label
- confidence
- explanation

Confidence must be between 0 and 1.
"""

        user_prompt = (
            f"{request.user_prompt}\n\n"
            "Return structured JSON."
        )

        response = await client.chat.completions.create(
            model=self._model,

            temperature=request.temperature,

            max_tokens=request.max_tokens,

            response_format={
                "type": "json_object"
            },

            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                    + "\n"
                    + request.system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        )

        latency_ms = int(
            (perf_counter() - started) * 1000
        )

        content = (
            response.choices[0]
            .message
            .content
        )

        if not content:
            raise RuntimeError(
                "OpenAI returned an empty response"
            )

        import json

        parsed: Dict[str, Any] = json.loads(
            content
        )

        label = str(
            parsed.get(
                "label",
                "",
            )
        ).strip()

        confidence = float(
            parsed.get(
                "confidence",
                0,
            )
        )

        explanation = str(
            parsed.get(
                "explanation",
                "",
            )
        ).strip()

        if label not in request.allowed_labels:
            raise ValueError(
                f"AI returned unsupported label: {label}"
            )

        if not 0.0 <= confidence <= 1.0:
            raise ValueError(
                "AI returned invalid confidence"
            )

        request_id = getattr(
            response,
            "id",
            None,
        )

        return AIClassificationResponse(
            label=label,

            confidence=confidence,

            explanation=explanation,

            provider_metadata=AIProviderMetadata(
                provider=self.provider_name,

                model=self.model_name,

                model_version=self.model_name,

                latency_ms=latency_ms,

                request_id=request_id,

                fallback_used=False,
            ),

            raw_response=parsed,
        )