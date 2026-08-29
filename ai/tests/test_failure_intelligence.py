from app.services.failure_intelligence import (
    diagnose_payment_failure,
)

failures = [
    {
        "code": "insufficient_funds",
        "reason": "Insufficient funds",
    },
    {
        "code": "card_declined",
        "reason": "Card declined by issuer",
    },
    {
        "code": "authentication_failed",
        "reason": "3DS authentication failed",
    },
    {
        "code": "timeout",
        "reason": "Payment request timeout",
    },
    {
        "code": "fraud_suspected",
        "reason": "Fraud suspected",
    },
]

for failure in failures:

    result = diagnose_payment_failure(
        **failure,
        source="razorpay",
    )

    print(
        result.category.value,
        "|",
        result.severity.value,
        "|",
        result.retryability.value,
        "|",
        result.confidence,
    )