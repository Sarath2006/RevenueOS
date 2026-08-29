from app.models.customer import CustomerContext
from app.models.decision import (
    DiagnosisRequest,
    DiagnosisResult,
)
from app.models.payment import PaymentContext
from app.models.recovery_case import RecoveryCaseContext
from app.services.diagnosis_engine import DiagnosisEngine


class DecisionEngine:
    """
    Public application-level entry point for AI decisions.

    DiagnosisEngine handles the diagnosis pipeline.

    DecisionEngine will later coordinate:
        diagnosis
        risk
        probability
        priority
        strategy
        confidence
        policy
        audit
    """

    def __init__(
        self,
        diagnosis_engine: DiagnosisEngine | None = None,
    ) -> None:

        self.diagnosis_engine = (
            diagnosis_engine
            or DiagnosisEngine()
        )

    async def decide(
        self,
        request: DiagnosisRequest,
        payment: PaymentContext | None = None,
        customer: CustomerContext | None = None,
        recovery_case: RecoveryCaseContext | None = None,
    ) -> DiagnosisResult:

        return await self.diagnosis_engine.diagnose(
            request=request,
            payment=payment,
            customer=customer,
            recovery_case=recovery_case,
        )