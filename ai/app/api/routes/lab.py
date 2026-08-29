from fastapi import APIRouter

from app.models.decision import DiagnosisRequest
from app.services.decision_engine import DecisionEngine


router = APIRouter(
    prefix="/lab",
    tags=["AI Lab"],
)


decision_engine = DecisionEngine()


@router.post("/diagnosis")
async def run_diagnosis_lab(
    request: DiagnosisRequest,
):
    """
    Development-only endpoint for testing
    the AI architecture.

    Production traffic should eventually use
    the recovery API.
    """

    return await decision_engine.decide(
        request
    )