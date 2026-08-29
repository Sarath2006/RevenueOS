from fastapi import APIRouter

from app.schemas.customer_profile import (
    CustomerProfileRequest,
    CustomerProfileResponse,
)

from app.services.customer_profile import (
    build_customer_recovery_profile,
)


router = APIRouter(
    prefix="/recovery",
    tags=[
        "Customer Recovery Profile"
    ],
)


@router.post(
    "/customer-profile",
    response_model=CustomerProfileResponse,
)
async def customer_profile(
    request: CustomerProfileRequest,
):
    profile = (
        build_customer_recovery_profile(
            request
        )
    )

    return CustomerProfileResponse(
        customer_id=profile.customer_id,
        merchant_id=profile.merchant_id,
        currency=profile.currency,

        total_transactions=profile.total_transactions,
        successful_transactions=profile.successful_transactions,
        failed_transactions=profile.failed_transactions,

        total_transaction_value=(
            profile.total_transaction_value
        ),

        successful_transaction_value=(
            profile.successful_transaction_value
        ),

        failed_transaction_value=(
            profile.failed_transaction_value
        ),

        recovery_cases=profile.recovery_cases,
        recovered_cases=profile.recovered_cases,
        active_recovery_cases=(
            profile.active_recovery_cases
        ),

        total_amount_at_risk=(
            profile.total_amount_at_risk
        ),

        total_recovered_amount=(
            profile.total_recovered_amount
        ),

        payment_method_counts=(
            profile.payment_method_counts
        ),

        preferred_payment_method=(
            profile.preferred_payment_method
        ),

        successful_payment_rate=(
            profile.successful_payment_rate
        ),

        failure_rate=profile.failure_rate,

        historical_recovery_rate=(
            profile.historical_recovery_rate
        ),

        average_transaction_value=(
            profile.average_transaction_value
        ),

        average_successful_transaction_value=(
            profile.average_successful_transaction_value
        ),

        average_failed_transaction_value=(
            profile.average_failed_transaction_value
        ),

        average_recovered_amount=(
            profile.average_recovered_amount
        ),

        first_transaction_at=(
            profile.first_transaction_at
        ),

        last_transaction_at=(
            profile.last_transaction_at
        ),

        last_successful_payment_at=(
            profile.last_successful_payment_at
        ),

        last_failed_payment_at=(
            profile.last_failed_payment_at
        ),

        last_recovery_at=(
            profile.last_recovery_at
        ),

        days_since_last_transaction=(
            profile.days_since_last_transaction
        ),

        days_since_last_success=(
            profile.days_since_last_success
        ),

        days_since_last_failure=(
            profile.days_since_last_failure
        ),

        days_since_last_recovery=(
            profile.days_since_last_recovery
        ),

        customer_segment=(
            profile.customer_segment
        ),

        profile_completeness=(
            profile.profile_completeness
        ),

        data_sources=profile.data_sources,

        generated_at=profile.generated_at,
    )