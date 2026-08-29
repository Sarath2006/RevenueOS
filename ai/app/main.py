from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.lab import router as lab_router
from app.api.routes.recovery import router as recovery_router
from app.core.config import settings
from app.core.logging import (
    configure_logging,
    get_logger,
)

from app.api.routes.customer_profile import (
    router as customer_profile_router,
)


configure_logging()

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(
    app: FastAPI,
):
    logger.info(
        "Starting %s v%s",
        settings.app_name,
        settings.app_version,
    )

    logger.info(
        "Environment: %s",
        settings.app_env,
    )

    yield

    logger.info(
        "Shutting down %s",
        settings.app_name,
    )


app = FastAPI(
    title=settings.app_name,

    version=settings.app_version,

    description=(
        "RevenueOS AI diagnosis, risk and "
        "recovery decision service."
    ),

    lifespan=lifespan,
)


app.include_router(
    health_router
)

app.include_router(
    recovery_router
)

app.include_router(
    lab_router
)

app.include_router(
    customer_profile_router
)


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "architecture": "M6.1",
    }