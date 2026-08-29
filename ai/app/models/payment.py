from pydantic import BaseModel, Field


class PaymentContext(BaseModel):
    """
    Normalized payment information used by diagnosis.
    """

    payment_id: str | None = None

    razorpay_payment_id: str | None = None

    razorpay_order_id: str | None = None

    amount: float = Field(
        default=0.0,
        ge=0,
    )

    currency: str = "INR"

    status: str = "FAILED"

    method: str | None = None

    failure_reason: str | None = None

    environment: str = "TEST"

    metadata: dict[str, object] = Field(
        default_factory=dict
    )