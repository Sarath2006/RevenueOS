"""
============================================================
RevenueOS AI Provider Interface
============================================================

All AI providers must implement this interface.

Business logic talks ONLY to this interface.

It does not know whether the underlying provider is:

- OpenAI
- Gemini
- local model
- mock provider
- future provider
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from .types import (
    AIClassificationRequest,
    AIClassificationResponse,
)


class AIProvider(ABC):
    """
    Provider-independent AI interface.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """
        Human-readable provider identifier.
        """
        raise NotImplementedError

    @property
    @abstractmethod
    def model_name(self) -> str:
        """
        Model identifier.
        """
        raise NotImplementedError

    @abstractmethod
    async def classify(
        self,
        request: AIClassificationRequest,
    ) -> AIClassificationResponse:
        """
        Perform structured classification.
        """
        raise NotImplementedError