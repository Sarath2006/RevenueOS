/**
 * ============================================================
 * RevenueOS — M6.13 AI SAFETY CONFIGURATION
 * ============================================================
 *
 * Central policy configuration.
 *
 * IMPORTANT:
 *
 * These values are intentionally separated from the validator.
 *
 * This allows policies to evolve without rewriting the
 * safety engine.
 * ============================================================
 */

export const AI_SAFETY_POLICY = {
  version: "ai-safety-policy-v1",

  /**
   * Minimum confidence required for automatic action.
   */
  minimumConfidence: 0.70,

  /**
   * Confidence below this level requires human review.
   */
  humanReviewConfidence: 0.50,

  /**
   * Maximum recovery attempts allowed before blocking
   * automatic recovery.
   */
  maximumRecoveryAttempts: 3,

  /**
   * Maximum amount for automatic recovery.
   *
   * INR for the current RevenueOS test environment.
   */
  maximumAutomaticRecoveryAmount: 100000,

  /**
   * Strategies currently allowed for automatic execution.
   *
   * M6.13 only validates permission.
   *
   * M7 will actually execute bounded actions.
   */
  allowedStrategies: [
    "RETRY_PAYMENT",
    "ALTERNATE_PAYMENT_METHOD",
    "CUSTOMER_REMINDER",
    "ASSISTED_RECOVERY",
  ],

  /**
   * Strategies that should never be automatically executed.
   *
   * They may still be recommended by AI, but require
   * human/orchestration review.
   */
  blockedStrategies: [
    "REFUND",
    "CHARGE",
    "CANCEL",
    "WRITE_OFF",
  ],
} as const;