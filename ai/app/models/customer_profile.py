"""
============================================================
RevenueOS AI — Customer Recovery Profile Model
============================================================

M6.4

This module contains the internal domain representation of a
customer's recovery behavior.

Important architectural boundary:

CustomerRecoveryProfile
    ↓
M6.5 Feature Engineering
    ↓
M6.6 Recovery Probability

This model does NOT directly calculate the final recovery
probability or recovery priority.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional


@dataclass(slots=True)
class CustomerRecoveryProfile:
    """
    Normalized customer-level recovery profile.

    All monetary values are represented in major currency units.

    Example:
        50000 paise → 500 INR
    """

    customer_id: str
    merchant_id: str

    currency: str = "INR"

    # --------------------------------------------------------
    # Transaction history
    # --------------------------------------------------------

    total_transactions: int = 0
    successful_transactions: int = 0
    failed_transactions: int = 0

    total_transaction_value: float = 0.0
    successful_transaction_value: float = 0.0
    failed_transaction_value: float = 0.0

    # --------------------------------------------------------
    # Recovery history
    # --------------------------------------------------------

    recovery_cases: int = 0
    recovered_cases: int = 0
    active_recovery_cases: int = 0

    total_amount_at_risk: float = 0.0
    total_recovered_amount: float = 0.0

    # --------------------------------------------------------
    # Payment behavior
    # --------------------------------------------------------

    payment_method_counts: Dict[str, int] = field(
        default_factory=dict
    )

    preferred_payment_method: Optional[str] = None

    # --------------------------------------------------------
    # Behavioral metrics
    # --------------------------------------------------------

    successful_payment_rate: float = 0.0
    failure_rate: float = 0.0
    historical_recovery_rate: float = 0.0

    average_transaction_value: float = 0.0
    average_successful_transaction_value: float = 0.0
    average_failed_transaction_value: float = 0.0

    average_recovered_amount: float = 0.0

    # --------------------------------------------------------
    # Recency
    # --------------------------------------------------------

    first_transaction_at: Optional[datetime] = None
    last_transaction_at: Optional[datetime] = None
    last_successful_payment_at: Optional[datetime] = None
    last_failed_payment_at: Optional[datetime] = None
    last_recovery_at: Optional[datetime] = None

    days_since_last_transaction: Optional[int] = None
    days_since_last_success: Optional[int] = None
    days_since_last_failure: Optional[int] = None
    days_since_last_recovery: Optional[int] = None

    # --------------------------------------------------------
    # Customer segmentation
    # --------------------------------------------------------

    customer_segment: str = "NEW"

    # --------------------------------------------------------
    # Data quality
    # --------------------------------------------------------

    profile_completeness: float = 0.0

    data_sources: list[str] = field(
        default_factory=list
    )

    generated_at: datetime = field(
        default_factory=datetime.utcnow
    )