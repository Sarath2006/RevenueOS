/**
 * ============================================================
 * M8.3 — NEXT-ACTION DECISION ENGINE TYPES
 * ============================================================
 *
 * Types for deciding whether the autonomous agent should
 * proceed with another action, switch strategy, wait, or stop.
 * ============================================================
 */

import type { AIDecisionRecord } from "../../ai/decision/decision.types";

export type NextActionChoice =
  | "CONTINUE"
  | "CHANGE_STRATEGY"
  | "WAIT"
  | "STOP"
  | "HUMAN_REVIEW";

export interface NextActionContext {
  agentRunId: string;
  recoveryCaseId: string;
  iteration: number;
  currentDecision: AIDecisionRecord;
  previousActions: {
    type: string;
    status: string;
    attemptNumber: number;
    completedAt: Date | null;
  }[];
  caseStatus: string;
  amountAtRisk: number;
  recoveredAmount: number;
  failureStreak: number;
  lastActionOutcome?: {
    success: boolean;
    status: string;
    actionType?: string | null;
    errorMessage?: string | null;
  } | null;
}

export interface NextActionEvaluationResult {
  choice: NextActionChoice;
  strategyToExecute?: string;
  channelToExecute?: string | null;
  reason: string;
  delayMs?: number;
  evaluatedAt: Date;
}

