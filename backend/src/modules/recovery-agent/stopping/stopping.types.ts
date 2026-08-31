/**
 * ============================================================
 * M8.4 — STOPPING RULES & ESCALATION TYPES
 * ============================================================
 *
 * Defines centralized limits, stop reasons, and evaluation contracts.
 * ============================================================
 */

import type { RecoveryAgentState } from "../state/state.types";

export type StopReason =
  | "MAX_AGENT_ITERATIONS"
  | "MAX_PAYMENT_RETRIES"
  | "CASE_RECOVERED"
  | "CASE_STOPPED"
  | "CASE_CANCELLED"
  | "CASE_EXPIRED"
  | "SAFETY_BLOCK"
  | "LOW_CONFIDENCE"
  | "HUMAN_REVIEW_REQUIRED"
  | "NO_PROGRESS"
  | "COOLDOWN_ACTIVE"
  | "DECISION_EXPIRED"
  | "TIME_LIMIT_EXCEEDED"
  | "DUPLICATE_EVENT"
  | "POLICY_STOP"
  | "WAITING_FOR_OUTCOME"
  | "UNRECOVERABLE_ERROR";

export interface StoppingPolicyLimits {
  maxAgentIterations: number;
  maxPaymentRetries: number;
  maxConsecutiveFailures: number; // for NO_PROGRESS detection
  minConfidenceThreshold: number;
  maxCaseAgeHours: number;
  decisionTtlMs: number;
}

export interface StoppingEvaluationContext {
  agentRunId: string;
  recoveryCaseId: string;
  iteration: number;
  maxIterations: number;
  currentState: RecoveryAgentState;
  caseStatus: string;
  caseOpenedAt: Date;
  amountAtRisk: number;
  recoveredAmount: number;
  decision?: {
    decisionId: string;
    confidence: number;
    safetyDecision?: string | null;
    safetyAllowed?: boolean | null;
    createdAt: Date;
  } | null;
  actions: {
    type: string;
    status: string;
    attemptNumber: number;
    completedAt: Date | null;
  }[];
  failureStreak: number;
}

export interface StoppingEvaluationResult {
  shouldStop: boolean;
  stopReason?: StopReason;
  requiresHumanReview: boolean;
  reason: string;
  evaluatedAt: Date;
}
