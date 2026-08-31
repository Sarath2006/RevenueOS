/**
 * ============================================================
 * RECOVERY ACTION QUEUE CONTRACT
 * ============================================================
 */

import type { OrchestrateRecoveryInput, OrchestrationOutcome } from "../modules/recovery/orchestration/orchestrator.types";

export interface RecoveryActionJobData extends OrchestrateRecoveryInput {
  source?: "AI_WORKER" | "WEBHOOK" | "MANUAL" | "SYSTEM";
  enqueuedAt: Date;
}

export type RecoveryActionJobResult = OrchestrationOutcome;

