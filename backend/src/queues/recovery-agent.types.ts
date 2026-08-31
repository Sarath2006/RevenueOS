/**
 * ============================================================
 * RECOVERY AGENT QUEUE CONTRACTS
 * ============================================================
 */

import type { StartAgentRunInput, AgentRunResult } from "../modules/recovery-agent/controller/agent.types";

export type RecoveryAgentJobType =
  | "START_AGENT"
  | "EVALUATE_AGENT"
  | "PROCESS_OUTCOME"
  | "CONTINUE_AGENT"
  | "STOP_AGENT";

export interface RecoveryAgentJobData extends StartAgentRunInput {
  jobType?: RecoveryAgentJobType;
  enqueuedAt: Date;
}

export type RecoveryAgentJobResult = AgentRunResult;

