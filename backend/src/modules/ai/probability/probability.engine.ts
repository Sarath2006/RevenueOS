/**
 * ============================================================
 * M6.6 — RECOVERY PROBABILITY ENGINE
 * ============================================================
 *
 * Deterministic recovery probability calculation.
 *
 * Responsibilities:
 *
 * 1. Normalize features
 * 2. Calculate weighted signals
 * 3. Calculate internal score
 * 4. Convert score to probability
 * 5. Calculate confidence
 * 6. Determine probability band
 * 7. Generate human-readable explanations
 *
 * This engine does NOT:
 *
 * - access database
 * - call Razorpay
 * - call Redis
 * - call external AI providers
 * - create recovery cases
 * - send notifications
 *
 * It is intentionally pure and deterministic.
 */

import {
  RECOVERY_PROBABILITY_MODEL,
} from "./probability.config";

import {
  RecoveryProbabilityBand,
  RecoveryProbabilityFeatures,
  RecoveryProbabilityResult,
} from "./probability.types";

/* ============================================================
 * HELPERS
 * ============================================================
 */

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function round(
  value: number,
  decimals = 4
): number {
  const factor =
    Math.pow(10, decimals);

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

function normalizeCount(
  value: number,
  cap: number
): number {
  if (cap <= 0) {
    return 0;
  }

  return clamp(
    value / cap,
    0,
    1
  );
}

function normalizeDays(
  value: number,
  cap: number
): number {
  if (cap <= 0) {
    return 0;
  }

  return clamp(
    value / cap,
    0,
    1
  );
}

/* ============================================================
 * PROBABILITY BAND
 * ============================================================
 */

function getProbabilityBand(
  probability: number
): RecoveryProbabilityBand {
  const bands =
    RECOVERY_PROBABILITY_MODEL.bands;

  if (
    probability <
    bands.veryLow
  ) {
    return "VERY_LOW";
  }

  if (
    probability <
    bands.low
  ) {
    return "LOW";
  }

  if (
    probability <
    bands.medium
  ) {
    return "MEDIUM";
  }

  if (
    probability <
    bands.high
  ) {
    return "HIGH";
  }

  return "VERY_HIGH";
}

/* ============================================================
 * CONFIDENCE
 * ============================================================
 */

function calculateConfidence(
  features: RecoveryProbabilityFeatures
): number {
  const config =
    RECOVERY_PROBABILITY_MODEL.confidence;

  /**
   * ----------------------------------------------------------
   * Data completeness
   * ----------------------------------------------------------
   *
   * Core fields are expected to exist because the request
   * passed schema validation.
   *
   * We therefore treat the supplied feature vector as complete.
   */
  const dataCompleteness = 1;

  /**
   * ----------------------------------------------------------
   * Transaction history confidence
   * ----------------------------------------------------------
   *
   * More transactions = more reliable behavioural evidence.
   *
   * 20 transactions is treated as strong history.
   */
  const transactionHistory =
    clamp(
      features.transactionCount / 20,
      0,
      1
    );

  /**
   * ----------------------------------------------------------
   * Recovery history confidence
   * ----------------------------------------------------------
   *
   * Recovery cases provide direct evidence about whether
   * this customer historically recovers failed payments.
   */
  const recoveryHistory =
    clamp(
      features.recoveryCaseCount / 5,
      0,
      1
    );

  const rawConfidence =
    (
      dataCompleteness *
      config.dataCompletenessWeight
    ) +
    (
      transactionHistory *
      config.transactionHistoryWeight
    ) +
    (
      recoveryHistory *
      config.recoveryHistoryWeight
    );

  return round(
    clamp(
      rawConfidence,
      config.minimum,
      config.maximum
    )
  );
}

/* ============================================================
 * FEATURES USED
 * ============================================================
 */

const FEATURES_USED = [
  "successfulTransactionRate",
  "historicalRecoveryRate",
  "preferredPaymentMethodSuccessRate",
  "recoveryEfficiency",
  "successStreak",
  "recentSuccessActivity",
  "paymentMethodDiversity",
  "averageRecoveryRatio",
  "failureRate",
  "failureStreak",
  "recentFailureActivity",
  "currentFailedAmountRatio",
  "activeRiskRatio",
  "daysSinceLastSuccess",
  "pendingRate",
];

/* ============================================================
 * MAIN ENGINE
 * ============================================================
 */

export function calculateRecoveryProbability(
  features: RecoveryProbabilityFeatures
): RecoveryProbabilityResult {
  const model =
    RECOVERY_PROBABILITY_MODEL;

  const weights =
    model.weights;

  const normalization =
    model.normalization;

  /**
   * ----------------------------------------------------------
   * Normalize derived behavioural signals
   * ----------------------------------------------------------
   */

  const successStreak =
    normalizeCount(
      features.successStreak,
      normalization.streakCap
    );

  const failureStreak =
    normalizeCount(
      features.failureStreak,
      normalization.streakCap
    );

  const recentSuccessActivity =
    normalizeCount(
      features.recentSuccessCount7d,
      normalization.recentActivityCap
    );

  const recentFailureActivity =
    normalizeCount(
      features.recentFailureCount7d,
      normalization.recentActivityCap
    );

  const paymentMethodDiversity =
    normalizeCount(
      features.paymentMethodDiversity,
      normalization.paymentMethodDiversityCap
    );

  const daysSinceLastSuccess =
    normalizeDays(
      features.daysSinceLastSuccess,
      normalization.daysSinceSuccessCap
    );

  /**
   * ----------------------------------------------------------
   * Positive signals
   * ----------------------------------------------------------
   */

  const positiveContributions = {
    successfulTransactionRate:
      features.successfulTransactionRate *
      weights.successfulTransactionRate,

    historicalRecoveryRate:
      features.historicalRecoveryRate *
      weights.historicalRecoveryRate,

    preferredPaymentMethodSuccessRate:
      features.preferredPaymentMethodSuccessRate *
      weights.preferredPaymentMethodSuccessRate,

    recoveryEfficiency:
      features.recoveryEfficiency *
      weights.recoveryEfficiency,

    successStreak:
      successStreak *
      weights.successStreak,

    recentSuccessActivity:
      recentSuccessActivity *
      weights.recentSuccessActivity,

    paymentMethodDiversity:
      paymentMethodDiversity *
      weights.paymentMethodDiversity,

    averageRecoveryRatio:
      features.averageRecoveryRatio *
      weights.averageRecoveryRatio,
  };

  /**
   * ----------------------------------------------------------
   * Negative signals
   * ----------------------------------------------------------
   */

  const negativeContributions = {
    failureRate:
      features.failureRate *
      weights.failureRate,

    failureStreak:
      failureStreak *
      weights.failureStreak,

    recentFailureActivity:
      recentFailureActivity *
      weights.recentFailureActivity,

    currentFailedAmountRatio:
      features.currentFailedAmountRatio *
      weights.currentFailedAmountRatio,

    activeRiskRatio:
      features.activeRiskRatio *
      weights.activeRiskRatio,

    daysSinceLastSuccess:
      daysSinceLastSuccess *
      weights.daysSinceLastSuccess,

    pendingRate:
      features.pendingRate *
      weights.pendingRate,
  };

  /**
   * ----------------------------------------------------------
   * Calculate score
   * ----------------------------------------------------------
   */

  const positiveScore =
    Object.values(
      positiveContributions
    ).reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const negativeScore =
    Object.values(
      negativeContributions
    ).reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const rawScore =
    model.baseScore +
    positiveScore +
    negativeScore;

  const score =
    round(
      clamp(
        rawScore,
        model.minScore,
        model.maxScore
      )
    );

  /**
   * ----------------------------------------------------------
   * Convert score → probability
   * ----------------------------------------------------------
   *
   * Score 0   → 0%
   * Score 50  → 50%
   * Score 100 → 100%
   *
   * Negative scores are safely clamped.
   */

  const probability =
    round(
      clamp(
        score / model.maxScore,
        0,
        1
      )
    );

  const probabilityPercent =
    round(
      probability * 100,
      2
    );

  /**
   * ----------------------------------------------------------
   * Probability band
   * ----------------------------------------------------------
   */

  const band =
    getProbabilityBand(
      probability
    );

  /**
   * ----------------------------------------------------------
   * Confidence
   * ----------------------------------------------------------
   */

  const confidence =
    calculateConfidence(
      features
    );

  /**
   * ----------------------------------------------------------
   * Human-readable explanations
   * ----------------------------------------------------------
   */

  const positiveSignals: string[] = [];

  const negativeSignals: string[] = [];

  if (
    features.successfulTransactionRate >=
    0.7
  ) {
    positiveSignals.push(
      "Strong historical successful payment rate"
    );
  }

  if (
    features.historicalRecoveryRate >=
    0.5
  ) {
    positiveSignals.push(
      "Strong historical recovery performance"
    );
  }

  if (
    features.preferredPaymentMethodSuccessRate >=
    0.7
  ) {
    positiveSignals.push(
      "Preferred payment method has a strong success rate"
    );
  }

  if (
    features.recoveryEfficiency >=
    0.5
  ) {
    positiveSignals.push(
      "Good recovery efficiency"
    );
  }

  if (
    features.successStreak >= 2
  ) {
    positiveSignals.push(
      "Recent successful payment streak"
    );
  }

  if (
    features.recentSuccessCount7d >= 2
  ) {
    positiveSignals.push(
      "Recent successful payment activity"
    );
  }

  if (
    features.paymentMethodDiversity >= 2
  ) {
    positiveSignals.push(
      "Customer has multiple payment methods"
    );
  }

  if (
    features.averageRecoveryRatio >=
    0.5
  ) {
    positiveSignals.push(
      "Historical recovery amount ratio is healthy"
    );
  }

  if (
    features.failureRate >=
    0.3
  ) {
    negativeSignals.push(
      "High payment failure rate"
    );
  }

  if (
    features.failureStreak >= 2
  ) {
    negativeSignals.push(
      "Current failure streak is elevated"
    );
  }

  if (
    features.recentFailureCount7d >= 2
  ) {
    negativeSignals.push(
      "Multiple recent payment failures"
    );
  }

  if (
    features.currentFailedAmountRatio >=
    0.2
  ) {
    negativeSignals.push(
      "High current failed amount ratio"
    );
  }

  if (
    features.activeRiskRatio >=
    0.5
  ) {
    negativeSignals.push(
      "High active recovery risk"
    );
  }

  if (
    features.daysSinceLastSuccess >=
    14
  ) {
    negativeSignals.push(
      "Customer has not successfully paid recently"
    );
  }

  if (
    features.pendingRate >=
    0.2
  ) {
    negativeSignals.push(
      "High proportion of pending transactions"
    );
  }

  /**
   * ----------------------------------------------------------
   * Guarantee at least one explanation.
   * ----------------------------------------------------------
   */

  if (
    positiveSignals.length === 0
  ) {
    positiveSignals.push(
      "No strong positive recovery signal detected"
    );
  }

  if (
    negativeSignals.length === 0
  ) {
    negativeSignals.push(
      "No strong negative recovery signal detected"
    );
  }

  /**
   * ----------------------------------------------------------
   * Final result
   * ----------------------------------------------------------
   */

  return {
    probability,

    probabilityPercent,

    band,

    modelVersion:
      model.version,

    confidence,

    score,

    positiveSignals,

    negativeSignals,

    featuresUsed:
      FEATURES_USED,

    generatedAt:
      new Date(),
  };
}