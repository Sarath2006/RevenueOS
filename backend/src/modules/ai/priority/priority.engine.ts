/**
 * ============================================================
 * M6.7 — RECOVERY PRIORITY ENGINE
 * ============================================================
 *
 * Responsibility:
 *
 * Determine how urgently RevenueOS should prioritize
 * a recovery opportunity.
 *
 * This engine DOES NOT calculate recovery probability.
 *
 * M6.6:
 *     "How likely is recovery?"
 *
 * M6.7:
 *     "How important / urgent is recovery?"
 *
 * ============================================================
 */

import {
  RECOVERY_PRIORITY_MODEL,
} from "./priority.config";

import {
  RecoveryPriorityFeatures,
  RecoveryPriorityResult,
  RecoveryPriorityBand,
  PriorityComponent,
} from "./priority.types";


/**
 * Clamp number into a range.
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


/**
 * Convert a 0 → 1 value to 0 → 100.
 */
function percentageScore(
  value: number
): number {

  return clamp(
    value * 100,
    0,
    100
  );
}


/**
 * Normalize an amount ratio.
 *
 * Ratio is preferred over absolute amount because
 * ₹10,000 means different things for different customers.
 */
function calculateAmountScore(
  features: RecoveryPriorityFeatures
): number {

  const ratio =
    Math.max(
      features.currentFailedAmountRatio,
      features.activeRiskRatio
    );

  if (ratio >= 0.85) {
    return 100;
  }

  if (ratio >= 0.60) {
    return 85;
  }

  if (ratio >= 0.30) {
    return 65;
  }

  if (ratio >= 0.10) {
    return 45;
  }

  return 20;
}


/**
 * Calculate urgency.
 *
 * Recent failures are more urgent because recovery
 * opportunities can become less effective with time.
 */
function calculateUrgencyScore(
  features: RecoveryPriorityFeatures
): number {

  const days =
    features.daysSinceLastFailure;


  if (days <= 1) {
    return 100;
  }


  if (days <= 3) {
    return 85;
  }


  if (days <= 7) {
    return 65;
  }


  if (days <= 14) {
    return 40;
  }


  return 20;
}


/**
 * Calculate failure activity score.
 */
function calculateFailureActivityScore(
  features: RecoveryPriorityFeatures
): number {

  const recent7 =
    clamp(
      features.recentFailureCount7d / 5,
      0,
      1
    );


  const recent30 =
    clamp(
      features.recentFailureCount30d / 10,
      0,
      1
    );


  const streak =
    clamp(
      features.failureStreak / 5,
      0,
      1
    );


  const rate =
    clamp(
      features.failureRate,
      0,
      1
    );


  return clamp(
    (
      recent7 * 0.30 +
      recent30 * 0.20 +
      streak * 0.25 +
      rate * 0.25
    ) * 100,
    0,
    100
  );
}


/**
 * Calculate risk score.
 */
function calculateRiskScore(
  features: RecoveryPriorityFeatures
): number {

  const activeRisk =
    clamp(
      features.activeRiskRatio,
      0,
      1
    );


  const failedRatio =
    clamp(
      features.currentFailedAmountRatio,
      0,
      1
    );


  const failureRate =
    clamp(
      features.failureRate,
      0,
      1
    );


  return clamp(
    (
      activeRisk * 0.45 +
      failedRatio * 0.35 +
      failureRate * 0.20
    ) * 100,
    0,
    100
  );
}


/**
 * Calculate historical recovery opportunity.
 */
function calculateHistoricalRecoveryScore(
  features: RecoveryPriorityFeatures
): number {

  const recoveryRate =
    clamp(
      features.historicalRecoveryRate,
      0,
      1
    );


  const efficiency =
    clamp(
      features.recoveryEfficiency,
      0,
      1
    );


  return clamp(
    (
      recoveryRate * 0.60 +
      efficiency * 0.40
    ) * 100,
    0,
    100
  );
}


/**
 * Create human-readable explanations.
 */
function buildSignals(
  features: RecoveryPriorityFeatures
): {
  positiveSignals: string[];
  negativeSignals: string[];
} {

  const positiveSignals: string[] = [];

  const negativeSignals: string[] = [];


  if (
    features.recoveryProbability >= 0.75
  ) {

    positiveSignals.push(
      "High estimated recovery probability"
    );

  } else if (
    features.recoveryProbability >= 0.50
  ) {

    positiveSignals.push(
      "Moderate estimated recovery probability"
    );

  }


  if (
    features.currentFailedAmountRatio >= 0.30
  ) {

    positiveSignals.push(
      "Significant recoverable amount is currently at risk"
    );

  }


  if (
    features.daysSinceLastFailure <= 1
  ) {

    positiveSignals.push(
      "Recovery opportunity is recent"
    );

  }


  if (
    features.historicalRecoveryRate >= 0.50
  ) {

    positiveSignals.push(
      "Customer has demonstrated historical recovery behavior"
    );

  }


  if (
    features.failureStreak >= 3
  ) {

    negativeSignals.push(
      "Customer has an elevated consecutive failure streak"
    );

  }


  if (
    features.failureRate >= 0.50
  ) {

    negativeSignals.push(
      "Customer has a high overall payment failure rate"
    );

  }


  if (
    features.activeRiskRatio >= 0.60
  ) {

    negativeSignals.push(
      "Large portion of customer value is currently exposed to recovery risk"
    );

  }


  if (
    features.confidence < 0.50
  ) {

    negativeSignals.push(
      "Priority decision has limited model confidence"
    );

  }


  return {
    positiveSignals,
    negativeSignals,
  };
}


/**
 * Convert score to priority band.
 */
function determinePriorityBand(
  score: number
): RecoveryPriorityBand {

  if (
    score >=
    RECOVERY_PRIORITY_MODEL.bands.critical
  ) {

    return "CRITICAL";

  }


  if (
    score >=
    RECOVERY_PRIORITY_MODEL.bands.high
  ) {

    return "HIGH";

  }


  if (
    score >=
    RECOVERY_PRIORITY_MODEL.bands.medium
  ) {

    return "MEDIUM";

  }


  return "LOW";
}


/**
 * Main priority calculation.
 */
export function calculateRecoveryPriority(
  features: RecoveryPriorityFeatures
): RecoveryPriorityResult {

  /*
   * ==========================================================
   * COMPONENT CALCULATIONS
   * ==========================================================
   */

  const probabilityScore =
    percentageScore(
      features.recoveryProbability
    );


  const amountScore =
    calculateAmountScore(
      features
    );


  const urgencyScore =
    calculateUrgencyScore(
      features
    );


  const riskScore =
    calculateRiskScore(
      features
    );


  const failureActivityScore =
    calculateFailureActivityScore(
      features
    );


  const historicalRecoveryScore =
    calculateHistoricalRecoveryScore(
      features
    );


  const confidenceScore =
    percentageScore(
      features.confidence
    );


  /*
   * ==========================================================
   * WEIGHTED SCORE
   * ==========================================================
   */

  const components: PriorityComponent[] = [

    {
      name: "recoveryProbability",
      score: probabilityScore,
      weight:
        RECOVERY_PRIORITY_MODEL.weights.probability,
      contribution:
        probabilityScore *
        RECOVERY_PRIORITY_MODEL.weights.probability /
        100,
      reason:
        "Estimated likelihood that the recovery opportunity can be recovered",
      signal:
        probabilityScore >= 70
          ? "POSITIVE"
          : "NEUTRAL",
    },


    {
      name: "amountExposure",
      score: amountScore,
      weight:
        RECOVERY_PRIORITY_MODEL.weights.amount,
      contribution:
        amountScore *
        RECOVERY_PRIORITY_MODEL.weights.amount /
        100,
      reason:
        "Relative financial exposure associated with the recovery opportunity",
      signal:
        amountScore >= 60
          ? "POSITIVE"
          : "NEUTRAL",
    },


    {
      name: "urgency",
      score: urgencyScore,
      weight:
        RECOVERY_PRIORITY_MODEL.weights.urgency,
      contribution:
        urgencyScore *
        RECOVERY_PRIORITY_MODEL.weights.urgency /
        100,
      reason:
        "Recency of the customer's payment failure",
      signal:
        urgencyScore >= 70
          ? "POSITIVE"
          : "NEUTRAL",
    },


    {
      name: "risk",
      score: riskScore,
      weight:
        RECOVERY_PRIORITY_MODEL.weights.risk,
      contribution:
        riskScore *
        RECOVERY_PRIORITY_MODEL.weights.risk /
        100,
      reason:
        "Current customer recovery risk exposure",
      signal:
        riskScore >= 60
          ? "POSITIVE"
          : "NEUTRAL",
    },


    {
      name: "failureActivity",
      score: failureActivityScore,
      weight:
        RECOVERY_PRIORITY_MODEL.weights.failureActivity,
      contribution:
        failureActivityScore *
        RECOVERY_PRIORITY_MODEL.weights.failureActivity /
        100,
      reason:
        "Recent payment failure activity",
      signal:
        failureActivityScore >= 60
          ? "POSITIVE"
          : "NEUTRAL",
    },


    {
      name: "historicalRecovery",
      score: historicalRecoveryScore,
      weight:
        RECOVERY_PRIORITY_MODEL.weights.historicalRecovery,
      contribution:
        historicalRecoveryScore *
        RECOVERY_PRIORITY_MODEL.weights.historicalRecovery /
        100,
      reason:
        "Historical recovery effectiveness",
      signal:
        historicalRecoveryScore >= 60
          ? "POSITIVE"
          : "NEUTRAL",
    },


    {
      name: "confidence",
      score: confidenceScore,
      weight:
        RECOVERY_PRIORITY_MODEL.weights.confidence,
      contribution:
        confidenceScore *
        RECOVERY_PRIORITY_MODEL.weights.confidence /
        100,
      reason:
        "Confidence in the underlying recovery assessment",
      signal:
        confidenceScore >= 60
          ? "POSITIVE"
          : "NEUTRAL",
    },

  ];


  /*
   * ==========================================================
   * FINAL SCORE
   * ==========================================================
   */

  const priorityScore =
    clamp(
      components.reduce(
        (
          total,
          component
        ) =>
          total +
          component.contribution,
        0
      ),
      RECOVERY_PRIORITY_MODEL.minScore,
      RECOVERY_PRIORITY_MODEL.maxScore
    );


  /*
   * Opportunity score:
   *
   * Probability + amount.
   */
  const opportunityScore =
    clamp(
      probabilityScore * 0.60 +
      amountScore * 0.40,
      0,
      100
    );


  /*
   * Confidence-adjusted score.
   *
   * We don't completely destroy the priority when
   * confidence is low.
   */
  const confidenceAdjustedScore =
    clamp(
      priorityScore *
      (
        0.70 +
        features.confidence * 0.30
      ),
      0,
      100
    );


  /*
   * Determine final band using confidence-adjusted score.
   */
  const priorityBand =
    determinePriorityBand(
      confidenceAdjustedScore
    );


  const {
    positiveSignals,
    negativeSignals,
  } =
    buildSignals(
      features
    );


  return {

    priorityScore:
      Number(
        priorityScore.toFixed(2)
      ),

    priorityBand,

    urgencyScore:
      Number(
        urgencyScore.toFixed(2)
      ),

    opportunityScore:
      Number(
        opportunityScore.toFixed(2)
      ),

    riskScore:
      Number(
        riskScore.toFixed(2)
      ),

    probabilityScore:
      Number(
        probabilityScore.toFixed(2)
      ),

    amountScore:
      Number(
        amountScore.toFixed(2)
      ),

    confidenceAdjustedScore:
      Number(
        confidenceAdjustedScore.toFixed(2)
      ),

    modelVersion:
      RECOVERY_PRIORITY_MODEL.version,

    positiveSignals,

    negativeSignals,

    components,

    featuresUsed: [

      "recoveryProbability",

      "confidence",

      "failureRate",

      "failureStreak",

      "recentFailureCount7d",

      "recentFailureCount30d",

      "currentFailedAmount",

      "currentFailedAmountRatio",

      "activeRiskRatio",

      "outstandingRecoveryAmount",

      "historicalRecoveryRate",

      "recoveryEfficiency",

      "daysSinceLastFailure",

    ],

    generatedAt:
      new Date(),

  };
}