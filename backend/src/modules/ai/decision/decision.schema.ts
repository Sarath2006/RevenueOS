import { z } from "zod";

/**
 * ============================================================
 * M6.9 — AI DECISION RECORD VALIDATION
 * ============================================================
 */

const decisionAlternativeSchema = z.object({
  strategy: z.string().min(1),
  score: z.number().min(0).max(100),
  reason: z.string().min(1),
});

export const createAIDecisionSchema = z.object({
  customer_id: z
    .string()
    .trim()
    .min(1)
    .max(128),

  merchant_id: z
    .string()
    .trim()
    .min(1)
    .max(128),

  recovery_case_id: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .nullable()
    .optional(),

  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),

  probability: z
    .number()
    .min(0)
    .max(1),

  probabilityPercent: z
    .number()
    .min(0)
    .max(100),

  probabilityBand: z
    .string()
    .min(1),

  probabilityConfidence: z
    .number()
    .min(0)
    .max(1),

  priorityScore: z
    .number()
    .min(0)
    .max(100),

  priorityBand: z
    .string()
    .min(1),

  urgencyScore: z
    .number()
    .min(0)
    .max(100),

  opportunityScore: z
    .number()
    .min(0)
    .max(100),

  riskScore: z
    .number()
    .min(0)
    .max(100),

  amountScore: z
    .number()
    .min(0)
    .max(100),

  strategy: z
    .string()
    .min(1),

  channel: z
    .string()
    .min(1),

  timing: z
    .string()
    .min(1),

  strategyScore: z
    .number()
    .min(0)
    .max(100),

  decisionConfidence: z
    .number()
    .min(0)
    .max(1),

  decisionReason: z
    .string()
    .trim()
    .min(1)
    .max(2000),

  modelVersions: z
    .record(z.string(), z.string().min(1)),

  inputFeatures: z
    .record(z.string(), z.unknown()),

  positiveSignals: z
    .array(z.string())
    .max(100),

  negativeSignals: z
    .array(z.string())
    .max(100),

  alternatives: z
    .array(decisionAlternativeSchema)
    .max(20),
});

export const decisionIdSchema = z.object({
  decision_id: z
    .string()
    .min(1),
});

export const updateDecisionOutcomeSchema = z.object({
  outcome: z.enum([
    "RECOVERED",
    "PARTIALLY_RECOVERED",
    "NOT_RECOVERED",
    "PENDING",
  ]),

  outcome_amount: z
    .number()
    .nonnegative()
    .nullable()
    .optional(),
});

export type CreateAIDecisionRequest =
  z.infer<typeof createAIDecisionSchema>;

export type UpdateDecisionOutcomeRequest =
  z.infer<typeof updateDecisionOutcomeSchema>;