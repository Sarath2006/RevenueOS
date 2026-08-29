/**
 * ============================================================
 * M6.7 — RECOVERY PRIORITY VALIDATION
 * ============================================================
 */

import {
  z,
} from "zod";


export const recoveryPrioritySchema =
  z.object({

    customer_id:
      z.string().min(1),

    merchant_id:
      z.string().min(1),

    currency:
      z.string()
        .length(3)
        .transform(
          value =>
            value.toUpperCase()
        ),

    features:
      z.object({

        recoveryProbability:
          z.number()
            .min(0)
            .max(1),

        confidence:
          z.number()
            .min(0)
            .max(1),

        transactionCount:
          z.number()
            .nonnegative(),

        failedTransactionCount:
          z.number()
            .nonnegative(),

        failureRate:
          z.number()
            .min(0)
            .max(1),

        failureStreak:
          z.number()
            .nonnegative(),

        recentFailureCount7d:
          z.number()
            .nonnegative(),

        recentFailureCount30d:
          z.number()
            .nonnegative(),

        currentFailedAmount:
          z.number()
            .nonnegative(),

        currentFailedAmountRatio:
          z.number()
            .min(0)
            .max(1),

        activeRiskRatio:
          z.number()
            .min(0)
            .max(1),

        outstandingRecoveryAmount:
          z.number()
            .nonnegative(),

        totalAmountAtRisk:
          z.number()
            .nonnegative(),

        historicalRecoveryRate:
          z.number()
            .min(0)
            .max(1),

        recoveryEfficiency:
          z.number()
            .min(0)
            .max(1),

        daysSinceLastFailure:
          z.number()
            .nonnegative(),

        daysSinceLastTransaction:
          z.number()
            .nonnegative(),

        successfulTransactionRate:
          z.number()
            .min(0)
            .max(1),

      }),

  });


export type RecoveryPriorityRequest =
  z.infer<
    typeof recoveryPrioritySchema
  >;