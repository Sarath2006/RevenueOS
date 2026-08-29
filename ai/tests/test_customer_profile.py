from datetime import datetime, timezone

from app.schemas.customer_profile import (
    CustomerProfileRequest,
    CustomerRecoveryCase,
    CustomerTransaction,
)

from app.services.customer_profile import (
    build_customer_recovery_profile,
)


NOW = datetime(
    2026,
    8,
    29,
    tzinfo=timezone.utc,
)


def test_customer_profile_basic_metrics():

    request = CustomerProfileRequest(
        customer_id="cust_001",
        merchant_id="merchant_001",
        transactions=[
            CustomerTransaction(
                amount=500,
                status="captured",
                payment_method="upi",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=1000,
                status="captured",
                payment_method="upi",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=750,
                status="failed",
                payment_method="card",
                created_at=NOW,
            ),
        ],
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert profile.total_transactions == 3

    assert (
        profile.successful_transactions
        == 2
    )

    assert (
        profile.failed_transactions
        == 1
    )

    assert (
        profile.total_transaction_value
        == 2250
    )

    assert (
        profile.successful_transaction_value
        == 1500
    )

    assert (
        profile.failed_transaction_value
        == 750
    )

    assert (
        profile.failure_rate
        == 0.3333
    )


def test_preferred_payment_method():

    request = CustomerProfileRequest(
        customer_id="cust_002",
        merchant_id="merchant_001",
        transactions=[
            CustomerTransaction(
                amount=100,
                status="captured",
                payment_method="upi",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=200,
                status="captured",
                payment_method="upi",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=300,
                status="failed",
                payment_method="card",
                created_at=NOW,
            ),
        ],
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert (
        profile.preferred_payment_method
        == "upi"
    )

    assert (
        profile.payment_method_counts["upi"]
        == 2
    )


def test_recovery_metrics():

    request = CustomerProfileRequest(
        customer_id="cust_003",
        merchant_id="merchant_001",
        transactions=[
            CustomerTransaction(
                amount=1000,
                status="failed",
                payment_method="upi",
                created_at=NOW,
            ),
        ],
        recovery_cases=[
            CustomerRecoveryCase(
                amount_at_risk=1000,
                recovered_amount=1000,
                status="RECOVERED",
                created_at=NOW,
                recovered_at=NOW,
            ),
        ],
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert profile.recovery_cases == 1

    assert profile.recovered_cases == 1

    assert (
        profile.total_amount_at_risk
        == 1000
    )

    assert (
        profile.total_recovered_amount
        == 1000
    )

    assert (
        profile.historical_recovery_rate
        == 1.0
    )


def test_active_recovery_case():

    request = CustomerProfileRequest(
        customer_id="cust_004",
        merchant_id="merchant_001",
        recovery_cases=[
            CustomerRecoveryCase(
                amount_at_risk=1500,
                recovered_amount=0,
                status="OPEN",
                created_at=NOW,
            ),
        ],
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert (
        profile.active_recovery_cases
        == 1
    )


def test_new_customer_segment():

    request = CustomerProfileRequest(
        customer_id="cust_005",
        merchant_id="merchant_001",
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert (
        profile.customer_segment
        == "NEW"
    )


def test_high_failure_customer_segment():

    request = CustomerProfileRequest(
        customer_id="cust_006",
        merchant_id="merchant_001",
        transactions=[
            CustomerTransaction(
                amount=100,
                status="failed",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=200,
                status="failed",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=300,
                status="failed",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=400,
                status="captured",
                created_at=NOW,
            ),
        ],
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert (
        profile.customer_segment
        == "HIGH_FAILURE"
    )


def test_recency():

    transaction_time = datetime(
        2026,
        8,
        20,
        tzinfo=timezone.utc,
    )

    request = CustomerProfileRequest(
        customer_id="cust_007",
        merchant_id="merchant_001",
        transactions=[
            CustomerTransaction(
                amount=500,
                status="captured",
                created_at=transaction_time,
            ),
        ],
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert (
        profile.days_since_last_transaction
        == 9
    )


def test_zero_transaction_division_safety():

    request = CustomerProfileRequest(
        customer_id="cust_008",
        merchant_id="merchant_001",
    )

    profile = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert (
        profile.failure_rate
        == 0.0
    )

    assert (
        profile.successful_payment_rate
        == 0.0
    )

    assert (
        profile.average_transaction_value
        == 0.0
    )


def test_profile_is_deterministic():

    request = CustomerProfileRequest(
        customer_id="cust_009",
        merchant_id="merchant_001",
        transactions=[
            CustomerTransaction(
                amount=1000,
                status="captured",
                payment_method="upi",
                created_at=NOW,
            ),
            CustomerTransaction(
                amount=500,
                status="failed",
                payment_method="card",
                created_at=NOW,
            ),
        ],
    )

    profile_a = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    profile_b = build_customer_recovery_profile(
        request,
        now=NOW,
    )

    assert (
        profile_a.total_transactions
        == profile_b.total_transactions
    )

    assert (
        profile_a.failure_rate
        == profile_b.failure_rate
    )

    assert (
        profile_a.customer_segment
        == profile_b.customer_segment
    )