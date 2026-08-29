/**
 * ============================================================
 * M6.8 — RECOVERY STRATEGY TYPES
 * ============================================================
 */

export type RecoveryStrategy =
  | "RETRY_PAYMENT"
  | "ALTERNATE_PAYMENT_METHOD"
  | "CUSTOMER_REMINDER"
  | "ASSISTED_RECOVERY"
  | "DEFER_AND_RETRY"
  | "NO_ACTION";


export type StrategyChannel =
  | "PAYMENT_RETRY"
  | "UPI"
  | "CARD"
  | "EMAIL"
  | "SMS"
  | "WHATSAPP"
  | "VOICE"
  | "NONE";


export type StrategyTiming =
  | "IMMEDIATE"
  | "WITHIN_1_HOUR"
  | "WITHIN_6_HOURS"
  | "WITHIN_24_HOURS"
  | "WITHIN_3_DAYS"
  | "NO_ACTION";


export type StrategyPriority =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "NONE";


export interface RecoveryStrategyFeatures {

  transactionCount: number;

  successfulTransactionRate: number;

  failureRate: number;

  pendingRate: number;

  paymentMethodDiversity: number;

  preferredPaymentMethodSuccessRate: number;

  historicalRecoveryRate: number;

  recoveryEfficiency: number;

  averageRecoveryRatio: number;

  failureStreak: number;

  successStreak: number;

  recentFailureCount7d: number;

  recentSuccessCount7d: number;

  recentFailureCount30d: number;

  recentSuccessCount30d: number;

  daysSinceLastFailure: number;

  daysSinceLastSuccess: number;

  currentFailedAmount: number;

  currentFailedAmountRatio: number;

  activeRiskRatio: number;

  outstandingRecoveryAmount: number;

  activeRecoveryCaseCount: number;
}


export interface StrategyContext {

  recoveryProbability: number;

  recoveryProbabilityPercent: number;

  probabilityBand:
    | "VERY_LOW"
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "VERY_HIGH";

  probabilityConfidence: number;

  priorityScore: number;

  priorityBand:
    | "CRITICAL"
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  urgencyScore: number;

  opportunityScore: number;

  riskScore: number;

  amountScore: number;

  /**
   * All customer/payment features
   * MUST remain nested here.
   */
  features: RecoveryStrategyFeatures;
}


export interface StrategyRecommendation {

  strategy: RecoveryStrategy;

  channel: StrategyChannel;

  timing: StrategyTiming;

  priority: StrategyPriority;

  strategyScore: number;

  confidence: number;

  reason: string;

  positiveSignals: string[];

  negativeSignals: string[];

  alternatives: Array<{
    strategy: RecoveryStrategy;
    score: number;
    reason: string;
  }>;

  modelVersion: string;

  featuresUsed: string[];

  generatedAt: Date;
}