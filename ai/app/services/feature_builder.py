from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from app.models.customer import CustomerContext
from app.models.decision import DiagnosisRequest
from app.models.payment import PaymentContext
from app.models.recovery_case import RecoveryCaseContext
from app.schemas.feature_engineering import (
    FeatureEngineeringRequest,
    FeatureEngineeringResponse,
)


FEATURE_VERSION = "m6.5-v1.0"


SUCCESS_STATUSES = {
    "captured",
    "success",
    "successful",
    "paid",
    "completed",
}

FAILED_STATUSES = {
    "failed",
    "failure",
    "declined",
    "cancelled",
    "canceled",
}

PENDING_STATUSES = {
    "pending",
    "processing",
    "created",
    "authorized",
}

RECOVERED_CASE_STATUSES = {
    "recovered",
    "closed",
}

ACTIVE_CASE_STATUSES = {
    "open",
    "pending",
    "in_progress",
    "processing",
    "retrying",
    "active",
}


def _safe_divide(
    numerator: float,
    denominator: float,
) -> float:
    if denominator <= 0:
        return 0.0

    return numerator / denominator


def _clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 1.0,
) -> float:
    return max(minimum, min(value, maximum))


def _normalize_status(
    value: Optional[str],
) -> str:
    if not value:
        return ""

    return value.strip().lower()


def _normalize_payment_method(
    value: Optional[str],
) -> str:
    if not value:
        return "unknown"

    normalized = value.strip().lower()

    return normalized or "unknown"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(
    value: datetime,
) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _days_since(
    value: Optional[datetime],
    now: datetime,
) -> Optional[int]:

    if value is None:
        return None

    value = _ensure_utc(value)

    delta = now - value

    return max(0, delta.days)


def _calculate_streak(
    transactions,
    target_statuses: set[str],
) -> int:

    ordered = sorted(
        transactions,
        key=lambda transaction: _ensure_utc(
            transaction.created_at
        ),
        reverse=True,
    )

    streak = 0

    for transaction in ordered:

        status = _normalize_status(
            transaction.status
        )

        if status in target_statuses:
            streak += 1
        else:
            break

    return streak


def _calculate_recent_counts(
    transactions,
    target_statuses: set[str],
    days: int,
    now: datetime,
) -> int:

    count = 0

    for transaction in transactions:

        created_at = _ensure_utc(
            transaction.created_at
        )

        age_days = (
            now - created_at
        ).total_seconds() / 86400

        if (
            0 <= age_days <= days
            and _normalize_status(
                transaction.status
            ) in target_statuses
        ):
            count += 1

    return count


def _calculate_customer_segment(
    transaction_count: int,
    successful_rate: float,
    failure_rate: float,
    historical_recovery_rate: float,
    active_recovery_cases: int,
    failed_amount_ratio: float,
) -> str:

    if transaction_count == 0:
        return "UNKNOWN"

    if (
        active_recovery_cases > 0
        and failure_rate >= 0.50
    ):
        return "HIGH_RISK"

    if (
        failure_rate >= 0.30
        or failed_amount_ratio >= 0.40
    ):
        return "AT_RISK"

    if (
        successful_rate >= 0.80
        and historical_recovery_rate >= 0.50
    ):
        return "LOYAL"

    if successful_rate >= 0.75:
        return "HEALTHY"

    if historical_recovery_rate > 0:
        return "RECOVERABLE"

    return "NORMAL"


def _calculate_data_completeness(
    request: FeatureEngineeringRequest,
) -> float:

    checks = [
        bool(request.customer_id),
        bool(request.merchant_id),
        bool(request.currency),
        len(request.transactions) > 0,
        all(
            transaction.created_at is not None
            for transaction in request.transactions
        ),
    ]

    if not checks:
        return 0.0

    return round(
        sum(checks) / len(checks),
        4,
    )


def build_feature_vector(
    request: FeatureEngineeringRequest,
) -> FeatureEngineeringResponse:

    now = _utc_now()

    transactions = list(
        request.transactions
    )

    recovery_cases = list(
        request.recovery_cases
    )

    # =========================================================
    # TRANSACTION NORMALIZATION
    # =========================================================

    successful_transactions = []

    failed_transactions = []

    pending_transactions = []

    for transaction in transactions:

        status = _normalize_status(
            transaction.status
        )

        if status in SUCCESS_STATUSES:
            successful_transactions.append(
                transaction
            )

        elif status in FAILED_STATUSES:
            failed_transactions.append(
                transaction
            )

        elif status in PENDING_STATUSES:
            pending_transactions.append(
                transaction
            )

    transaction_count = len(
        transactions
    )

    successful_count = len(
        successful_transactions
    )

    failed_count = len(
        failed_transactions
    )

    pending_count = len(
        pending_transactions
    )

    total_transaction_value = sum(
        max(0.0, float(transaction.amount))
        for transaction in transactions
    )

    successful_transaction_value = sum(
        max(0.0, float(transaction.amount))
        for transaction in successful_transactions
    )

    failed_transaction_value = sum(
        max(0.0, float(transaction.amount))
        for transaction in failed_transactions
    )

    transaction_amounts = [
        max(0.0, float(transaction.amount))
        for transaction in transactions
    ]

    average_transaction_value = _safe_divide(
        total_transaction_value,
        transaction_count,
    )

    average_successful_transaction_value = (
        _safe_divide(
            successful_transaction_value,
            successful_count,
        )
    )

    average_failed_transaction_value = (
        _safe_divide(
            failed_transaction_value,
            failed_count,
        )
    )

    max_transaction_value = (
        max(transaction_amounts)
        if transaction_amounts
        else 0.0
    )

    min_transaction_value = (
        min(transaction_amounts)
        if transaction_amounts
        else 0.0
    )

    successful_rate = _safe_divide(
        successful_count,
        transaction_count,
    )

    failure_rate = _safe_divide(
        failed_count,
        transaction_count,
    )

    pending_rate = _safe_divide(
        pending_count,
        transaction_count,
    )

    # =========================================================
    # PAYMENT METHODS
    # =========================================================

    payment_method_counts: Dict[
        str,
        int,
    ] = Counter()

    payment_method_successes: Dict[
        str,
        int,
    ] = defaultdict(int)

    for transaction in transactions:

        method = _normalize_payment_method(
            transaction.payment_method
        )

        payment_method_counts[
            method
        ] += 1

        if transaction in successful_transactions:
            payment_method_successes[
                method
            ] += 1

    preferred_payment_method = None

    if payment_method_counts:

        preferred_payment_method = max(
            payment_method_counts,
            key=payment_method_counts.get,
        )

    preferred_payment_method_success_rate = 0.0

    if preferred_payment_method:

        preferred_payment_method_success_rate = (
            _safe_divide(
                payment_method_successes[
                    preferred_payment_method
                ],
                payment_method_counts[
                    preferred_payment_method
                ],
            )
        )

    payment_method_diversity = len(
        payment_method_counts
    )

    # =========================================================
    # RECOVERY
    # =========================================================

    recovery_case_count = len(
        recovery_cases
    )

    recovered_cases = [
        case
        for case in recovery_cases
        if _normalize_status(case.status)
        in RECOVERED_CASE_STATUSES
    ]

    active_cases = [
        case
        for case in recovery_cases
        if _normalize_status(case.status)
        in ACTIVE_CASE_STATUSES
    ]

    total_amount_at_risk = sum(
        max(
            0.0,
            float(case.amount_at_risk),
        )
        for case in recovery_cases
    )

    total_recovered_amount = sum(
        max(
            0.0,
            float(case.recovered_amount),
        )
        for case in recovery_cases
    )

    outstanding_recovery_amount = max(
        0.0,
        total_amount_at_risk
        - total_recovered_amount,
    )

    historical_recovery_rate = _safe_divide(
        len(recovered_cases),
        recovery_case_count,
    )

    average_recovery_amount = _safe_divide(
        total_recovered_amount,
        recovery_case_count,
    )

    recovery_ratios = []

    for case in recovery_cases:

        risk = max(
            0.0,
            float(case.amount_at_risk),
        )

        recovered = max(
            0.0,
            float(case.recovered_amount),
        )

        if risk > 0:
            recovery_ratios.append(
                _clamp(
                    recovered / risk
                )
            )

    average_recovery_ratio = (
        sum(recovery_ratios)
        / len(recovery_ratios)
        if recovery_ratios
        else 0.0
    )

    recovery_efficiency = _clamp(
        _safe_divide(
            total_recovered_amount,
            total_amount_at_risk,
        )
    )

    # =========================================================
    # TEMPORAL FEATURES
    # =========================================================

    sorted_transactions = sorted(
        transactions,
        key=lambda transaction:
            _ensure_utc(
                transaction.created_at
            ),
    )

    last_transaction_at = (
        sorted_transactions[-1].created_at
        if sorted_transactions
        else None
    )

    successful_dates = [
        transaction.created_at
        for transaction in successful_transactions
    ]

    failed_dates = [
        transaction.created_at
        for transaction in failed_transactions
    ]

    last_success_at = (
        max(successful_dates)
        if successful_dates
        else None
    )

    last_failure_at = (
        max(failed_dates)
        if failed_dates
        else None
    )

    recovered_dates = [
        case.created_at
        for case in recovered_cases
    ]

    last_recovery_at = (
        max(recovered_dates)
        if recovered_dates
        else None
    )

    # =========================================================
    # BEHAVIORAL FEATURES
    # =========================================================

    failure_streak = _calculate_streak(
        transactions,
        FAILED_STATUSES,
    )

    success_streak = _calculate_streak(
        transactions,
        SUCCESS_STATUSES,
    )

    recent_failure_count_7d = (
        _calculate_recent_counts(
            transactions,
            FAILED_STATUSES,
            7,
            now,
        )
    )

    recent_success_count_7d = (
        _calculate_recent_counts(
            transactions,
            SUCCESS_STATUSES,
            7,
            now,
        )
    )

    recent_failure_count_30d = (
        _calculate_recent_counts(
            transactions,
            FAILED_STATUSES,
            30,
            now,
        )
    )

    recent_success_count_30d = (
        _calculate_recent_counts(
            transactions,
            SUCCESS_STATUSES,
            30,
            now,
        )
    )

    # =========================================================
    # CURRENT FAILURE / RISK FEATURES
    # =========================================================

    current_failed_amount = (
        failed_transactions[-1].amount
        if failed_transactions
        else 0.0
    )

    current_failed_amount_ratio = _safe_divide(
        current_failed_amount,
        total_transaction_value,
    )

    active_risk_ratio = _safe_divide(
        outstanding_recovery_amount,
        max(
            total_transaction_value,
            outstanding_recovery_amount,
        ),
    )

    failure_frequency_30d = _safe_divide(
        recent_failure_count_30d,
        max(
            recent_success_count_30d
            + recent_failure_count_30d,
            1,
        ),
    )

    # =========================================================
    # CUSTOMER SEGMENT
    # =========================================================

    customer_segment = (
        _calculate_customer_segment(
            transaction_count,
            successful_rate,
            failure_rate,
            historical_recovery_rate,
            len(active_cases),
            current_failed_amount_ratio,
        )
    )

    # =========================================================
    # DATA SOURCES
    # =========================================================

    data_sources = [
        "transaction",
    ]

    if recovery_cases:
        data_sources.append(
            "recovery_case"
        )

    if any(
        transaction.payment_method
        for transaction in transactions
    ):
        data_sources.append(
            "payment_method"
        )

    data_completeness = (
        _calculate_data_completeness(
            request
        )
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return FeatureEngineeringResponse(

        customer_id=request.customer_id,

        merchant_id=request.merchant_id,

        currency=request.currency.upper(),

        feature_version=FEATURE_VERSION,

        generated_at=now,

        transaction_count=transaction_count,

        successful_transaction_count=successful_count,

        failed_transaction_count=failed_count,

        pending_transaction_count=pending_count,

        successful_transaction_rate=round(
            successful_rate,
            4,
        ),

        failure_rate=round(
            failure_rate,
            4,
        ),

        pending_rate=round(
            pending_rate,
            4,
        ),

        total_transaction_value=round(
            total_transaction_value,
            2,
        ),

        successful_transaction_value=round(
            successful_transaction_value,
            2,
        ),

        failed_transaction_value=round(
            failed_transaction_value,
            2,
        ),

        average_transaction_value=round(
            average_transaction_value,
            2,
        ),

        average_successful_transaction_value=round(
            average_successful_transaction_value,
            2,
        ),

        average_failed_transaction_value=round(
            average_failed_transaction_value,
            2,
        ),

        max_transaction_value=round(
            max_transaction_value,
            2,
        ),

        min_transaction_value=round(
            min_transaction_value,
            2,
        ),

        payment_method_counts=dict(
            payment_method_counts
        ),

        payment_method_diversity=payment_method_diversity,

        preferred_payment_method=(
            preferred_payment_method
        ),

        preferred_payment_method_success_rate=round(
            preferred_payment_method_success_rate,
            4,
        ),

        recovery_case_count=recovery_case_count,

        active_recovery_case_count=len(
            active_cases
        ),

        recovered_case_count=len(
            recovered_cases
        ),

        total_amount_at_risk=round(
            total_amount_at_risk,
            2,
        ),

        total_recovered_amount=round(
            total_recovered_amount,
            2,
        ),

        outstanding_recovery_amount=round(
            outstanding_recovery_amount,
            2,
        ),

        historical_recovery_rate=round(
            historical_recovery_rate,
            4,
        ),

        average_recovery_amount=round(
            average_recovery_amount,
            2,
        ),

        average_recovery_ratio=round(
            average_recovery_ratio,
            4,
        ),

        failure_streak=failure_streak,

        success_streak=success_streak,

        recent_failure_count_7d=(
            recent_failure_count_7d
        ),

        recent_success_count_7d=(
            recent_success_count_7d
        ),

        recent_failure_count_30d=(
            recent_failure_count_30d
        ),

        recent_success_count_30d=(
            recent_success_count_30d
        ),

        days_since_last_transaction=_days_since(
            last_transaction_at,
            now,
        ),

        days_since_last_success=_days_since(
            last_success_at,
            now,
        ),

        days_since_last_failure=_days_since(
            last_failure_at,
            now,
        ),

        days_since_last_recovery=_days_since(
            last_recovery_at,
            now,
        ),

        current_failed_amount=round(
            current_failed_amount,
            2,
        ),

        current_failed_amount_ratio=round(
            current_failed_amount_ratio,
            4,
        ),

        active_risk_ratio=round(
            active_risk_ratio,
            4,
        ),

        failure_frequency_30d=round(
            failure_frequency_30d,
            4,
        ),

        recovery_efficiency=round(
            recovery_efficiency,
            4,
        ),

        customer_segment=customer_segment,

        data_completeness=round(
            data_completeness,
            4,
        ),

        data_sources=data_sources,
    )


class FeatureBuilder:
    """Build the compact feature set used by the diagnosis pipeline.

    ``build_feature_vector`` serves the M6.5 customer-history endpoint.  The
    M6.1 diagnosis endpoint receives a different, single-recovery-case input,
    so it needs this compatibility adapter rather than the customer-history
    feature schema.
    """

    def build(
        self,
        request: DiagnosisRequest,
        payment: PaymentContext | None = None,
        customer: CustomerContext | None = None,
        recovery_case: RecoveryCaseContext | None = None,
    ) -> dict[str, float | int | str | bool | None]:
        """Return deterministic, scalar features for a diagnosis request."""

        return {
            "merchant_id": request.merchant_id,
            "payment_id": (
                payment.payment_id
                if payment and payment.payment_id
                else request.payment_id
            ),
            "customer_id": (
                customer.customer_id
                if customer and customer.customer_id
                else request.customer_id
            ),
            "amount_at_risk": (
                recovery_case.amount_at_risk
                if recovery_case
                else request.amount_at_risk
            ),
            "currency": request.currency.upper(),
            "failure_reason": (
                payment.failure_reason
                if payment and payment.failure_reason
                else request.failure_reason
            ),
            "payment_method": (
                payment.method
                if payment and payment.method
                else request.payment_method
            ),
            "environment": request.environment,
            "has_payment_context": payment is not None,
            "has_customer_context": customer is not None,
            "has_recovery_case_context": recovery_case is not None,
            "customer_total_payments": (
                customer.total_payments
                if customer
                else None
            ),
            "customer_successful_payments": (
                customer.successful_payments
                if customer
                else None
            ),
            "customer_failed_payments": (
                customer.failed_payments
                if customer
                else None
            ),
        }
