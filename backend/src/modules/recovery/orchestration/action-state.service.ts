/**
 * ============================================================
 * M7.4 — RECOVERY ACTION STATE SERVICE
 * ============================================================
 *
 * Manages the lifecycle state machine of RecoveryAction records.
 *
 * State Machine:
 * PENDING / REQUESTED
 *   ↓
 * RUNNING / EXECUTING
 *   ↓
 * ┌───────────────┬───────────────┬───────────────┐
 * │               │               │               │
 * ▼               ▼               ▼               ▼
 * COMPLETED     FAILED         BLOCKED         SKIPPED
 * ============================================================
 */

import { actionRepository } from "./action.repository";
import type { ActionStatus } from "../../../generated/prisma/client";

export class ActionStateService {
  /**
   * Mark an action as RUNNING.
   */
  public async markRunning(actionId: string) {
    return actionRepository.update(actionId, {
      status: "RUNNING",
      startedAt: new Date(),
    });
  }

  /**
   * Mark an action as COMPLETED / SENT / DELIVERED.
   */
  public async markCompleted(
    actionId: string,
    data: {
      providerMessageId?: string | null;
      message?: string | null;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    return actionRepository.update(actionId, {
      status: "COMPLETED",
      completedAt: new Date(),
      providerMessageId: data.providerMessageId,
      message: data.message,
      metadata: data.metadata,
    });
  }

  /**
   * Mark an action as FAILED.
   */
  public async markFailed(
    actionId: string,
    error: {
      message: string;
      code?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    return actionRepository.update(actionId, {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: error.message,
      errorCode: error.code ?? "EXECUTION_ERROR",
      metadata: error.metadata,
    });
  }

  /**
   * Mark an action as BLOCKED.
   */
  public async markBlocked(
    actionId: string,
    reason: string,
    blockingRule?: string,
  ) {
    return actionRepository.update(actionId, {
      status: "SKIPPED",
      completedAt: new Date(),
      errorMessage: reason,
      errorCode: blockingRule ?? "POLICY_BLOCKED",
    });
  }

  /**
   * Mark an action as SKIPPED.
   */
  public async markSkipped(
    actionId: string,
    reason: string,
  ) {
    return actionRepository.update(actionId, {
      status: "SKIPPED",
      completedAt: new Date(),
      message: reason,
    });
  }

  /**
   * Mark an action as CANCELLED.
   */
  public async markCancelled(
    actionId: string,
    reason?: string,
  ) {
    return actionRepository.update(actionId, {
      status: "CANCELLED",
      completedAt: new Date(),
      message: reason ?? "Action cancelled",
    });
  }
}

export const actionStateService = new ActionStateService();

