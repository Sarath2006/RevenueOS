from enum import Enum

from pydantic import BaseModel, Field


class FailureCategory(str, Enum):
    """
    High-level payment failure classification.

    M6.3 will make this substantially more intelligent.
    """

    UNKNOWN = "UNKNOWN"
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
    CARD_DECLINED = "CARD_DECLINED"
    BANK_DECLINED = "BANK_DECLINED"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    NETWORK_ERROR = "NETWORK_ERROR"
    FRAUD_RISK = "FRAUD_RISK"
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
    EXPIRED = "EXPIRED"
    CUSTOMER_CANCELLED = "CUSTOMER_CANCELLED"
    OTHER = "OTHER"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RecoveryStrategy(str, Enum):
    """
    Canonical recovery strategies.

    M6.8 will populate the actual strategy recommendation logic.
    """

    NO_ACTION = "NO_ACTION"
    RETRY_PAYMENT = "RETRY_PAYMENT"
    PAYMENT_LINK = "PAYMENT_LINK"
    ALTERNATIVE_PAYMENT = "ALTERNATIVE_PAYMENT"
    CUSTOMER_MESSAGE = "CUSTOMER_MESSAGE"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class DiagnosisRequest(BaseModel):
    """
    Internal request entering the AI diagnosis pipeline.
    """

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

    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
    )

    failure_reason: str | None = None

    payment_method: str | None = None

    environment: str = Field(
        default="TEST"
    )

    metadata: dict[str, object] = Field(
        default_factory=dict
    )


class DiagnosisResult(BaseModel):
    """
    Canonical output of the diagnosis pipeline.

    Later milestones will progressively populate
    each field.
    """

    recovery_case_id: str

    failure_category: FailureCategory = (
        FailureCategory.UNKNOWN
    )

    risk_level: RiskLevel = RiskLevel.MEDIUM

    recovery_probability: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    recovery_priority: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
    )

    recommended_strategy: RecoveryStrategy = (
        RecoveryStrategy.NO_ACTION
    )

    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    model_name: str = "architecture-only"

    model_version: str = "0.0.0"

    fallback_used: bool = False

    explanation: str | None = None

    features: dict[str, float | int | str | bool | None] = (
        Field(default_factory=dict)
    )