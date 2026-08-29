from fastapi import Header, HTTPException, status

from app.core.config import settings


async def verify_ai_service_key(
    x_ai_service_key: str | None = Header(
        default=None,
        alias="X-AI-Service-Key",
    ),
) -> None:
    """
    Protect internal AI endpoints.

    In development, an empty API key is allowed.
    In production, configure AI_SERVICE_API_KEY.
    """

    if settings.app_env.lower() == "development":
        return

    if not settings.ai_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service authentication is not configured",
        )

    if x_ai_service_key != settings.ai_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AI service credentials",
        )