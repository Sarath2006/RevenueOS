/**
 * ============================================================
 * M8.1 — RECOVERY AGENT CONTROLLER TYPES
 * ============================================================
 *
 * Types and interfaces for autonomous recovery agent runs.
 * ============================================================
 */

import type { RecoveryAgentState } from "../state/state.types";
import type { StopReason } from "../stopping/stopping.types";
import type { OrchestrationOutcome } from "../../recovery/orchestration/orchestrator.types";

export type AgentRunStatus =
  | "RUNNING"
  | "COMPLETED"
  | "WAITING"
  | "HUMAN_REVIEW"
  | "STOPPED"
  | "FAILED";

export interface StartAgentRunInput {
  merchantId: string;
  customerId: string;
  recoveryCaseId: string;
  source?: "WEBHOOK" | "MANUAL" | "SYSTEM" | "SCHEDULER";
  initialDecisionId?: string;
  maxIterations?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentRunRecord {
  id: string;
  agentRunId: string;
  merchantId: string;
  customerId: string | null;
  recoveryCaseId: string;
  status: AgentRunStatus | string;
  currentState: RecoveryAgentState | string;
  iteration: number;
  maxIterations: number;
  currentDecisionId: string | null;
  lastActionId: string | null;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
  stopReason: StopReason | string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentIterationResult {
  iteration: number;
  state: RecoveryAgentState;
  decisionId?: string | null;
  actionId?: string | null;
  actionOutcome?: OrchestrationOutcome | null;
  stopReason?: StopReason | null;
  shouldContinue: boolean;
  message: string;
}

export interface AgentRunResult {
  agentRunId: string;
  recoveryCaseId: string;
  status: AgentRunStatus;
  finalState: RecoveryAgentState;
  totalIterations: number;
  recovered: boolean;
  recoveredAmount: number;
  stopReason?: StopReason | string | null;
  lastActionId?: string | null;
  currentDecisionId?: string | null;
  iterations: AgentIterationResult[];
  startedAt: Date;
  completedAt?: Date | null;
  message: string;
}

