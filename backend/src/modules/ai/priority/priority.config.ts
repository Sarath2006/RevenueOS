/**
 * ============================================================
 * M6.7 — RECOVERY PRIORITY CONFIGURATION
 * ============================================================
 *
 * Deterministic priority model.
 *
 * IMPORTANT:
 *
 * These values are configuration.
 * They are NOT hard-coded inside the engine.
 *
 * Future versions can replace the weights without
 * changing the engine architecture.
 */

export const RECOVERY_PRIORITY_MODEL = {

  version: "recovery-priority-v1",

  minScore: 0,

  maxScore: 100,


  /*
   * ==========================================================
   * COMPONENT WEIGHTS
   * ==========================================================
   *
   * Total = 100
   */

  weights: {

    probability: 30,

    amount: 20,

    urgency: 15,

    risk: 15,

    failureActivity: 10,

    historicalRecovery: 5,

    confidence: 5,

  },


  /*
   * ==========================================================
   * PRIORITY BANDS
   * ==========================================================
   */

  bands: {

    low: 0,

    medium: 40,

    high: 65,

    critical: 85,

  },


  /*
   * ==========================================================
   * AMOUNT NORMALIZATION
   * ==========================================================
   *
   * Prevents very large merchants/customers from
   * dominating the score.
   */

  amountNormalization: {

    low: 0.10,

    medium: 0.30,

    high: 0.60,

    critical: 0.85,

  },


  /*
   * ==========================================================
   * URGENCY
   * ==========================================================
   */

  urgency: {

    immediateFailureDays: 1,

    recentFailureDays: 3,

    agingDays: 7,

    criticalAgingDays: 14,

  },

} as const;