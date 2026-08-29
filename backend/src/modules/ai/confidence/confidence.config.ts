/**
 * ============================================================
 * M6.11 — CONFIDENCE + FALLBACK CONFIGURATION
 * ============================================================
 *
 * Configuration only.
 *
 * Business logic belongs inside confidence.engine.ts.
 * ============================================================
 */

export const CONFIDENCE_FALLBACK_MODEL = {

  version:
    "confidence-fallback-v1",

  thresholds: {

    veryLow:
      0.25,

    low:
      0.40,

    medium:
      0.60,

    high:
      0.80,

    minimumFeatureQuality:
      0.60,

    minimumProbabilityConfidence:
      0.45,

    minimumStrategyConfidence:
      0.45,

    minimumPriorityScore:
      25,

    safeStrategyScore:
      60,
  },


  weights: {

    probabilityConfidence:
      0.35,

    priorityConfidence:
      0.20,

    strategyConfidence:
      0.25,

    featureQuality:
      0.20,
  },


  fallback: {

    safeStrategy:
      "CUSTOMER_REMINDER",

    deferredStrategy:
      "DEFER_AND_RETRY",

    noActionStrategy:
      "NO_ACTION",
  },


  confidence: {

    minimum:
      0.10,

    maximum:
      0.98,
  },

} as const;