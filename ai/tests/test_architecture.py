import pytest

from app.models.decision import (
    DiagnosisRequest,
    FailureCategory,
    RecoveryStrategy,
    RiskLevel,
)
from app.services.decision_engine import DecisionEngine


@pytest.mark.asyncio
async def test_diagnosis_architecture():

    request = DiagnosisRequest(
        merchant_id="merchant_test",

        recovery_case_id="case_test",

        payment_id="payment_test",

        customer_id="customer_test",

        amount_at_risk=500.0,

        currency="INR",

        failure_reason="insufficient funds",

        payment_method="card",

        environment="TEST",
    )

    engine = DecisionEngine()

    result = await engine.decide(
        request
    )

    assert (
        result.recovery_case_id
        == "case_test"
    )

    assert (
        result.failure_category
        == FailureCategory.UNKNOWN
    )

    assert (
        result.risk_level
        == RiskLevel.MEDIUM
    )

    assert (
        result.recommended_strategy
        == RecoveryStrategy.NO_ACTION
    )

    assert (
        result.model_name
        == "architecture-only"
    )