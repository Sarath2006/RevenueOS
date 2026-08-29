/**
 * ============================================================
 * M6.8 — RECOVERY STRATEGY CONFIGURATION
 * ============================================================
 *
 * Configuration only.
 *
 * Business logic belongs inside strategy.engine.ts.
 *
 * Keeping thresholds here makes the recommendation engine
 * versionable and easier to tune later.
 * ============================================================
 */

export const RECOVERY_STRATEGY_MODEL = {
  version: "recovery-strategy-v1",

  thresholds: {
    veryHighProbability: 0.80,

    highProbability: 0.65,

    mediumProbability: 0.40,

    lowProbability: 0.20,

    criticalPriority: 80,

    highPriority: 65,

    mediumPriority: 40,

    highUrgency: 70,

    highRisk: 70,

    highOpportunity: 65,

    recentFailureHours: 24,

    recentFailureDays: 3,

    highFailureStreak: 3,

    highFailureRate: 0.40,

    strongPaymentMethodSuccessRate: 0.75,

    strongRecoveryRate: 0.50,

    highAmountRatio: 0.50,
  },

  scores: {
    retryPayment: 80,

    alternatePaymentMethod: 75,

    customerReminder: 65,

    assistedRecovery: 60,

    deferAndRetry: 45,

    noAction: 0,
  },

  confidence: {
    minimum: 0.35,

    maximum: 0.98,

    probabilityWeight: 0.45,

    priorityWeight: 0.35,

    featureWeight: 0.20,
  },
} as const;