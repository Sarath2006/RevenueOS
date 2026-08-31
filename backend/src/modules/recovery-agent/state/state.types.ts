/**
 * ============================================================
 * M8.2 — RECOVERY AGENT STATE & OUTCOME TYPES
 * ============================================================
 *
 * Defines the state machine and outcome evaluation contracts.
 * ============================================================
 */

export type RecoveryAgentState =
  | "STARTING"
  | "EVALUATING"
  | "ACTION_READY"
  | "EXECUTING"
  | "OBSERVING"
  | "WAITING"
  | "RECOVERED"
  | "NO_PROGRESS"
  | "HUMAN_REVIEW"
  | "STOPPED"
  | "FAILED";

export interface StateTransitionEvent {
  fromState: RecoveryAgentState;
  toState: RecoveryAgentState;
  agentRunId: string;
  recoveryCaseId: string;
  iteration: number;
  reason: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface OutcomeEvaluationInput {
  agentRunId: string;
  recoveryCaseId: string;
  iteration: number;
  actionOutcome?: {
    success: boolean;
    status: string;
    actionType?: string | null;
    actionResult?: {
      success: boolean;
      recoveredAmount?: number | null;
      paymentStatus?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
    } | null;
  } | null;
  webhookEvent?: {
    eventType: string;
    paymentStatus?: string;
    amount?: number;
  } | null;
  caseStatus: string;
  amountAtRisk: number;
  recoveredAmount: number;
}

export interface OutcomeEvaluationResult {
  nextState: RecoveryAgentState;
  isTerminal: boolean;
  isRecovered: boolean;
  recoveredAmount: number;
  requiresWait: boolean;
  reason: string;
  observedAt: Date;
}

