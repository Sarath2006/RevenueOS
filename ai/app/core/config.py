from __future__ import annotations

import os
from dataclasses import dataclass

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for the RevenueOS AI service.

    Environment variables are loaded from .env.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(
        default="RevenueOS AI Service"
    )

    app_env: str = Field(
        default="development"
    )

    app_version: str = Field(
        default="0.1.0"
    )

    host: str = Field(
        default="0.0.0.0"
    )

    port: int = Field(
        default=8001,
        ge=1,
        le=65535,
    )

    log_level: str = Field(
        default="INFO"
    )

    ai_service_api_key: str | None = Field(
        default=None
    )

    backend_base_url: str = Field(
        default="http://localhost:4000"
    )

    ai_request_timeout_seconds: float = Field(
        default=15.0,
        gt=0,
    )

    model_name: str = Field(
        default="revenueos-risk-v1"
    )

    model_version: str = Field(
        default="1.0.0"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()





settings = get_settings()


@dataclass(frozen=True)
class AIConfig:
    """
    Central AI configuration.
    """

    provider: str = "mock"

    model: str = "gpt-4o-mini"

    timeout_seconds: float = 15.0

    max_tokens: int = 500

    temperature: float = 0.0

    minimum_confidence: float = 0.60


def load_ai_config() -> AIConfig:

    return AIConfig(
        provider=os.getenv(
            "AI_PROVIDER",
            "mock",
        ),

        model=os.getenv(
            "AI_MODEL",
            "gpt-4o-mini",
        ),

        timeout_seconds=float(
            os.getenv(
                "AI_TIMEOUT_SECONDS",
                "15",
            )
        ),

        max_tokens=int(
            os.getenv(
                "AI_MAX_TOKENS",
                "500",
            )
        ),

        temperature=float(
            os.getenv(
                "AI_TEMPERATURE",
                "0",
            )
        ),

        minimum_confidence=float(
            os.getenv(
                "AI_MIN_CONFIDENCE",
                "0.60",
            )
        ),
    )