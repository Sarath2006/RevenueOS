/**
 * ============================================================
 * M6.11 — CONFIDENCE + FALLBACK TYPES
 * ============================================================
 *
 * Confidence answers:
 *
 * "How much should RevenueOS trust this AI decision?"
 *
 * Fallback answers:
 *
 * "What should RevenueOS do when confidence is too low?"
 *
 * This module does NOT:
 * - call Razorpay
 * - charge customers
 * - send notifications
 * - create recovery cases
 * - replace probability
 * - replace priority
 * - replace strategy
 * ============================================================
 */

export type ConfidenceBand =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";


export type FallbackAction =
  | "USE_PRIMARY_DECISION"
  | "USE_SAFE_STRATEGY"
  | "DEFER_DECISION"
  | "NO_ACTION";


export type FallbackReason =
  | "HIGH_CONFIDENCE"
  | "LOW_PROBABILITY_CONFIDENCE"
  | "LOW_PRIORITY_CONFIDENCE"
  | "LOW_STRATEGY_CONFIDENCE"
  | "LOW_FEATURE_QUALITY"
  | "CONFLICTING_SIGNALS"
  | "INVALID_AI_OUTPUT"
  | "MULTIPLE_LOW_CONFIDENCE_SIGNALS";


export interface ConfidenceInput {

  probability:
    number;

  probabilityConfidence:
    number;

  priorityScore:
    number;

  strategyScore:
    number;

  strategyConfidence:
    number;

  featureQuality:
    number;

  recoveryProbabilityBand:
    ConfidenceBand;

  priorityBand:
    "CRITICAL"
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  strategy:
    string;
}


export interface ConfidenceResult {

  confidence:
    number;

  confidencePercent:
    number;

  band:
    ConfidenceBand;

  fallbackRequired:
    boolean;

  fallbackAction:
    FallbackAction;

  fallbackReason:
    FallbackReason;

  primaryStrategy:
    string;

  selectedStrategy:
    string;

  decisionChanged:
    boolean;

  positiveSignals:
    string[];

  negativeSignals:
    string[];

  components: Array<{
    name: string;
    score: number;
    weight: number;
    contribution: number;
  }>;

  modelVersion:
    string;

  featuresUsed:
    string[];

  generatedAt:
    Date;
}