/**
 * ============================================================
 * M8.4 — HUMAN ESCALATION GUARD SERVICE
 * ============================================================
 *
 * Freezes autonomous actions and escalates recovery cases
 * to human supervisors when safety, confidence, or failure limits
 * are violated.
 * ============================================================
 */

import { logger } from "../../../config/logger";
import { prisma } from "../../../config/database";
import { agentRunRepository } from "../controller/agent-run.repository";

export class EscalationService {
  /**
   * Escalate an active recovery case to human review.
   */
  public async escalate(
    agentRunId: string,
    recoveryCaseId: string,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    logger.warn(
      {
        agentRunId,
        recoveryCaseId,
        reason,
      },
      "Escalating recovery case to human supervisor review",
    );

    // 1. Update RecoveryCase status to ESCALATED
    await prisma.recoveryCase.update({
      where: { id: recoveryCaseId },
      data: {
        status: "ESCALATED",
        lastActionAt: new Date(),
      },
    });

    // 2. Update RecoveryAgentRun to HUMAN_REVIEW
    await agentRunRepository.update(agentRunId, {
      status: "HUMAN_REVIEW",
      currentState: "HUMAN_REVIEW",
      stopReason: "HUMAN_REVIEW_REQUIRED",
      completedAt: new Date(),
      metadata: {
        ...metadata,
        escalatedAt: new Date(),
        escalationReason: reason,
      },
    });
  }
}

export const escalationService = new EscalationService();

