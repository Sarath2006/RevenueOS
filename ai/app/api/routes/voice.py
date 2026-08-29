from fastapi import APIRouter


router = APIRouter(
    prefix="/voice",
    tags=["Voice"],
)


@router.get("/health")
async def voice_health():
    return {
        "status": "available",
        "module": "voice",
    }