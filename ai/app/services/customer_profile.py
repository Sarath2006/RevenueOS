"""
============================================================
RevenueOS AI — Customer Recovery Profile Engine
============================================================

M6.4

Responsibilities:

1. Aggregate customer transaction history
2. Aggregate recovery history
3. Calculate behavioral statistics
4. Calculate recency
5. Determine customer segment
6. Calculate profile completeness
7. Produce deterministic CustomerRecoveryProfile

This module intentionally does NOT calculate:

- recovery probability
- recovery priority
- recovery strategy
- AI decision

Those belong to later M6 milestones.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Optional

from app.models.customer_profile import (
    CustomerRecoveryProfile,
)
from app.schemas.customer_profile import (
    CustomerProfileRequest,
    CustomerRecoveryCase,
    CustomerTransaction,
)


SUCCESS_STATUSES = {
    "captured",
    "paid",
    "success",
    "successful",
    "completed",
}

FAILURE_STATUSES = {
    "failed",
    "failure",
    "declined",
    "cancelled",
    "canceled",
    "expired",
}

RECOVERED_STATUSES = {
    "recovered",
}

ACTIVE_RECOVERY_STATUSES = {
    "open",
    "pending",
    "in_progress",
    "active",
}


def _normalize_status(
    value: Optional[str],
) -> str:
    if not value:
        return ""

    return (
        value
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )


def _safe_ratio(
    numerator: float,
    denominator: float,
) -> float:
    if denominator <= 0:
        return 0.0

    return numerator / denominator


def _days_since(
    value: Optional[datetime],
    now: datetime,
) -> Optional[int]:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(
            tzinfo=timezone.utc
        )

    delta = now - value

    return max(
        0,
        delta.days,
    )


def _average(
    total: float,
    count: int,
) -> float:
    if count <= 0:
        return 0.0

    return total / count


def _determine_segment(
    total_transactions: int,
    successful_transactions: int,
    failure_rate: float,
    historical_recovery_rate: float,
) -> str:
    """
    Deterministic customer segmentation.

    This is behavioral segmentation, not an AI decision.
    """

    if total_transactions == 0:
        return "NEW"

    if total_transactions <= 2:
        return "NEW"

    if (
        successful_transactions >= 5
        and failure_rate < 0.20
    ):
        return "RELIABLE"

    if (
        historical_recovery_rate >= 0.60
        and failure_rate < 0.50
    ):
        return "RECOVERY_RESPONSIVE"

    if failure_rate >= 0.60:
        return "HIGH_FAILURE"

    if failure_rate >= 0.30:
        return "AT_RISK"

    return "REGULAR"


def _calculate_completeness(
    request: CustomerProfileRequest,
) -> float:
    """
    Calculates how much useful behavioral information
    is available.

    This is intentionally simple and explainable.
    """

    checks = [
        bool(request.customer_id),
        bool(request.merchant_id),
        bool(request.currency),
        len(request.transactions) > 0,
        any(
            transaction.payment_method
            for transaction in request.transactions
        ),
        any(
            transaction.created_at
            for transaction in request.transactions
        ),
        len(request.recovery_cases) > 0,
    ]

    score = sum(
        1
        for value in checks
        if value
    ) / len(checks)

    return round(
        score,
        4,
    )


def build_customer_recovery_profile(
    request: CustomerProfileRequest,
    now: Optional[datetime] = None,
) -> CustomerRecoveryProfile:
    """
    Build a deterministic customer recovery profile.
    """

    if now is None:
        now = datetime.now(timezone.utc)

    transactions = request.transactions
    recovery_cases = request.recovery_cases

    # --------------------------------------------------------
    # Transaction aggregation
    # --------------------------------------------------------

    total_transactions = len(
        transactions
    )

    successful_transactions = 0
    failed_transactions = 0

    total_transaction_value = 0.0
    successful_transaction_value = 0.0
    failed_transaction_value = 0.0

    payment_methods: Counter[str] = Counter()

    first_transaction_at: Optional[datetime] = None
    last_transaction_at: Optional[datetime] = None

    last_successful_payment_at: Optional[
        datetime
    ] = None

    last_failed_payment_at: Optional[
        datetime
    ] = None

    for transaction in transactions:

        amount = max(
            0.0,
            float(transaction.amount),
        )

        total_transaction_value += amount

        status = _normalize_status(
            transaction.status
        )

        if status in SUCCESS_STATUSES:
            successful_transactions += 1

            successful_transaction_value += amount

            if transaction.created_at:
                if (
                    last_successful_payment_at
                    is None
                    or transaction.created_at
                    > last_successful_payment_at
                ):
                    last_successful_payment_at = (
                        transaction.created_at
                    )

        elif status in FAILURE_STATUSES:
            failed_transactions += 1

            failed_transaction_value += amount

            if transaction.created_at:
                if (
                    last_failed_payment_at
                    is None
                    or transaction.created_at
                    > last_failed_payment_at
                ):
                    last_failed_payment_at = (
                        transaction.created_at
                    )

        if transaction.payment_method:
            method = (
                transaction.payment_method
                .strip()
                .lower()
            )

            if method:
                payment_methods[method] += 1

        if transaction.created_at:

            if (
                first_transaction_at is None
                or transaction.created_at
                < first_transaction_at
            ):
                first_transaction_at = (
                    transaction.created_at
                )

            if (
                last_transaction_at is None
                or transaction.created_at
                > last_transaction_at
            ):
                last_transaction_at = (
                    transaction.created_at
                )

    # --------------------------------------------------------
    # Recovery aggregation
    # --------------------------------------------------------

    recovery_cases_count = len(
        recovery_cases
    )

    recovered_cases = 0
    active_recovery_cases = 0

    total_amount_at_risk = 0.0
    total_recovered_amount = 0.0

    last_recovery_at: Optional[
        datetime
    ] = None

    for case in recovery_cases:

        amount_at_risk = max(
            0.0,
            float(case.amount_at_risk),
        )

        recovered_amount = max(
            0.0,
            float(case.recovered_amount),
        )

        total_amount_at_risk += (
            amount_at_risk
        )

        total_recovered_amount += min(
            recovered_amount,
            amount_at_risk,
        )

        status = _normalize_status(
            case.status
        )

        if (
            status in RECOVERED_STATUSES
            or (
                amount_at_risk > 0
                and recovered_amount
                >= amount_at_risk
            )
        ):
            recovered_cases += 1

        elif status in ACTIVE_RECOVERY_STATUSES:
            active_recovery_cases += 1

        if case.recovered_at:
            if (
                last_recovery_at is None
                or case.recovered_at
                > last_recovery_at
            ):
                last_recovery_at = (
                    case.recovered_at
                )

    # --------------------------------------------------------
    # Behavioral metrics
    # --------------------------------------------------------

    successful_payment_rate = _safe_ratio(
        successful_transactions,
        total_transactions,
    )

    failure_rate = _safe_ratio(
        failed_transactions,
        total_transactions,
    )

    historical_recovery_rate = _safe_ratio(
        recovered_cases,
        recovery_cases_count,
    )

    average_transaction_value = _average(
        total_transaction_value,
        total_transactions,
    )

    average_successful_transaction_value = _average(
        successful_transaction_value,
        successful_transactions,
    )

    average_failed_transaction_value = _average(
        failed_transaction_value,
        failed_transactions,
    )

    average_recovered_amount = _average(
        total_recovered_amount,
        recovered_cases,
    )

    # --------------------------------------------------------
    # Preferred payment method
    # --------------------------------------------------------

    preferred_payment_method: Optional[
        str
    ] = None

    if payment_methods:
        preferred_payment_method = (
            payment_methods.most_common(1)[0][0]
        )

    # --------------------------------------------------------
    # Segment
    # --------------------------------------------------------

    customer_segment = _determine_segment(
        total_transactions=total_transactions,
        successful_transactions=successful_transactions,
        failure_rate=failure_rate,
        historical_recovery_rate=(
            historical_recovery_rate
        ),
    )

    # --------------------------------------------------------
    # Data sources
    # --------------------------------------------------------

    data_sources = [
        "customer",
        "payment",
    ]

    if recovery_cases:
        data_sources.append(
            "recovery_case"
        )

    # --------------------------------------------------------
    # Final profile
    # --------------------------------------------------------

    return CustomerRecoveryProfile(
        customer_id=request.customer_id,
        merchant_id=request.merchant_id,
        currency=request.currency,

        total_transactions=(
            total_transactions
        ),

        successful_transactions=(
            successful_transactions
        ),

        failed_transactions=(
            failed_transactions
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

        recovery_cases=(
            recovery_cases_count
        ),

        recovered_cases=(
            recovered_cases
        ),

        active_recovery_cases=(
            active_recovery_cases
        ),

        total_amount_at_risk=round(
            total_amount_at_risk,
            2,
        ),

        total_recovered_amount=round(
            total_recovered_amount,
            2,
        ),

        payment_method_counts=dict(
            payment_methods
        ),

        preferred_payment_method=(
            preferred_payment_method
        ),

        successful_payment_rate=round(
            successful_payment_rate,
            4,
        ),

        failure_rate=round(
            failure_rate,
            4,
        ),

        historical_recovery_rate=round(
            historical_recovery_rate,
            4,
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

        average_recovered_amount=round(
            average_recovered_amount,
            2,
        ),

        first_transaction_at=(
            first_transaction_at
        ),

        last_transaction_at=(
            last_transaction_at
        ),

        last_successful_payment_at=(
            last_successful_payment_at
        ),

        last_failed_payment_at=(
            last_failed_payment_at
        ),

        last_recovery_at=(
            last_recovery_at
        ),

        days_since_last_transaction=_days_since(
            last_transaction_at,
            now,
        ),

        days_since_last_success=_days_since(
            last_successful_payment_at,
            now,
        ),

        days_since_last_failure=_days_since(
            last_failed_payment_at,
            now,
        ),

        days_since_last_recovery=_days_since(
            last_recovery_at,
            now,
        ),

        customer_segment=(
            customer_segment
        ),

        profile_completeness=round(
            _calculate_completeness(
                request
            ),
            4,
        ),

        data_sources=data_sources,

        generated_at=(
            request.generated_at
            or now
        ),
    )