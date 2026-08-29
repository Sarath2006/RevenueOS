from app.core.logging import get_logger
from app.models.customer import CustomerContext
from app.models.decision import (
    DiagnosisRequest,
    DiagnosisResult,
)
from app.models.payment import PaymentContext
from app.models.recovery_case import RecoveryCaseContext
from app.services.feature_builder import FeatureBuilder


logger = get_logger(__name__)


class DiagnosisEngine:
    """
    Central orchestrator for RevenueOS AI diagnosis.

    M6.1:
        Architecture + orchestration.

    Future:
        M6.3 Failure Intelligence
        M6.4 Customer Recovery Profile
        M6.5 Feature Engineering
        M6.6 Recovery Probability
        M6.7 Recovery Priority
        M6.8 Strategy
        M6.11 Confidence/Fallback
        M6.13 Policy
        M6.14 Versioning
    """

    def __init__(
        self,
        feature_builder: FeatureBuilder | None = None,
    ) -> None:

        self.feature_builder = (
            feature_builder
            or FeatureBuilder()
        )

    async def diagnose(
        self,
        request: DiagnosisRequest,
        payment: PaymentContext | None = None,
        customer: CustomerContext | None = None,
        recovery_case: RecoveryCaseContext | None = None,
    ) -> DiagnosisResult:

        logger.info(
            "Starting AI diagnosis for recovery_case=%s",
            request.recovery_case_id,
        )

        features = self.feature_builder.build(
            request=request,
            payment=payment,
            customer=customer,
            recovery_case=recovery_case,
        )

        result = DiagnosisResult(
            recovery_case_id=request.recovery_case_id,

            features=features,

            model_name="architecture-only",

            model_version="0.0.0",

            explanation=(
                "M6.1 architecture pipeline executed. "
                "AI diagnosis components will be enabled "
                "in subsequent M6 milestones."
            ),
        )

        logger.info(
            "AI diagnosis architecture pipeline completed "
            "for recovery_case=%s",
            request.recovery_case_id,
        )

        return result