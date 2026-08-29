/**
 * ============================================================
 * M6.6 — RECOVERY PROBABILITY REQUEST SCHEMA
 * ============================================================
 */

import { z } from "zod";

const nonNegativeNumber = z
  .number()
  .finite()
  .nonnegative();

const ratio = z
  .number()
  .finite()
  .min(0)
  .max(1);

export const recoveryProbabilitySchema = z.object({
  customer_id: z
    .string()
    .trim()
    .min(1)
    .max(100),

  merchant_id: z
    .string()
    .trim()
    .min(1)
    .max(100),

  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),

  features: z.object({
    transactionCount:
      nonNegativeNumber,

    successfulTransactionCount:
      nonNegativeNumber,

    failedTransactionCount:
      nonNegativeNumber,

    pendingTransactionCount:
      nonNegativeNumber,

    successfulTransactionRate:
      ratio,

    failureRate:
      ratio,

    pendingRate:
      ratio,

    totalTransactionValue:
      nonNegativeNumber,

    successfulTransactionValue:
      nonNegativeNumber,

    failedTransactionValue:
      nonNegativeNumber,

    averageTransactionValue:
      nonNegativeNumber,

    averageSuccessfulTransactionValue:
      nonNegativeNumber,

    averageFailedTransactionValue:
      nonNegativeNumber,

    paymentMethodDiversity:
      nonNegativeNumber,

    preferredPaymentMethodSuccessRate:
      ratio,

    recoveryCaseCount:
      nonNegativeNumber,

    activeRecoveryCaseCount:
      nonNegativeNumber,

    recoveredCaseCount:
      nonNegativeNumber,

    totalAmountAtRisk:
      nonNegativeNumber,

    totalRecoveredAmount:
      nonNegativeNumber,

    outstandingRecoveryAmount:
      nonNegativeNumber,

    historicalRecoveryRate:
      ratio,

    averageRecoveryAmount:
      nonNegativeNumber,

    averageRecoveryRatio:
      ratio,

    failureStreak:
      nonNegativeNumber,

    successStreak:
      nonNegativeNumber,

    recentFailureCount7d:
      nonNegativeNumber,

    recentSuccessCount7d:
      nonNegativeNumber,

    recentFailureCount30d:
      nonNegativeNumber,

    recentSuccessCount30d:
      nonNegativeNumber,

    daysSinceLastTransaction:
      nonNegativeNumber,

    daysSinceLastSuccess:
      nonNegativeNumber,

    daysSinceLastFailure:
      nonNegativeNumber,

    daysSinceLastRecovery:
      nonNegativeNumber.nullable(),

    currentFailedAmount:
      nonNegativeNumber,

    currentFailedAmountRatio:
      ratio,

    activeRiskRatio:
      ratio,

    failureFrequency30d:
      nonNegativeNumber,

    recoveryEfficiency:
      ratio,
  }),
});

export type RecoveryProbabilityRequest =
  z.infer<
    typeof recoveryProbabilitySchema
  >;