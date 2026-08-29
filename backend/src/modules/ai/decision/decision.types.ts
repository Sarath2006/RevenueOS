/**
 * ============================================================
 * M6.9 — AI DECISION RECORD TYPES
 * ============================================================
 *
 * This module represents the immutable decision snapshot
 * produced by the RevenueOS AI decision pipeline.
 *
 * Flow:
 *
 * Features
 *    ↓
 * Probability
 *    ↓
 * Priority
 *    ↓
 * Strategy
 *    ↓
 * Decision Record
 *
 * IMPORTANT:
 * A decision record must contain enough information to
 * understand what the system decided without recalculating
 * historical data.
 * ============================================================
 */

export type AIDecisionStatus =
  | "CREATED"
  | "EXECUTED"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type AIOutcome =
  | "RECOVERED"
  | "PARTIALLY_RECOVERED"
  | "NOT_RECOVERED"
  | "PENDING";

import type { RecoveryProbabilityFeatures } from "../probability/probability.types";

export interface DecisionAlternative {
  strategy: string;
  score: number;
  reason: string;
}

export interface DecisionInput {
  customerId: string;
  merchantId: string;
  recoveryCaseId?: string | null;
  currency: string;

  probability: number;
  probabilityPercent: number;
  probabilityBand: string;
  probabilityConfidence: number;

  priorityScore: number;
  priorityBand: string;

  urgencyScore: number;
  opportunityScore: number;
  riskScore: number;
  amountScore: number;

  strategy: string;
  channel: string;
  timing: string;
  strategyScore: number;

  decisionConfidence: number;

  decisionReason: string;

  modelVersions: Record<string, string>;

  inputFeatures: Record<string, unknown> | RecoveryProbabilityFeatures;

  positiveSignals: string[];

  negativeSignals: string[];

  alternatives: DecisionAlternative[];
}

export interface AIDecisionRecord {
  id: string;
  decisionId: string;

  customerId: string;
  merchantId: string;
  recoveryCaseId: string | null;

  currency: string;

  probability: number;
  probabilityPercent: number;
  probabilityBand: string;
  probabilityConfidence: number;

  priorityScore: number;
  priorityBand: string;

  urgencyScore: number;
  opportunityScore: number;
  riskScore: number;
  amountScore: number;

  strategy: string;
  channel: string;
  timing: string;
  strategyScore: number;

  decisionConfidence: number;

  decisionStatus: AIDecisionStatus;

  decisionReason: string;

  modelVersions: Record<string, string>;

  inputFeatures: Record<string, unknown> | RecoveryProbabilityFeatures;

  positiveSignals: string[];

  negativeSignals: string[];

  alternatives: DecisionAlternative[];

  outcome: AIOutcome | null;
  outcomeAmount: number | null;
  outcomeRecordedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}