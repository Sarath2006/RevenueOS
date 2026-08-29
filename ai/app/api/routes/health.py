from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings


router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
async def health_check() -> dict[str, object]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
    }