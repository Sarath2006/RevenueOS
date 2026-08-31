/**
 * ============================================================
 * M8.2 — RECOVERY AGENT STATE MACHINE SERVICE
 * ============================================================
 *
 * Enforces valid state machine transitions for autonomous agent runs.
 * Prevents illegal state jumps (e.g. RECOVERED -> EXECUTING).
 * ============================================================
 */

import { logger } from "../../../config/logger";
import { agentRunRepository } from "../controller/agent-run.repository";
import type { RecoveryAgentState, StateTransitionEvent } from "./state.types";

const ALLOWED_TRANSITIONS: Record<RecoveryAgentState, RecoveryAgentState[]> = {
  STARTING: ["EVALUATING", "STOPPED", "FAILED"],
  EVALUATING: [
    "ACTION_READY",
    "WAITING",
    "RECOVERED",
    "NO_PROGRESS",
    "HUMAN_REVIEW",
    "STOPPED",
    "FAILED",
  ],
  ACTION_READY: ["EXECUTING", "WAITING", "HUMAN_REVIEW", "STOPPED", "FAILED"],
  EXECUTING: ["OBSERVING", "FAILED"],
  OBSERVING: [
    "RECOVERED",
    "WAITING",
    "EVALUATING",
    "NO_PROGRESS",
    "HUMAN_REVIEW",
    "STOPPED",
    "FAILED",
  ],
  WAITING: ["EVALUATING", "OBSERVING", "RECOVERED", "STOPPED", "FAILED"],
  RECOVERED: [], // Terminal
  NO_PROGRESS: ["HUMAN_REVIEW", "STOPPED"], // Terminal
  HUMAN_REVIEW: ["EVALUATING", "STOPPED"], // Terminal until reviewed
  STOPPED: [], // Terminal
  FAILED: [], // Terminal
};

export class RecoveryAgentStateService {
  /**
   * Check if a transition between two states is valid.
   */
  public isValidTransition(fromState: RecoveryAgentState, toState: RecoveryAgentState): boolean {
    if (fromState === toState) return true;
    const allowed = ALLOWED_TRANSITIONS[fromState] || [];
    return allowed.includes(toState);
  }

  /**
   * Transition an agent run to a new state with strict validation.
   */
  public async transition(
    agentRunId: string,
    fromState: RecoveryAgentState,
    toState: RecoveryAgentState,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<StateTransitionEvent> {
    if (!this.isValidTransition(fromState, toState)) {
      const errorMsg = `Illegal agent state transition attempted from '${fromState}' to '${toState}'.`;
      logger.error({ agentRunId, fromState, toState }, errorMsg);
      throw new Error(errorMsg);
    }

    const timestamp = new Date();

    logger.info(
      {
        agentRunId,
        fromState,
        toState,
        reason,
      },
      "Recovery agent state transitioned",
    );

    // Update database record
    await agentRunRepository.update(agentRunId, {
      currentState: toState,
      status: this.mapStateToStatus(toState),
      completedAt: this.isTerminal(toState) ? timestamp : undefined,
      stopReason: this.isTerminal(toState) ? reason : undefined,
      metadata: {
        ...metadata,
        lastTransition: {
          fromState,
          toState,
          reason,
          timestamp,
        },
      },
    });

    return {
      fromState,
      toState,
      agentRunId,
      recoveryCaseId: (metadata?.recoveryCaseId as string) || "",
      iteration: (metadata?.iteration as number) || 1,
      reason,
      metadata,
      timestamp,
    };
  }

  public isTerminal(state: RecoveryAgentState): boolean {
    return [
      "RECOVERED",
      "NO_PROGRESS",
      "HUMAN_REVIEW",
      "STOPPED",
      "FAILED",
    ].includes(state);
  }

  private mapStateToStatus(state: RecoveryAgentState): string {
    switch (state) {
      case "RECOVERED":
        return "COMPLETED";
      case "WAITING":
        return "WAITING";
      case "HUMAN_REVIEW":
        return "HUMAN_REVIEW";
      case "STOPPED":
        return "STOPPED";
      case "FAILED":
      case "NO_PROGRESS":
        return "FAILED";
      default:
        return "RUNNING";
    }
  }
}

export const recoveryAgentStateService = new RecoveryAgentStateService();

