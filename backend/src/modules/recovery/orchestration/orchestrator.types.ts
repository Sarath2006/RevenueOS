/**
 * ============================================================
 * M7.1 — RECOVERY ORCHESTRATOR TYPES
 * ============================================================
 *
 * Types and interfaces for central recovery orchestration.
 * ============================================================
 */

import type { DecisionType, Channel } from "../../../generated/prisma/client";
import type { AIDecisionRecord } from "../../ai/decision/decision.types";
import type { ActionPolicyResult } from "./action-policy.types";
import type { ActionResult } from "./action-executor.types";

export interface OrchestrateRecoveryInput {
  decisionId?: string;
  decision?: AIDecisionRecord;
  recoveryCaseId: string;
  merchantId: string;
  customerId: string;
  forceExecute?: boolean;
  metadata?: Record<string, unknown>;
}

export type OrchestrationStatus =
  | "EXECUTED"
  | "SKIPPED"
  | "BLOCKED"
  | "REQUIRES_HUMAN_REVIEW"
  | "DELAYED"
  | "FAILED";

export interface OrchestrationOutcome {
  success: boolean;
  actionId?: string | null;
  decisionId: string;
  recoveryCaseId: string;
  merchantId: string;
  customerId: string;
  status: OrchestrationStatus;
  actionType?: DecisionType | string | null;
  channel?: Channel | string | null;
  attemptNumber: number;
  idempotencyKey: string;
  policyResult: ActionPolicyResult;
  actionResult?: ActionResult | null;
  recoveryCaseUpdated: boolean;
  caseStatusAfterOrchestration?: string;
  message: string;
  orchestratedAt: Date;
}

