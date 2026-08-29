from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


class FeatureEngineeringTransaction(BaseModel):
    """
    Normalized transaction input used by the feature engine.
    """

    model_config = ConfigDict(extra="ignore")

    transaction_id: str = Field(min_length=1)

    amount: float = Field(ge=0)

    status: str

    payment_method: Optional[str] = None

    created_at: datetime


class FeatureEngineeringRecoveryCase(BaseModel):
    """
    Normalized recovery-case input.
    """

    model_config = ConfigDict(extra="ignore")

    case_id: str = Field(min_length=1)

    amount_at_risk: float = Field(ge=0)

    recovered_amount: float = Field(default=0, ge=0)

    status: str

    created_at: datetime


class FeatureEngineeringRequest(BaseModel):
    """
    Request for generating AI/ML-ready customer features.
    """

    model_config = ConfigDict(extra="ignore")

    customer_id: str = Field(min_length=1)

    merchant_id: str = Field(min_length=1)

    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
    )

    transactions: List[
        FeatureEngineeringTransaction
    ] = Field(default_factory=list)

    recovery_cases: List[
        FeatureEngineeringRecoveryCase
    ] = Field(default_factory=list)


class FeatureEngineeringResponse(BaseModel):
    """
    Standardized feature vector consumed by
    downstream AI decision engines.
    """

    customer_id: str

    merchant_id: str

    currency: str

    feature_version: str

    generated_at: datetime

    # ---------------------------------------------------------
    # Transaction features
    # ---------------------------------------------------------

    transaction_count: int

    successful_transaction_count: int

    failed_transaction_count: int

    pending_transaction_count: int

    successful_transaction_rate: float

    failure_rate: float

    pending_rate: float

    total_transaction_value: float

    successful_transaction_value: float

    failed_transaction_value: float

    average_transaction_value: float

    average_successful_transaction_value: float

    average_failed_transaction_value: float

    max_transaction_value: float

    min_transaction_value: float

    # ---------------------------------------------------------
    # Payment method features
    # ---------------------------------------------------------

    payment_method_counts: Dict[str, int]

    payment_method_diversity: int

    preferred_payment_method: Optional[str]

    preferred_payment_method_success_rate: float

    # ---------------------------------------------------------
    # Recovery features
    # ---------------------------------------------------------

    recovery_case_count: int

    active_recovery_case_count: int

    recovered_case_count: int

    total_amount_at_risk: float

    total_recovered_amount: float

    outstanding_recovery_amount: float

    historical_recovery_rate: float

    average_recovery_amount: float

    average_recovery_ratio: float

    # ---------------------------------------------------------
    # Behavioral features
    # ---------------------------------------------------------

    failure_streak: int

    success_streak: int

    recent_failure_count_7d: int

    recent_success_count_7d: int

    recent_failure_count_30d: int

    recent_success_count_30d: int

    # ---------------------------------------------------------
    # Temporal features
    # ---------------------------------------------------------

    days_since_last_transaction: Optional[int]

    days_since_last_success: Optional[int]

    days_since_last_failure: Optional[int]

    days_since_last_recovery: Optional[int]

    # ---------------------------------------------------------
    # Risk features
    # ---------------------------------------------------------

    current_failed_amount: float

    current_failed_amount_ratio: float

    active_risk_ratio: float

    failure_frequency_30d: float

    recovery_efficiency: float

    # ---------------------------------------------------------
    # Segmentation
    # ---------------------------------------------------------

    customer_segment: str

    # ---------------------------------------------------------
    # Quality / provenance
    # ---------------------------------------------------------

    data_completeness: float

    data_sources: List[str]