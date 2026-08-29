from pydantic import BaseModel, Field


class CustomerContext(BaseModel):
    """
    Normalized customer information supplied to the AI layer.

    This is intentionally provider/model independent.
    """

    customer_id: str | None = None

    email: str | None = None

    phone: str | None = None

    total_payments: int = Field(
        default=0,
        ge=0,
    )

    successful_payments: int = Field(
        default=0,
        ge=0,
    )

    failed_payments: int = Field(
        default=0,
        ge=0,
    )

    previous_recoveries: int = Field(
        default=0,
        ge=0,
    )

    previous_recovery_amount: float = Field(
        default=0.0,
        ge=0,
    )

    lifetime_value: float = Field(
        default=0.0,
        ge=0,
    )

    average_payment_amount: float = Field(
        default=0.0,
        ge=0,
    )

    metadata: dict[str, object] = Field(
        default_factory=dict
    )