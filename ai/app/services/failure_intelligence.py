"""
============================================================
M6.3 — FAILURE INTELLIGENCE ENGINE
============================================================

Purpose
-------
Transform raw payment failure information into a normalized,
structured diagnosis that downstream AI components can use.

Pipeline:

Raw Razorpay Failure
        ↓
Normalization
        ↓
Failure Classification
        ↓
Severity
        ↓
Retryability
        ↓
Customer Impact
        ↓
Recommended Customer Action
        ↓
Signals
        ↓
Structured FailureDiagnosis

Important architectural boundary
--------------------------------
This module does NOT:

- calculate recovery probability
- calculate recovery priority
- choose the final recovery strategy
- execute recovery actions
- send customer messages
- create RecoveryCase records

Those responsibilities belong to later M6 milestones.

The output of this engine becomes input for:

M6.4 Customer Recovery Profile
M6.5 Feature Engineering
M6.6 Recovery Probability
M6.7 Recovery Priority
M6.8 Strategy Recommendation
M6.9 AI Decision Record
============================================================
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Iterable


# ============================================================
# ENUMS
# ============================================================


class FailureCategory(str, Enum):
    """
    High-level normalized failure categories.
    """

    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"

    CARD_DECLINED = "CARD_DECLINED"

    BANK_DECLINED = "BANK_DECLINED"

    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"

    FRAUD_SUSPECTED = "FRAUD_SUSPECTED"

    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"

    EXPIRED = "EXPIRED"

    NETWORK_ERROR = "NETWORK_ERROR"

    GATEWAY_ERROR = "GATEWAY_ERROR"

    BANK_UNAVAILABLE = "BANK_UNAVAILABLE"

    INVALID_PAYMENT_DETAILS = "INVALID_PAYMENT_DETAILS"

    INVALID_REQUEST = "INVALID_REQUEST"

    DUPLICATE_PAYMENT = "DUPLICATE_PAYMENT"

    TIMEOUT = "TIMEOUT"

    CANCELLED = "CANCELLED"

    UNKNOWN = "UNKNOWN"


class FailureSeverity(str, Enum):
    """
    Business severity of a payment failure.
    """

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Retryability(str, Enum):
    """
    Whether retrying the payment can reasonably succeed.
    """

    RETRYABLE = "RETRYABLE"
    CONDITIONALLY_RETRYABLE = "CONDITIONALLY_RETRYABLE"
    NOT_RETRYABLE = "NOT_RETRYABLE"
    UNKNOWN = "UNKNOWN"


class CustomerImpact(str, Enum):
    """
    Expected impact on the customer journey.
    """

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CustomerAction(str, Enum):
    """
    Immediate customer-facing resolution signal.

    This is NOT the final recovery strategy.
    """

    ADD_FUNDS = "ADD_FUNDS"

    TRY_ANOTHER_PAYMENT_METHOD = (
        "TRY_ANOTHER_PAYMENT_METHOD"
    )

    RETRY_LATER = "RETRY_LATER"

    COMPLETE_AUTHENTICATION = (
        "COMPLETE_AUTHENTICATION"
    )

    CONTACT_BANK = "CONTACT_BANK"

    VERIFY_PAYMENT_DETAILS = (
        "VERIFY_PAYMENT_DETAILS"
    )

    WAIT_FOR_BANK = "WAIT_FOR_BANK"

    CONTACT_SUPPORT = "CONTACT_SUPPORT"

    NO_ACTION = "NO_ACTION"

    UNKNOWN = "UNKNOWN"


# ============================================================
# NORMALIZED FAILURE RESULT
# ============================================================


@dataclass(frozen=True)
class FailureDiagnosis:
    """
    Immutable normalized representation of a payment failure.
    """

    category: FailureCategory

    severity: FailureSeverity

    retryability: Retryability

    customer_impact: CustomerImpact

    customer_action: CustomerAction

    reason_code: str

    normalized_reason: str

    diagnosis: str

    confidence: float

    signals: tuple[str, ...] = field(
        default_factory=tuple
    )

    raw_code: str | None = None

    raw_reason: str | None = None

    raw_description: str | None = None

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def to_dict(self) -> dict[str, Any]:
        """
        Convert the diagnosis to a JSON-safe dictionary.
        """

        return {
            "category": self.category.value,
            "severity": self.severity.value,
            "retryability": self.retryability.value,
            "customerImpact": (
                self.customer_impact.value
            ),
            "customerAction": (
                self.customer_action.value
            ),
            "reasonCode": self.reason_code,
            "normalizedReason": (
                self.normalized_reason
            ),
            "diagnosis": self.diagnosis,
            "confidence": self.confidence,
            "signals": list(self.signals),
            "rawCode": self.raw_code,
            "rawReason": self.raw_reason,
            "rawDescription": (
                self.raw_description
            ),
            "metadata": self.metadata,
        }


# ============================================================
# FAILURE RULE
# ============================================================


@dataclass(frozen=True)
class FailureRule:
    """
    Internal classification rule.

    Rules are deterministic and auditable.

    Later AI/ML components can consume the result,
    but financial classification should remain explainable.
    """

    category: FailureCategory

    keywords: tuple[str, ...]

    reason_codes: tuple[str, ...]

    severity: FailureSeverity

    retryability: Retryability

    customer_impact: CustomerImpact

    customer_action: CustomerAction

    reason_code: str

    normalized_reason: str

    diagnosis: str

    confidence: float

    signals: tuple[str, ...]


# ============================================================
# NORMALIZATION HELPERS
# ============================================================


def normalize_text(value: Any) -> str:
    """
    Normalize arbitrary provider text.

    Example:

        "Insufficient Funds"
            ↓
        "insufficient funds"
    """

    if value is None:
        return ""

    return " ".join(
        str(value)
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
        .split()
    )


def normalize_code(value: Any) -> str:
    """
    Normalize provider failure/error codes.
    """

    if value is None:
        return ""

    return (
        str(value)
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )


def clamp_confidence(value: float) -> float:
    """
    Ensure confidence remains inside [0, 1].
    """

    return max(
        0.0,
        min(1.0, float(value)),
    )


# ============================================================
# FAILURE RULES
# ============================================================


FAILURE_RULES: tuple[FailureRule, ...] = (

    # --------------------------------------------------------
    # INSUFFICIENT FUNDS
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.INSUFFICIENT_FUNDS,

        keywords=(
            "insufficient funds",
            "insufficient balance",
            "not enough balance",
            "low balance",
            "balance insufficient",
            "funds insufficient",
        ),

        reason_codes=(
            "insufficient_funds",
            "insufficient_balance",
        ),

        severity=FailureSeverity.HIGH,

        retryability=(
            Retryability.CONDITIONALLY_RETRYABLE
        ),

        customer_impact=CustomerImpact.HIGH,


        customer_action=CustomerAction.ADD_FUNDS,

        reason_code="FUNDS_INSUFFICIENT",

        normalized_reason=(
            "Insufficient available funds"
        ),

        diagnosis=(
            "The payment failed because "
            "sufficient funds were not available."
        ),

        confidence=0.96,

        signals=(
            "insufficient_balance",
            "customer_action_required",
            "retry_after_balance_change",
        ),
    ),

    # --------------------------------------------------------
    # CARD DECLINED
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.CARD_DECLINED,

        keywords=(
            "card declined",
            "declined by issuer",
            "issuer declined",
            "card payment declined",
        ),

        reason_codes=(
            "card_declined",
            "do_not_honor",
            "generic_decline",
        ),

        severity=FailureSeverity.HIGH,

        retryability=(
            Retryability.CONDITIONALLY_RETRYABLE
        ),

        customer_impact=CustomerImpact.HIGH,

        customer_action=(
            CustomerAction.TRY_ANOTHER_PAYMENT_METHOD
        ),

        reason_code="CARD_DECLINED",

        normalized_reason="Card declined",

        diagnosis=(
            "The card issuer declined the payment."
        ),

        confidence=0.94,

        signals=(
            "issuer_decline",
            "payment_method_issue",
            "alternative_method_possible",
        ),
    ),

    # --------------------------------------------------------
    # BANK DECLINED
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.BANK_DECLINED,

        keywords=(
            "bank declined",
            "bank rejected",
            "issuer rejected",
            "transaction declined by bank",
        ),

        reason_codes=(
            "bank_declined",
            "bank_rejected",
        ),

        severity=FailureSeverity.HIGH,

        retryability=(
            Retryability.CONDITIONALLY_RETRYABLE
        ),

        customer_impact=CustomerImpact.HIGH,

        customer_action=CustomerAction.CONTACT_BANK,

        reason_code="BANK_DECLINED",

        normalized_reason="Bank declined transaction",

        diagnosis=(
            "The customer's bank declined the transaction."
        ),

        confidence=0.93,

        signals=(
            "bank_decline",
            "issuer_intervention",
            "alternative_method_possible",
        ),
    ),

    # --------------------------------------------------------
    # AUTHENTICATION
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.AUTHENTICATION_FAILED,

        keywords=(
            "authentication failed",
            "authentication failure",
            "3d secure failed",
            "3ds failed",
            "otp failed",
            "authentication required",
        ),

        reason_codes=(
            "authentication_failed",
            "authentication_failure",
            "3ds_failed",
        ),

        severity=FailureSeverity.MEDIUM,

        retryability=Retryability.RETRYABLE,

        customer_impact=CustomerImpact.MEDIUM,

        customer_action=(
            CustomerAction.COMPLETE_AUTHENTICATION
        ),

        reason_code="AUTHENTICATION_FAILED",

        normalized_reason="Payment authentication failed",

        diagnosis=(
            "The payment could not be authenticated "
            "successfully."
        ),

        confidence=0.95,

        signals=(
            "authentication_failure",
            "customer_interaction_required",
            "retry_possible",
        ),
    ),

    # --------------------------------------------------------
    # FRAUD
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.FRAUD_SUSPECTED,

        keywords=(
            "fraud",
            "fraud suspected",
            "risk check failed",
            "suspected fraud",
            "fraud detection",
        ),

        reason_codes=(
            "fraud",
            "fraud_suspected",
            "risk_failure",
        ),

        severity=FailureSeverity.CRITICAL,

        retryability=Retryability.NOT_RETRYABLE,

        customer_impact=CustomerImpact.CRITICAL,

        customer_action=CustomerAction.CONTACT_SUPPORT,

        reason_code="FRAUD_RISK",

        normalized_reason="Potential fraud or risk rejection",

        diagnosis=(
            "The payment was rejected because "
            "fraud or elevated transaction risk "
            "was detected."
        ),

        confidence=0.97,

        signals=(
            "fraud_signal",
            "risk_signal",
            "do_not_automatically_retry",
        ),
    ),

    # --------------------------------------------------------
    # LIMIT
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.LIMIT_EXCEEDED,

        keywords=(
            "limit exceeded",
            "transaction limit",
            "daily limit",
            "card limit",
            "maximum transaction",
        ),

        reason_codes=(
            "limit_exceeded",
            "transaction_limit",
        ),

        severity=FailureSeverity.HIGH,

        retryability=(
            Retryability.CONDITIONALLY_RETRYABLE
        ),

        customer_impact=CustomerImpact.HIGH,

        customer_action=(
            CustomerAction.TRY_ANOTHER_PAYMENT_METHOD
        ),

        reason_code="LIMIT_EXCEEDED",

        normalized_reason="Payment limit exceeded",

        diagnosis=(
            "The payment exceeded an applicable "
            "transaction or payment limit."
        ),

        confidence=0.94,

        signals=(
            "payment_limit",
            "alternative_method_possible",
        ),
    ),

    # --------------------------------------------------------
    # EXPIRED
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.EXPIRED,

        keywords=(
            "expired",
            "payment expired",
            "session expired",
            "link expired",
        ),

        reason_codes=(
            "expired",
            "payment_expired",
            "session_expired",
        ),

        severity=FailureSeverity.MEDIUM,

        retryability=Retryability.RETRYABLE,

        customer_impact=CustomerImpact.MEDIUM,

        customer_action=CustomerAction.RETRY_LATER,

        reason_code="PAYMENT_EXPIRED",

        normalized_reason="Payment session expired",

        diagnosis=(
            "The payment attempt expired before "
            "completion."
        ),

        confidence=0.96,

        signals=(
            "expiration",
            "new_payment_attempt_possible",
        ),
    ),

    # --------------------------------------------------------
    # NETWORK
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.NETWORK_ERROR,

        keywords=(
            "network error",
            "network failure",
            "connection error",
            "connection failed",
        ),

        reason_codes=(
            "network_error",
            "network_failure",
        ),

        severity=FailureSeverity.MEDIUM,

        retryability=Retryability.RETRYABLE,

        customer_impact=CustomerImpact.MEDIUM,

        customer_action=CustomerAction.RETRY_LATER,

        reason_code="NETWORK_FAILURE",

        normalized_reason="Network failure",

        diagnosis=(
            "The payment failed because of "
            "a temporary network problem."
        ),

        confidence=0.91,

        signals=(
            "technical_failure",
            "temporary_failure",
            "retry_possible",
        ),
    ),

    # --------------------------------------------------------
    # GATEWAY
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.GATEWAY_ERROR,

        keywords=(
            "gateway error",
            "gateway failure",
            "payment gateway error",
        ),

        reason_codes=(
            "gateway_error",
            "gateway_failure",
        ),

        severity=FailureSeverity.HIGH,

        retryability=Retryability.RETRYABLE,

        customer_impact=CustomerImpact.MEDIUM,

        customer_action=CustomerAction.RETRY_LATER,

        reason_code="GATEWAY_ERROR",

        normalized_reason="Payment gateway failure",

        diagnosis=(
            "The payment gateway encountered "
            "a temporary processing failure."
        ),

        confidence=0.92,

        signals=(
            "gateway_failure",
            "technical_failure",
            "retry_possible",
        ),
    ),

    # --------------------------------------------------------
    # BANK UNAVAILABLE
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.BANK_UNAVAILABLE,

        keywords=(
            "bank unavailable",
            "bank server unavailable",
            "bank service unavailable",
            "bank temporarily unavailable",
        ),

        reason_codes=(
            "bank_unavailable",
            "bank_server_error",
        ),

        severity=FailureSeverity.MEDIUM,

        retryability=Retryability.RETRYABLE,

        customer_impact=CustomerImpact.MEDIUM,

        customer_action=CustomerAction.WAIT_FOR_BANK,

        reason_code="BANK_UNAVAILABLE",

        normalized_reason="Bank service temporarily unavailable",

        diagnosis=(
            "The customer's bank was temporarily "
            "unavailable."
        ),

        confidence=0.93,

        signals=(
            "bank_outage",
            "temporary_failure",
            "retry_possible",
        ),
    ),

    # --------------------------------------------------------
    # INVALID DETAILS
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.INVALID_PAYMENT_DETAILS,

        keywords=(
            "invalid card",
            "invalid details",
            "invalid payment details",
            "incorrect card details",
            "invalid expiry",
            "invalid cvv",
        ),

        reason_codes=(
            "invalid_details",
            "invalid_card",
            "invalid_payment_details",
        ),

        severity=FailureSeverity.MEDIUM,

        retryability=(
            Retryability.CONDITIONALLY_RETRYABLE
        ),

        customer_impact=CustomerImpact.MEDIUM,

        customer_action=(
            CustomerAction.VERIFY_PAYMENT_DETAILS
        ),

        reason_code="INVALID_PAYMENT_DETAILS",

        normalized_reason="Invalid payment details",

        diagnosis=(
            "The supplied payment details "
            "could not be validated."
        ),

        confidence=0.95,

        signals=(
            "payment_details_error",
            "customer_correction_required",
        ),
    ),

    # --------------------------------------------------------
    # INVALID REQUEST
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.INVALID_REQUEST,

        keywords=(
            "invalid request",
            "bad request",
            "invalid parameter",
            "invalid payment request",
        ),

        reason_codes=(
            "invalid_request",
            "bad_request",
        ),

        severity=FailureSeverity.HIGH,

        retryability=Retryability.NOT_RETRYABLE,

        customer_impact=CustomerImpact.LOW,

        customer_action=CustomerAction.CONTACT_SUPPORT,

        reason_code="INVALID_REQUEST",

        normalized_reason="Invalid payment request",

        diagnosis=(
            "The payment request contained invalid "
            "or unsupported information."
        ),

        confidence=0.92,

        signals=(
            "request_error",
            "merchant_or_integration_issue",
            "do_not_retry_without_correction",
        ),
    ),

    # --------------------------------------------------------
    # DUPLICATE
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.DUPLICATE_PAYMENT,

        keywords=(
            "duplicate payment",
            "duplicate transaction",
            "already processed",
        ),

        reason_codes=(
            "duplicate",
            "duplicate_payment",
        ),

        severity=FailureSeverity.MEDIUM,

        retryability=Retryability.NOT_RETRYABLE,

        customer_impact=CustomerImpact.LOW,

        customer_action=CustomerAction.NO_ACTION,

        reason_code="DUPLICATE_PAYMENT",

        normalized_reason="Duplicate payment attempt",

        diagnosis=(
            "The payment was identified as "
            "a duplicate transaction."
        ),

        confidence=0.96,

        signals=(
            "duplicate_transaction",
            "do_not_retry",
        ),
    ),

    # --------------------------------------------------------
    # TIMEOUT
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.TIMEOUT,

        keywords=(
            "timeout",
            "timed out",
            "request timeout",
            "payment timeout",
        ),

        reason_codes=(
            "timeout",
            "request_timeout",
            "payment_timeout",
        ),

        severity=FailureSeverity.MEDIUM,

        retryability=Retryability.RETRYABLE,

        customer_impact=CustomerImpact.MEDIUM,

        customer_action=CustomerAction.RETRY_LATER,

        reason_code="PAYMENT_TIMEOUT",

        normalized_reason="Payment processing timed out",

        diagnosis=(
            "The payment processing request "
            "timed out before completion."
        ),

        confidence=0.94,

        signals=(
            "technical_failure",
            "timeout",
            "retry_possible",
        ),
    ),

    # --------------------------------------------------------
    # CANCELLED
    # --------------------------------------------------------

    FailureRule(
        category=FailureCategory.CANCELLED,

        keywords=(
            "cancelled",
            "canceled",
            "payment cancelled",
            "payment canceled",
        ),

        reason_codes=(
            "cancelled",
            "canceled",
        ),

        severity=FailureSeverity.LOW,

        retryability=Retryability.RETRYABLE,

        customer_impact=CustomerImpact.LOW,

        customer_action=CustomerAction.NO_ACTION,

        reason_code="PAYMENT_CANCELLED",

        normalized_reason="Payment cancelled",

        diagnosis=(
            "The payment attempt was cancelled "
            "before successful completion."
        ),

        confidence=0.96,

        signals=(
            "customer_cancelled",
            "new_payment_attempt_possible",
        ),
    ),
)


# ============================================================
# ENGINE
# ============================================================


class FailureIntelligenceEngine:
    """
    Main M6.3 failure classification engine.

    Design principles:

    1. deterministic
    2. explainable
    3. provider-independent output
    4. safe fallback
    5. easy to test
    6. easy to extend
    """

    def __init__(
        self,
        rules: Iterable[FailureRule] = FAILURE_RULES,
    ) -> None:

        self.rules = tuple(rules)

    # ========================================================
    # PUBLIC API
    # ========================================================

    def diagnose(
        self,
        *,
        code: Any = None,
        reason: Any = None,
        description: Any = None,
        source: str = "unknown",
        metadata: dict[str, Any] | None = None,
    ) -> FailureDiagnosis:
        """
        Diagnose a payment failure.

        Example:

            engine.diagnose(
                code="insufficient_funds",
                reason="Insufficient funds",
                description="Customer balance too low",
                source="razorpay",
            )
        """

        normalized_code = normalize_code(code)

        normalized_reason_text = normalize_text(
            reason
        )

        normalized_description = normalize_text(
            description
        )

        combined_text = " ".join(
            value
            for value in (
                normalized_code.replace(
                    "_",
                    " ",
                ),
                normalized_reason_text,
                normalized_description,
            )
            if value
        )

        rule = self._find_rule(
            normalized_code,
            combined_text,
        )

        if rule is None:
            return self._unknown_failure(
                code=code,
                reason=reason,
                description=description,
                source=source,
                metadata=metadata,
            )

        return FailureDiagnosis(
            category=rule.category,

            severity=rule.severity,

            retryability=rule.retryability,

            customer_impact=rule.customer_impact,

            customer_action=rule.customer_action,

            reason_code=rule.reason_code,

            normalized_reason=(
                rule.normalized_reason
            ),

            diagnosis=rule.diagnosis,

            confidence=clamp_confidence(
                rule.confidence
            ),

            signals=tuple(
                rule.signals
            ),

            raw_code=(
                str(code)
                if code is not None
                else None
            ),

            raw_reason=(
                str(reason)
                if reason is not None
                else None
            ),

            raw_description=(
                str(description)
                if description is not None
                else None
            ),

            metadata={
                "source": source,
                **(
                    metadata
                    if metadata
                    else {}
                ),
            },
        )

    # ========================================================
    # RULE MATCHING
    # ========================================================

    def _find_rule(
        self,
        code: str,
        combined_text: str,
    ) -> FailureRule | None:

        best_rule: FailureRule | None = None

        best_score = 0

        for rule in self.rules:

            score = 0

            # Exact provider code match
            if code and code in rule.reason_codes:
                score += 100

            # Keyword matching
            for keyword in rule.keywords:

                normalized_keyword = normalize_text(
                    keyword
                )

                if (
                    normalized_keyword
                    and normalized_keyword
                    in combined_text
                ):
                    score += 10

            if score > best_score:
                best_score = score
                best_rule = rule

        return best_rule

    # ========================================================
    # UNKNOWN FAILURE
    # ========================================================

    def _unknown_failure(
        self,
        *,
        code: Any,
        reason: Any,
        description: Any,
        source: str,
        metadata: dict[str, Any] | None,
    ) -> FailureDiagnosis:

        return FailureDiagnosis(
            category=FailureCategory.UNKNOWN,

            severity=FailureSeverity.MEDIUM,

            retryability=Retryability.UNKNOWN,

            customer_impact=CustomerImpact.MEDIUM,

            customer_action=CustomerAction.CONTACT_SUPPORT,

            reason_code="UNKNOWN_FAILURE",

            normalized_reason=(
                "Unclassified payment failure"
            ),

            diagnosis=(
                "The payment failed for a reason "
                "that could not be confidently "
                "classified."
            ),

            confidence=0.35,

            signals=(
                "unknown_failure",
                "requires_further_analysis",
                "safe_fallback",
            ),

            raw_code=(
                str(code)
                if code is not None
                else None
            ),

            raw_reason=(
                str(reason)
                if reason is not None
                else None
            ),

            raw_description=(
                str(description)
                if description is not None
                else None
            ),

            metadata={
                "source": source,
                **(
                    metadata
                    if metadata
                    else {}
                ),
            },
        )


# ============================================================
# DEFAULT ENGINE
# ============================================================


failure_intelligence_engine = (
    FailureIntelligenceEngine()
)


# ============================================================
# CONVENIENCE FUNCTION
# ============================================================


def diagnose_payment_failure(
    *,
    code: Any = None,
    reason: Any = None,
    description: Any = None,
    source: str = "unknown",
    metadata: dict[str, Any] | None = None,
) -> FailureDiagnosis:
    """
    Application-level convenience API.
    """

    return failure_intelligence_engine.diagnose(
        code=code,
        reason=reason,
        description=description,
        source=source,
        metadata=metadata,
    )