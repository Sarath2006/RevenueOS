"""
RevenueOS AI Provider Layer.

This package contains provider-independent AI
interfaces and concrete AI provider implementations.
"""

from .base import AIProvider
from .factory import get_ai_provider
from .types import (
    AIClassificationRequest,
    AIClassificationResponse,
    AIProviderMetadata,
)

__all__ = [
    "AIProvider",
    "get_ai_provider",
    "AIClassificationRequest",
    "AIClassificationResponse",
    "AIProviderMetadata",
]