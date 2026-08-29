/**
 * ============================================================
 * M6.8 — RECOVERY STRATEGY VALIDATION
 * ============================================================
 */

import { z } from "zod";


const featuresSchema =
  z.object({

    transactionCount:
      z.number().nonnegative(),

    successfulTransactionRate:
      z.number().min(0).max(1),

    failureRate:
      z.number().min(0).max(1),

    pendingRate:
      z.number().min(0).max(1),

    paymentMethodDiversity:
      z.number().nonnegative(),

    preferredPaymentMethodSuccessRate:
      z.number().min(0).max(1),

    historicalRecoveryRate:
      z.number().min(0).max(1),

    recoveryEfficiency:
      z.number().min(0).max(1),

    averageRecoveryRatio:
      z.number().min(0).max(1),

    failureStreak:
      z.number().nonnegative(),

    successStreak:
      z.number().nonnegative(),

    recentFailureCount7d:
      z.number().nonnegative(),

    recentSuccessCount7d:
      z.number().nonnegative(),

    recentFailureCount30d:
      z.number().nonnegative(),

    recentSuccessCount30d:
      z.number().nonnegative(),

    daysSinceLastFailure:
      z.number().nonnegative(),

    daysSinceLastSuccess:
      z.number().nonnegative(),

    currentFailedAmount:
      z.number().nonnegative(),

    currentFailedAmountRatio:
      z.number().min(0).max(1),

    activeRiskRatio:
      z.number().min(0).max(1),

    outstandingRecoveryAmount:
      z.number().nonnegative(),

    activeRecoveryCaseCount:
      z.number().nonnegative(),
  });


export const recoveryStrategySchema =
  z.object({

    customer_id:
      z.string().min(1),

    merchant_id:
      z.string().min(1),

    currency:
      z.string()
        .length(3)
        .transform(
          (value) =>
            value.toUpperCase()
        ),

    recoveryProbability:
      z.number().min(0).max(1),

    recoveryProbabilityPercent:
      z.number().min(0).max(100),

    probabilityBand:
      z.enum([
        "VERY_LOW",
        "LOW",
        "MEDIUM",
        "HIGH",
        "VERY_HIGH",
      ]),

    probabilityConfidence:
      z.number().min(0).max(1),

    priorityScore:
      z.number().min(0).max(100),

    priorityBand:
      z.enum([
        "CRITICAL",
        "HIGH",
        "MEDIUM",
        "LOW",
      ]),

    urgencyScore:
      z.number().min(0).max(100),

    opportunityScore:
      z.number().min(0).max(100),

    riskScore:
      z.number().min(0).max(100),

    amountScore:
      z.number().min(0).max(100),

    features:
      featuresSchema,
  });


export type RecoveryStrategyRequest =
  z.infer<
    typeof recoveryStrategySchema
  >;