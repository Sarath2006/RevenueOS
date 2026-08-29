/**
 * ============================================================
 * M6.6 — RECOVERY PROBABILITY TYPES
 * ============================================================
 *
 * Domain types for the deterministic recovery probability
 * engine.
 *
 * This module contains NO business logic.
 */

export type RecoveryProbabilityBand =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";

export interface RecoveryProbabilityFeatures {
  transactionCount: number;

  successfulTransactionCount: number;

  failedTransactionCount: number;

  pendingTransactionCount: number;

  successfulTransactionRate: number;

  failureRate: number;

  pendingRate: number;

  totalTransactionValue: number;

  successfulTransactionValue: number;

  failedTransactionValue: number;

  averageTransactionValue: number;

  averageSuccessfulTransactionValue: number;

  averageFailedTransactionValue: number;

  paymentMethodDiversity: number;

  preferredPaymentMethodSuccessRate: number;

  recoveryCaseCount: number;

  activeRecoveryCaseCount: number;

  recoveredCaseCount: number;

  totalAmountAtRisk: number;

  totalRecoveredAmount: number;

  outstandingRecoveryAmount: number;

  historicalRecoveryRate: number;

  averageRecoveryAmount: number;

  averageRecoveryRatio: number;

  failureStreak: number;

  successStreak: number;

  recentFailureCount7d: number;

  recentSuccessCount7d: number;

  recentFailureCount30d: number;

  recentSuccessCount30d: number;

  daysSinceLastTransaction: number;

  daysSinceLastSuccess: number;

  daysSinceLastFailure: number;

  daysSinceLastRecovery: number | null;

  currentFailedAmount: number;

  currentFailedAmountRatio: number;

  activeRiskRatio: number;

  failureFrequency30d: number;

  recoveryEfficiency: number;
}

export interface RecoveryProbabilityResult {
  probability: number;

  probabilityPercent: number;

  band: RecoveryProbabilityBand;

  modelVersion: string;

  confidence: number;

  score: number;

  positiveSignals: string[];

  negativeSignals: string[];

  featuresUsed: string[];

  generatedAt: Date;
}