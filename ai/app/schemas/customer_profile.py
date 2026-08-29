"""
============================================================
RevenueOS AI — Customer Recovery Profile Schemas
============================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

from pydantic import BaseModel, Field


class CustomerTransaction(BaseModel):
    """
    Normalized transaction input.
    """

    transaction_id: Optional[str] = None

    amount: float = Field(
        ge=0
    )

    status: str

    payment_method: Optional[str] = None

    created_at: Optional[datetime] = None


class CustomerRecoveryCase(BaseModel):
    """
    Recovery case information used to build the profile.
    """

    case_id: Optional[str] = None

    amount_at_risk: float = Field(
        ge=0
    )

    recovered_amount: float = Field(
        default=0.0,
        ge=0
    )

    status: str

    created_at: Optional[datetime] = None

    recovered_at: Optional[datetime] = None


class CustomerProfileRequest(BaseModel):
    """
    Request used by the M6.4 profile engine.
    """

    customer_id: str

    merchant_id: str

    currency: str = "INR"

    transactions: list[CustomerTransaction] = Field(
        default_factory=list
    )

    recovery_cases: list[CustomerRecoveryCase] = Field(
        default_factory=list
    )

    generated_at: Optional[datetime] = None


class CustomerProfileResponse(BaseModel):
    """
    Public representation of CustomerRecoveryProfile.
    """

    customer_id: str
    merchant_id: str
    currency: str

    total_transactions: int
    successful_transactions: int
    failed_transactions: int

    total_transaction_value: float
    successful_transaction_value: float
    failed_transaction_value: float

    recovery_cases: int
    recovered_cases: int
    active_recovery_cases: int

    total_amount_at_risk: float
    total_recovered_amount: float

    payment_method_counts: Dict[str, int]
    preferred_payment_method: Optional[str]

    successful_payment_rate: float
    failure_rate: float
    historical_recovery_rate: float

    average_transaction_value: float
    average_successful_transaction_value: float
    average_failed_transaction_value: float
    average_recovered_amount: float

    first_transaction_at: Optional[datetime]
    last_transaction_at: Optional[datetime]
    last_successful_payment_at: Optional[datetime]
    last_failed_payment_at: Optional[datetime]
    last_recovery_at: Optional[datetime]

    days_since_last_transaction: Optional[int]
    days_since_last_success: Optional[int]
    days_since_last_failure: Optional[int]
    days_since_last_recovery: Optional[int]

    customer_segment: str

    profile_completeness: float

    data_sources: list[str]

    generated_at: datetime