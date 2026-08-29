/**
 * ============================================================
 * M6.8 — RECOVERY STRATEGY ENGINE
 * ============================================================
 *
 * Deterministic strategy recommendation engine.
 *
 * Inputs:
 *
 * Recovery Probability
 * Recovery Priority
 * Customer Features
 *
 * Output:
 *
 * Best recovery strategy
 *
 * The engine is intentionally deterministic.
 *
 * Future ML/LLM providers can be introduced behind the same
 * contract without changing the API layer.
 * ============================================================
 */

import {
  RECOVERY_STRATEGY_MODEL,
} from "./strategy.config";

import {
  RecoveryStrategy,
  StrategyChannel,
  StrategyContext,
  StrategyPriority,
  StrategyRecommendation,
  StrategyTiming,
  RecoveryStrategyFeatures,
} from "./strategy.types";

function normalizeStrategyContext(
  context: StrategyContext,
): StrategyContext {

  if (!context) {
    throw new Error(
      "Recovery strategy context is missing",
    );
  }

  /**
   * Normal expected structure:
   *
   * context.features
   */
  if (context.features) {
    return context;
  }

  /**
   * Defensive compatibility layer.
   *
   * If an older caller accidentally passes the feature
   * fields directly on the context, recover them here.
   *
   * This does NOT change the StrategyContext contract.
   */
  const legacyContext =
    context as StrategyContext &
      Partial<RecoveryStrategyFeatures>;

  const possibleFeatures = {
    transactionCount:
      legacyContext.transactionCount,

    successfulTransactionRate:
      legacyContext.successfulTransactionRate,

    failureRate:
      legacyContext.failureRate,

    pendingRate:
      legacyContext.pendingRate,

    paymentMethodDiversity:
      legacyContext.paymentMethodDiversity,

    preferredPaymentMethodSuccessRate:
      legacyContext.preferredPaymentMethodSuccessRate,

    historicalRecoveryRate:
      legacyContext.historicalRecoveryRate,

    recoveryEfficiency:
      legacyContext.recoveryEfficiency,

    averageRecoveryRatio:
      legacyContext.averageRecoveryRatio,

    failureStreak:
      legacyContext.failureStreak,

    successStreak:
      legacyContext.successStreak,

    recentFailureCount7d:
      legacyContext.recentFailureCount7d,

    recentSuccessCount7d:
      legacyContext.recentSuccessCount7d,

    recentFailureCount30d:
      legacyContext.recentFailureCount30d,

    recentSuccessCount30d:
      legacyContext.recentSuccessCount30d,

    daysSinceLastFailure:
      legacyContext.daysSinceLastFailure,

    daysSinceLastSuccess:
      legacyContext.daysSinceLastSuccess,

    currentFailedAmount:
      legacyContext.currentFailedAmount,

    currentFailedAmountRatio:
      legacyContext.currentFailedAmountRatio,

    activeRiskRatio:
      legacyContext.activeRiskRatio,

    outstandingRecoveryAmount:
      legacyContext.outstandingRecoveryAmount,

    activeRecoveryCaseCount:
      legacyContext.activeRecoveryCaseCount,
  };

  const missingFeatures =
    Object.entries(possibleFeatures)
      .filter(
        ([, value]) =>
          typeof value !== "number" ||
          !Number.isFinite(value),
      )
      .map(([key]) => key);

  if (missingFeatures.length > 0) {
    throw new Error(
      `Recovery strategy features are missing or invalid: ${missingFeatures.join(", ")}`,
    );
  }

  return {
    ...context,
    features:
      possibleFeatures as RecoveryStrategyFeatures,
  };
}


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
  decimals = 2
): number {
  const factor =
    Math.pow(10, decimals);

  return (
    Math.round(value * factor) /
    factor
  );
}


function calculateFeatureQuality(
  context: StrategyContext
): number {

  const f = context.features;

  const checks = [
    f.transactionCount > 0,
    f.successfulTransactionRate >= 0,
    f.failureRate >= 0,
    f.paymentMethodDiversity >= 0,
    f.historicalRecoveryRate >= 0,
    f.recoveryEfficiency >= 0,
    f.daysSinceLastFailure >= 0,
    f.currentFailedAmount >= 0,
    f.outstandingRecoveryAmount >= 0,
  ];

  const valid =
    checks.filter(Boolean).length;

  return clamp(
    valid / checks.length,
    0,
    1
  );
}


function calculateConfidence(
  context: StrategyContext
): number {

  const probabilityConfidence =
    clamp(
      context.probabilityConfidence,
      0,
      1
    );

  const priorityConfidence =
    clamp(
      context.priorityScore / 100,
      0,
      1
    );

  const featureQuality =
    calculateFeatureQuality(
      context
    );

  const confidence =
    probabilityConfidence *
      RECOVERY_STRATEGY_MODEL.confidence
        .probabilityWeight +

    priorityConfidence *
      RECOVERY_STRATEGY_MODEL.confidence
        .priorityWeight +

    featureQuality *
      RECOVERY_STRATEGY_MODEL.confidence
        .featureWeight;

  return round(
    clamp(
      confidence,
      RECOVERY_STRATEGY_MODEL.confidence.minimum,
      RECOVERY_STRATEGY_MODEL.confidence.maximum
    ),
    4
  );
}


function scoreRetryPayment(
  context: StrategyContext
): number {

  const f = context.features;

  let score =
    RECOVERY_STRATEGY_MODEL.scores
      .retryPayment;

  if (
    context.recoveryProbability >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highProbability
  ) {
    score += 8;
  }

  if (
    context.urgencyScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highUrgency
  ) {
    score += 7;
  }

  if (
    f.daysSinceLastFailure <=
    RECOVERY_STRATEGY_MODEL.thresholds
      .recentFailureDays
  ) {
    score += 5;
  }

  if (
    f.failureStreak <= 2
  ) {
    score += 3;
  }

  if (
    f.preferredPaymentMethodSuccessRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .strongPaymentMethodSuccessRate
  ) {
    score += 4;
  }

  if (
    f.failureStreak >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureStreak
  ) {
    score -= 12;
  }

  if (
    f.failureRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureRate
  ) {
    score -= 8;
  }

  return clamp(
    score,
    0,
    100
  );
}


function scoreAlternatePaymentMethod(
  context: StrategyContext
): number {

  const f = context.features;

  let score =
    RECOVERY_STRATEGY_MODEL.scores
      .alternatePaymentMethod;

  if (
    f.paymentMethodDiversity >= 2
  ) {
    score += 10;
  }

  if (
    f.preferredPaymentMethodSuccessRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .strongPaymentMethodSuccessRate
  ) {
    score += 6;
  }

  if (
    f.failureRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureRate
  ) {
    score += 7;
  }

  if (
    context.recoveryProbability >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .mediumProbability
  ) {
    score += 4;
  }

  if (
    f.paymentMethodDiversity <= 1
  ) {
    score -= 15;
  }

  return clamp(
    score,
    0,
    100
  );
}


function scoreCustomerReminder(
  context: StrategyContext
): number {

  const f = context.features;

  let score =
    RECOVERY_STRATEGY_MODEL.scores
      .customerReminder;

  if (
    context.recoveryProbability >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .mediumProbability
  ) {
    score += 8;
  }

  if (
    context.priorityScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .mediumPriority
  ) {
    score += 6;
  }

  if (
    f.failureStreak >= 2
  ) {
    score += 5;
  }

  if (
    f.daysSinceLastFailure <=
    RECOVERY_STRATEGY_MODEL.thresholds
      .recentFailureDays
  ) {
    score += 5;
  }

  return clamp(
    score,
    0,
    100
  );
}


function scoreAssistedRecovery(
  context: StrategyContext
): number {

  const f = context.features;

  let score =
    RECOVERY_STRATEGY_MODEL.scores
      .assistedRecovery;

  if (
    context.priorityScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highPriority
  ) {
    score += 12;
  }

  if (
    f.outstandingRecoveryAmount > 0
  ) {
    score += 6;
  }

  if (
    f.activeRiskRatio >= 0.5
  ) {
    score += 7;
  }

  if (
    f.failureStreak >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureStreak
  ) {
    score += 8;
  }

  if (
    context.recoveryProbability <
    RECOVERY_STRATEGY_MODEL.thresholds
      .mediumProbability
  ) {
    score -= 10;
  }

  return clamp(
    score,
    0,
    100
  );
}


function scoreDeferAndRetry(
  context: StrategyContext
): number {

  const f = context.features;

  let score =
    RECOVERY_STRATEGY_MODEL.scores
      .deferAndRetry;

  if (
    f.failureStreak >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureStreak
  ) {
    score += 12;
  }

  if (
    f.failureRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureRate
  ) {
    score += 10;
  }

  if (
    context.riskScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highRisk
  ) {
    score += 8;
  }

  if (
    context.recoveryProbability <
    RECOVERY_STRATEGY_MODEL.thresholds
      .mediumProbability
  ) {
    score += 5;
  }

  return clamp(
    score,
    0,
    100
  );
}


function buildPositiveSignals(
  context: StrategyContext
): string[] {

  const f = context.features;

  const signals: string[] = [];

  if (
    context.recoveryProbability >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highProbability
  ) {
    signals.push(
      "High estimated recovery probability"
    );
  }

  if (
    context.priorityScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highPriority
  ) {
    signals.push(
      "High recovery priority"
    );
  }

  if (
    context.urgencyScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highUrgency
  ) {
    signals.push(
      "Recovery opportunity is highly recent"
    );
  }

  if (
    f.paymentMethodDiversity >= 2
  ) {
    signals.push(
      "Customer has multiple payment methods"
    );
  }

  if (
    f.preferredPaymentMethodSuccessRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .strongPaymentMethodSuccessRate
  ) {
    signals.push(
      "Preferred payment method has strong success history"
    );
  }

  if (
    f.historicalRecoveryRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .strongRecoveryRate
  ) {
    signals.push(
      "Customer has demonstrated historical recovery behavior"
    );
  }

  return signals;
}


function buildNegativeSignals(
  context: StrategyContext
): string[] {

  const f = context.features;

  const signals: string[] = [];

  if (
    f.failureStreak >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureStreak
  ) {
    signals.push(
      "Customer has an elevated failure streak"
    );
  }

  if (
    f.failureRate >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highFailureRate
  ) {
    signals.push(
      "Historical payment failure rate is high"
    );
  }

  if (
    context.riskScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highRisk
  ) {
    signals.push(
      "Customer has high active recovery risk"
    );
  }

  if (
    context.recoveryProbability <
    RECOVERY_STRATEGY_MODEL.thresholds
      .mediumProbability
  ) {
    signals.push(
      "Estimated recovery probability is low"
    );
  }

  return signals;
}


function determineChannel(
  strategy: RecoveryStrategy,
  context: StrategyContext
): StrategyChannel {

  const f = context.features;

  switch (strategy) {

    case "RETRY_PAYMENT":
      return "PAYMENT_RETRY";

    case "ALTERNATE_PAYMENT_METHOD":

      if (
        f.preferredPaymentMethodSuccessRate >=
        RECOVERY_STRATEGY_MODEL.thresholds
          .strongPaymentMethodSuccessRate
      ) {
        return "UPI";
      }

      return "CARD";

    case "CUSTOMER_REMINDER":
      return "WHATSAPP";

    case "ASSISTED_RECOVERY":
      return "VOICE";

    case "DEFER_AND_RETRY":
      return "PAYMENT_RETRY";

    case "NO_ACTION":
    default:
      return "NONE";
  }
}


function determineTiming(
  strategy: RecoveryStrategy,
  context: StrategyContext
): StrategyTiming {

  if (strategy === "NO_ACTION") {
    return "NO_ACTION";
  }

  if (
    context.urgencyScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highUrgency
  ) {
    return "IMMEDIATE";
  }

  if (
    context.priorityScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .highPriority
  ) {
    return "WITHIN_1_HOUR";
  }

  if (
    context.priorityScore >=
    RECOVERY_STRATEGY_MODEL.thresholds
      .mediumPriority
  ) {
    return "WITHIN_6_HOURS";
  }

  return "WITHIN_24_HOURS";
}


function determinePriority(
  score: number
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE" {

  if (score >= 85) {
    return "CRITICAL";
  }

  if (score >= 65) {
    return "HIGH";
  }

  if (score >= 40) {
    return "MEDIUM";
  }

  if (score > 0) {
    return "LOW";
  }

  return "NONE";
}


function buildReason(
  strategy: RecoveryStrategy,
  context: StrategyContext
): string {

  const f = context.features;

  switch (strategy) {

    case "RETRY_PAYMENT":
      return (
        "Immediate payment retry is recommended because " +
        "the recovery probability and opportunity are sufficiently strong."
      );

    case "ALTERNATE_PAYMENT_METHOD":
      return (
        "An alternate payment method is recommended because " +
        "the current failure pattern and payment-method diversity " +
        "indicate another payment rail may improve recovery."
      );

    case "CUSTOMER_REMINDER":
      return (
        "A customer reminder is recommended because the opportunity " +
        "remains recoverable and customer engagement may improve conversion."
      );

    case "ASSISTED_RECOVERY":
      return (
        "Assisted recovery is recommended because the opportunity has " +
        "meaningful financial exposure or elevated recovery risk."
      );

    case "DEFER_AND_RETRY":
      return (
        "Recovery should be deferred before another retry because " +
        "the current failure pattern indicates immediate retry may be less effective."
      );

    case "NO_ACTION":
      return (
        "No immediate recovery action is recommended because the current " +
        "recovery assessment does not provide sufficient opportunity."
      );

    default:
      return (
        `Strategy selected using recovery probability ${context.recoveryProbabilityPercent}% ` +
        `and priority score ${context.priorityScore}.`
      );
  }
}


export function recommendRecoveryStrategy(
  context: StrategyContext
): StrategyRecommendation {

  context =
    normalizeStrategyContext(context);

  const candidates = [
    {
      strategy:
        "RETRY_PAYMENT" as RecoveryStrategy,
      score:
        scoreRetryPayment(context),
    },

    {
      strategy:
        "ALTERNATE_PAYMENT_METHOD" as RecoveryStrategy,
      score:
        scoreAlternatePaymentMethod(context),
    },

    {
      strategy:
        "CUSTOMER_REMINDER" as RecoveryStrategy,
      score:
        scoreCustomerReminder(context),
    },

    {
      strategy:
        "ASSISTED_RECOVERY" as RecoveryStrategy,
      score:
        scoreAssistedRecovery(context),
    },

    {
      strategy:
        "DEFER_AND_RETRY" as RecoveryStrategy,
      score:
        scoreDeferAndRetry(context),
    },
  ];

  /*
   * If recovery probability is extremely low,
   * explicitly allow NO_ACTION.
   */
  if (
    context.recoveryProbability <
    RECOVERY_STRATEGY_MODEL.thresholds
      .lowProbability
  ) {
    candidates.push({
      strategy: "NO_ACTION",
      score: 70,
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  const winner =
    candidates[0];

  const confidence =
    calculateConfidence(
      context
    );

  const strategyScore =
    round(
      winner.score,
      2
    );

  const strategy =
    winner.strategy;

  const priority =
    determinePriority(
      strategyScore
    );

  const alternatives =
    candidates
      .slice(1, 4)
      .map((candidate) => ({
        strategy:
          candidate.strategy,

        score:
          round(candidate.score, 2),

        reason:
          `Alternative strategy score: ${round(
            candidate.score,
            2
          )}`,
      }));

  const featuresUsed = [
    "recoveryProbability",
    "recoveryProbabilityConfidence",
    "priorityScore",
    "priorityBand",
    "urgencyScore",
    "opportunityScore",
    "riskScore",
    "transactionCount",
    "successfulTransactionRate",
    "failureRate",
    "paymentMethodDiversity",
    "preferredPaymentMethodSuccessRate",
    "historicalRecoveryRate",
    "recoveryEfficiency",
    "failureStreak",
    "recentFailureCount7d",
    "recentFailureCount30d",
    "daysSinceLastFailure",
    "currentFailedAmount",
    "currentFailedAmountRatio",
    "activeRiskRatio",
    "outstandingRecoveryAmount",
  ];

  return {
    strategy,

    channel:
      determineChannel(
        strategy,
        context
      ),

    timing:
      determineTiming(
        strategy,
        context
      ),

    priority,

    strategyScore,

    confidence,

    reason:
      buildReason(
        strategy,
        context
      ),

    positiveSignals:
      buildPositiveSignals(
        context
      ),

    negativeSignals:
      buildNegativeSignals(
        context
      ),

    alternatives,

    modelVersion:
      RECOVERY_STRATEGY_MODEL.version,

    featuresUsed,

    generatedAt:
      new Date(),
  };
}