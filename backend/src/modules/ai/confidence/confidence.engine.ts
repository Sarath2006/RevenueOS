/**
 * ============================================================
 * M6.11 — CONFIDENCE + FALLBACK ENGINE
 * ============================================================
 *
 * Responsibility:
 *
 * Evaluate confidence in the existing AI pipeline and decide
 * whether the primary recommendation can safely be used.
 *
 * Pipeline:
 *
 * Probability
 *      ↓
 * Priority
 *      ↓
 * Strategy
 *      ↓
 * Confidence
 *      ↓
 * Fallback if necessary
 *
 * IMPORTANT:
 *
 * This engine does NOT modify the probability engine.
 * This engine does NOT modify the priority engine.
 * This engine does NOT modify the strategy engine.
 *
 * It only evaluates their outputs.
 * ============================================================
 */

import {
  CONFIDENCE_FALLBACK_MODEL,
} from "./confidence.config";

import {
  ConfidenceBand,
  ConfidenceInput,
  ConfidenceResult,
  FallbackAction,
  FallbackReason,
} from "./confidence.types";


function clamp(
  value: number,
  min: number,
  max: number,
): number {

  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(
    Math.max(value, min),
    max,
  );
}


function round(
  value: number,
  decimals = 4,
): number {

  const factor =
    Math.pow(10, decimals);

  return (
    Math.round(value * factor) /
    factor
  );
}


/**
 * ------------------------------------------------------------
 * Normalize incoming values
 * ------------------------------------------------------------
 */

function normalizeInput(
  input: ConfidenceInput,
): ConfidenceInput {

  return {

    ...input,

    probability:
      clamp(
        input.probability,
        0,
        1,
      ),

    probabilityConfidence:
      clamp(
        input.probabilityConfidence,
        0,
        1,
      ),

    priorityScore:
      clamp(
        input.priorityScore,
        0,
        100,
      ),

    strategyScore:
      clamp(
        input.strategyScore,
        0,
        100,
      ),

    strategyConfidence:
      clamp(
        input.strategyConfidence,
        0,
        1,
      ),

    featureQuality:
      clamp(
        input.featureQuality,
        0,
        1,
      ),
  };
}


/**
 * ------------------------------------------------------------
 * Priority confidence
 * ------------------------------------------------------------
 *
 * Priority does not currently expose an independent confidence
 * value.
 *
 * Therefore we derive a bounded confidence proxy from:
 *
 * - priority score
 * - probability confidence
 *
 * This does not alter M6.7.
 * ------------------------------------------------------------
 */

function calculatePriorityConfidence(
  input: ConfidenceInput,
): number {

  const priorityScore =
    clamp(
      input.priorityScore / 100,
      0,
      1,
    );

  const probabilityConfidence =
    clamp(
      input.probabilityConfidence,
      0,
      1,
    );

  return round(
    (
      priorityScore * 0.60
    ) +
    (
      probabilityConfidence * 0.40
    ),
    4,
  );
}


/**
 * ------------------------------------------------------------
 * Feature quality
 * ------------------------------------------------------------
 */

function calculateFeatureQuality(
  input: ConfidenceInput,
): number {

  return clamp(
    input.featureQuality,
    0,
    1,
  );
}


/**
 * ------------------------------------------------------------
 * Overall confidence
 * ------------------------------------------------------------
 */

function calculateOverallConfidence(
  input: ConfidenceInput,
): {
  confidence: number;
  components: ConfidenceResult["components"];
} {

  const priorityConfidence =
    calculatePriorityConfidence(
      input,
    );

  const probabilityConfidence =
    clamp(
      input.probabilityConfidence,
      0,
      1,
    );

  const strategyConfidence =
    clamp(
      input.strategyConfidence,
      0,
      1,
    );

  const featureQuality =
    calculateFeatureQuality(
      input,
    );


  const probabilityContribution =
    probabilityConfidence *
    CONFIDENCE_FALLBACK_MODEL.weights
      .probabilityConfidence;


  const priorityContribution =
    priorityConfidence *
    CONFIDENCE_FALLBACK_MODEL.weights
      .priorityConfidence;


  const strategyContribution =
    strategyConfidence *
    CONFIDENCE_FALLBACK_MODEL.weights
      .strategyConfidence;


  const featureContribution =
    featureQuality *
    CONFIDENCE_FALLBACK_MODEL.weights
      .featureQuality;


  const confidence =
    clamp(
      probabilityContribution +
      priorityContribution +
      strategyContribution +
      featureContribution,

      CONFIDENCE_FALLBACK_MODEL.confidence.minimum,

      CONFIDENCE_FALLBACK_MODEL.confidence.maximum,
    );


  return {

    confidence:
      round(
        confidence,
        4,
      ),

    components: [

      {
        name:
          "probabilityConfidence",

        score:
          round(
            probabilityConfidence,
            4,
          ),

        weight:
          CONFIDENCE_FALLBACK_MODEL.weights
            .probabilityConfidence,

        contribution:
          round(
            probabilityContribution,
            4,
          ),
      },

      {
        name:
          "priorityConfidence",

        score:
          round(
            priorityConfidence,
            4,
          ),

        weight:
          CONFIDENCE_FALLBACK_MODEL.weights
            .priorityConfidence,

        contribution:
          round(
            priorityContribution,
            4,
          ),
      },

      {
        name:
          "strategyConfidence",

        score:
          round(
            strategyConfidence,
            4,
          ),

        weight:
          CONFIDENCE_FALLBACK_MODEL.weights
            .strategyConfidence,

        contribution:
          round(
            strategyContribution,
            4,
          ),
      },

      {
        name:
          "featureQuality",

        score:
          round(
            featureQuality,
            4,
          ),

        weight:
          CONFIDENCE_FALLBACK_MODEL.weights
            .featureQuality,

        contribution:
          round(
            featureContribution,
            4,
          ),
      },

    ],
  };
}


/**
 * ------------------------------------------------------------
 * Confidence band
 * ------------------------------------------------------------
 */

function determineConfidenceBand(
  confidence: number,
): ConfidenceBand {

  if (
    confidence <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .veryLow
  ) {
    return "VERY_LOW";
  }


  if (
    confidence <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .low
  ) {
    return "LOW";
  }


  if (
    confidence <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .medium
  ) {
    return "MEDIUM";
  }


  if (
    confidence <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .high
  ) {
    return "HIGH";
  }


  return "VERY_HIGH";
}


/**
 * ------------------------------------------------------------
 * Invalid output detection
 * ------------------------------------------------------------
 */

function hasInvalidOutput(
  input: ConfidenceInput,
): boolean {

  return (

    !Number.isFinite(
      input.probability,
    ) ||

    !Number.isFinite(
      input.probabilityConfidence,
    ) ||

    !Number.isFinite(
      input.priorityScore,
    ) ||

    !Number.isFinite(
      input.strategyScore,
    ) ||

    !Number.isFinite(
      input.strategyConfidence,
    ) ||

    !Number.isFinite(
      input.featureQuality,
    ) ||

    !input.strategy
  );
}


/**
 * ------------------------------------------------------------
 * Fallback reason
 * ------------------------------------------------------------
 */

function determineFallbackReason(
  input: ConfidenceInput,
  confidence: number,
): FallbackReason {

  if (
    hasInvalidOutput(input)
  ) {
    return "INVALID_AI_OUTPUT";
  }


  const lowProbability =
    input.probabilityConfidence <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .minimumProbabilityConfidence;


  const lowStrategy =
    input.strategyConfidence <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .minimumStrategyConfidence;


  const lowFeatures =
    input.featureQuality <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .minimumFeatureQuality;


  const lowPriority =
    input.priorityScore <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .minimumPriorityScore;


  const count =
    [
      lowProbability,
      lowStrategy,
      lowFeatures,
      lowPriority,
    ].filter(Boolean).length;


  if (count >= 2) {
    return "MULTIPLE_LOW_CONFIDENCE_SIGNALS";
  }


  if (lowProbability) {
    return "LOW_PROBABILITY_CONFIDENCE";
  }


  if (lowStrategy) {
    return "LOW_STRATEGY_CONFIDENCE";
  }


  if (lowFeatures) {
    return "LOW_FEATURE_QUALITY";
  }


  if (lowPriority) {
    return "LOW_PRIORITY_CONFIDENCE";
  }


  if (
    confidence <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .medium
  ) {
    return "CONFLICTING_SIGNALS";
  }


  return "HIGH_CONFIDENCE";
}


/**
 * ------------------------------------------------------------
 * Fallback action
 * ------------------------------------------------------------
 */

function determineFallbackAction(
  input: ConfidenceInput,
  confidence: number,
  reason: FallbackReason,
): FallbackAction {

  if (
    reason === "INVALID_AI_OUTPUT"
  ) {
    return "NO_ACTION";
  }


  if (
    confidence >=
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .medium
  ) {
    return "USE_PRIMARY_DECISION";
  }


  if (
    input.probability <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .veryLow
  ) {
    return "NO_ACTION";
  }


  if (
    input.featureQuality <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .minimumFeatureQuality
  ) {
    return "DEFER_DECISION";
  }


  return "USE_SAFE_STRATEGY";
}


/**
 * ------------------------------------------------------------
 * Safe strategy
 * ------------------------------------------------------------
 */

function determineSafeStrategy(
  action: FallbackAction,
  primaryStrategy: string,
  probability: number,
): string {

  if (
    action ===
    "USE_PRIMARY_DECISION"
  ) {
    return primaryStrategy;
  }


  if (
    action ===
    "NO_ACTION"
  ) {
    return (
      CONFIDENCE_FALLBACK_MODEL
        .fallback
        .noActionStrategy
    );
  }


  if (
    action ===
    "DEFER_DECISION"
  ) {
    return (
      CONFIDENCE_FALLBACK_MODEL
        .fallback
        .deferredStrategy
    );
  }


  if (
    probability <
    CONFIDENCE_FALLBACK_MODEL.thresholds
      .veryLow
  ) {
    return (
      CONFIDENCE_FALLBACK_MODEL
        .fallback
        .noActionStrategy
    );
  }


  return (
    CONFIDENCE_FALLBACK_MODEL
      .fallback
      .safeStrategy
  );
}


/**
 * ------------------------------------------------------------
 * Signals
 * ------------------------------------------------------------
 */

function buildPositiveSignals(
  input: ConfidenceInput,
  confidence: number,
): string[] {

  const signals: string[] = [];


  if (
    input.probabilityConfidence >= 0.80
  ) {
    signals.push(
      "Recovery probability confidence is high",
    );
  }


  if (
    input.strategyConfidence >= 0.80
  ) {
    signals.push(
      "Recovery strategy confidence is high",
    );
  }


  if (
    input.featureQuality >= 0.80
  ) {
    signals.push(
      "Customer feature quality is strong",
    );
  }


  if (
    input.priorityScore >= 65
  ) {
    signals.push(
      "Recovery priority provides sufficient decision signal",
    );
  }


  if (
    confidence >= 0.80
  ) {
    signals.push(
      "Overall AI decision confidence is high",
    );
  }


  return signals;
}


function buildNegativeSignals(
  input: ConfidenceInput,
  confidence: number,
): string[] {

  const signals: string[] = [];


  if (
    input.probabilityConfidence < 0.45
  ) {
    signals.push(
      "Recovery probability confidence is low",
    );
  }


  if (
    input.strategyConfidence < 0.45
  ) {
    signals.push(
      "Recovery strategy confidence is low",
    );
  }


  if (
    input.featureQuality < 0.60
  ) {
    signals.push(
      "Customer feature quality is incomplete",
    );
  }


  if (
    input.priorityScore < 25
  ) {
    signals.push(
      "Recovery priority signal is weak",
    );
  }


  if (
    confidence < 0.60
  ) {
    signals.push(
      "Overall AI decision confidence is below the preferred threshold",
    );
  }


  return signals;
}


/**
 * ------------------------------------------------------------
 * Public engine
 * ------------------------------------------------------------
 */

export function evaluateConfidenceAndFallback(
  input: ConfidenceInput,
): ConfidenceResult {

  const normalized =
    normalizeInput(input);


  const {
    confidence,
    components,
  } =
    calculateOverallConfidence(
      normalized,
    );


  const band =
    determineConfidenceBand(
      confidence,
    );


  const reason =
    determineFallbackReason(
      normalized,
      confidence,
    );


  const fallbackAction =
    determineFallbackAction(
      normalized,
      confidence,
      reason,
    );


  const selectedStrategy =
    determineSafeStrategy(
      fallbackAction,
      normalized.strategy,
      normalized.probability,
    );


  const decisionChanged =
    selectedStrategy !==
    normalized.strategy;


  const fallbackRequired =
    fallbackAction !==
    "USE_PRIMARY_DECISION";


  const positiveSignals =
    buildPositiveSignals(
      normalized,
      confidence,
    );


  const negativeSignals =
    buildNegativeSignals(
      normalized,
      confidence,
    );


  return {

    confidence,

    confidencePercent:
      round(
        confidence * 100,
        2,
      ),

    band,

    fallbackRequired,

    fallbackAction,

    fallbackReason:
      reason,

    primaryStrategy:
      normalized.strategy,

    selectedStrategy,

    decisionChanged,

    positiveSignals,

    negativeSignals,

    components,

    modelVersion:
      CONFIDENCE_FALLBACK_MODEL.version,

    featuresUsed: [

      "probabilityConfidence",

      "priorityScore",

      "strategyScore",

      "strategyConfidence",

      "featureQuality",

      "recoveryProbability",

    ],

    generatedAt:
      new Date(),
  };
}