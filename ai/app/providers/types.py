"""
============================================================
RevenueOS AI Provider Types
============================================================

Provider-independent request/response contracts.

The business layer should never depend directly on
OpenAI/Gemini/etc. response formats.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class AIProviderMetadata:
    """
    Metadata describing the AI provider/model used.
    """

    provider: str
    model: str
    model_version: str

    latency_ms: Optional[int] = None

    request_id: Optional[str] = None

    fallback_used: bool = False

    metadata: Dict[str, Any] = field(
        default_factory=dict
    )


@dataclass(frozen=True)
class AIClassificationRequest:
    """
    Generic classification request.

    Used later by Failure Intelligence and
    other M6 engines.
    """

    system_prompt: str

    user_prompt: str

    allowed_labels: List[str]

    temperature: float = 0.0

    max_tokens: int = 500

    metadata: Dict[str, Any] = field(
        default_factory=dict
    )


@dataclass(frozen=True)
class AIClassificationResponse:
    """
    Provider-independent classification response.
    """

    label: str

    confidence: float

    explanation: str

    provider_metadata: AIProviderMetadata

    raw_response: Optional[Dict[str, Any]] = None

    warnings: List[str] = field(
        default_factory=list
    )

    def __post_init__(self) -> None:
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(
                "AI confidence must be between 0 and 1"
            )