from pydantic import BaseModel, Field


class RecoveryCaseContext(BaseModel):
    """
    Normalized recovery-case context.

    This keeps the AI layer independent from Prisma.
    """

    recovery_case_id: str

    merchant_id: str

    payment_id: str | None = None

    customer_id: str | None = None

    amount_at_risk: float = Field(
        ge=0
    )

    recovered_amount: float = Field(
        default=0.0,
        ge=0,
    )

    status: str = "OPEN"

    failure_reason: str | None = None

    created_at: str | None = None

    metadata: dict[str, object] = Field(
        default_factory=dict
    )