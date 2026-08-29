from pydantic import BaseModel, Field

from app.models.decision import DiagnosisResult


class RecoveryDiagnosisRequest(BaseModel):
    merchant_id: str = Field(
        min_length=1
    )

    recovery_case_id: str = Field(
        min_length=1
    )

    payment_id: str | None = None

    customer_id: str | None = None

    amount_at_risk: float = Field(
        ge=0
    )

    currency: str = "INR"

    failure_reason: str | None = None

    payment_method: str | None = None

    environment: str = "TEST"

    metadata: dict[str, object] = Field(
        default_factory=dict
    )


class RecoveryDiagnosisResponse(BaseModel):
    success: bool = True

    result: DiagnosisResult