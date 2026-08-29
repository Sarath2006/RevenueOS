/**
 * ============================================================
 * M6.6 — RECOVERY PROBABILITY CONFIGURATION
 * ============================================================
 *
 * Configuration for deterministic Recovery Probability Model.
 *
 * IMPORTANT:
 * Business/model configuration is intentionally separated
 * from the calculation engine.
 *
 * This allows us to introduce:
 *
 * recovery-probability-v2
 * recovery-probability-v3
 *
 * later without rewriting the architecture.
 */

export const RECOVERY_PROBABILITY_MODEL = {
  version: "recovery-probability-v1",

  /**
   * Internal score range.
   *
   * -100 = extremely negative
   * +100 = extremely positive
   */
  minScore: -100,

  maxScore: 100,

  /**
   * Starting score before feature adjustments.
   *
   * 50 = neutral baseline.
   */
  baseScore: 50,

  /**
   * Feature weights.
   */
  weights: {
    successfulTransactionRate: 22,

    historicalRecoveryRate: 18,

    preferredPaymentMethodSuccessRate: 10,

    recoveryEfficiency: 10,

    successStreak: 8,

    recentSuccessActivity: 7,

    paymentMethodDiversity: 3,

    averageRecoveryRatio: 7,

    failureRate: -18,

    failureStreak: -12,

    recentFailureActivity: -8,

    currentFailedAmountRatio: -10,

    activeRiskRatio: -10,

    daysSinceLastSuccess: -5,

    pendingRate: -3,
  },

  /**
   * Feature normalization.
   */
  normalization: {
    streakCap: 5,

    recentActivityCap: 10,

    paymentMethodDiversityCap: 5,

    daysSinceSuccessCap: 30,

    daysSinceTransactionCap: 30,
  },

  /**
   * Confidence configuration.
   */
  confidence: {
    minimum: 0.35,

    maximum: 0.98,

    dataCompletenessWeight: 0.40,

    transactionHistoryWeight: 0.35,

    recoveryHistoryWeight: 0.25,
  },

  /**
   * Probability bands.
   */
  bands: {
    veryLow: 0.20,

    low: 0.40,

    medium: 0.60,

    high: 0.80,
  },
} as const;