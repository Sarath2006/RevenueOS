/**
 * ============================================================
 * M6.7 — RECOVERY PRIORITY TYPES
 * ============================================================
 *
 * Priority answers:
 *
 * "How urgently should RevenueOS prioritize
 *  this recovery opportunity?"
 *
 * This is intentionally different from probability.
 *
 * Probability:
 *     likelihood of recovery
 *
 * Priority:
 *     business urgency / opportunity
 */

export type RecoveryPriorityBand =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


export type PrioritySignalType =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL";


export interface RecoveryPriorityFeatures {

  /**
   * M6.6 recovery probability.
   *
   * Range:
   * 0 → 1
   */
  recoveryProbability: number;

  /**
   * M6.6 confidence.
   *
   * Range:
   * 0 → 1
   */
  confidence: number;

  /**
   * Customer feature information.
   */
  transactionCount: number;

  failedTransactionCount: number;

  failureRate: number;

  failureStreak: number;

  recentFailureCount7d: number;

  recentFailureCount30d: number;

  currentFailedAmount: number;

  currentFailedAmountRatio: number;

  activeRiskRatio: number;

  outstandingRecoveryAmount: number;

  totalAmountAtRisk: number;

  historicalRecoveryRate: number;

  recoveryEfficiency: number;

  daysSinceLastFailure: number;

  daysSinceLastTransaction: number;

  successfulTransactionRate: number;
}


export interface PriorityComponent {

  name: string;

  score: number;

  weight: number;

  contribution: number;

  reason: string;

  signal: PrioritySignalType;
}


export interface RecoveryPriorityResult {

  priorityScore: number;

  priorityBand: RecoveryPriorityBand;

  urgencyScore: number;

  opportunityScore: number;

  riskScore: number;

  probabilityScore: number;

  amountScore: number;

  confidenceAdjustedScore: number;

  modelVersion: string;

  positiveSignals: string[];

  negativeSignals: string[];

  components: PriorityComponent[];

  featuresUsed: string[];

  generatedAt: Date;
}