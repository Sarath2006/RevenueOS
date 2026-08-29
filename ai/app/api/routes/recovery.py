from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.models.decision import DiagnosisRequest
from app.schemas.recovery import (
    RecoveryDiagnosisRequest,
    RecoveryDiagnosisResponse,
)
from app.services.decision_engine import DecisionEngine

from app.schemas.feature_engineering import (
    FeatureEngineeringRequest,
    FeatureEngineeringResponse,
)

from app.services.feature_engineering import (
    feature_engineering_service,
)

router = APIRouter(
    prefix="/recovery",
    tags=["Recovery AI"],
)


decision_engine = DecisionEngine()


@router.post(
    "/diagnose",
    response_model=RecoveryDiagnosisResponse,
    dependencies=[
        Depends(verify_ai_service_key)
    ],
)
async def diagnose_recovery(
    request: RecoveryDiagnosisRequest,
) -> RecoveryDiagnosisResponse:

    diagnosis_request = DiagnosisRequest(
        merchant_id=request.merchant_id,

        recovery_case_id=
            request.recovery_case_id,

        payment_id=
            request.payment_id,

        customer_id=
            request.customer_id,

        amount_at_risk=
            request.amount_at_risk,

        currency=
            request.currency,

        failure_reason=
            request.failure_reason,

        payment_method=
            request.payment_method,

        environment=
            request.environment,

        metadata=
            request.metadata,
    )

    result = await decision_engine.decide(
        diagnosis_request
    )

    return RecoveryDiagnosisResponse(
        success=True,
        result=result,
    )

@router.post(
    "/customer-features",
    response_model=FeatureEngineeringResponse,
    summary="Generate customer recovery features",
    tags=["AI Feature Engineering"],
)
def generate_customer_features(
    request: FeatureEngineeringRequest,
) -> FeatureEngineeringResponse:

    return feature_engineering_service.build(
        request
    )

