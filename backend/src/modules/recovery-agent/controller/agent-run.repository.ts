/**
 * ============================================================
 * M8.1 — RECOVERY AGENT RUN REPOSITORY
 * ============================================================
 *
 * Database persistence layer for RecoveryAgentRun records.
 * ============================================================
 */

import { prisma } from "../../../config/database";
import type { Prisma } from "../../../generated/prisma/client";

export interface CreateAgentRunInput {
  agentRunId: string;
  merchantId: string;
  customerId?: string | null;
  recoveryCaseId: string;
  status?: string;
  currentState?: string;
  iteration?: number;
  maxIterations?: number;
  currentDecisionId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateAgentRunInput {
  status?: string;
  currentState?: string;
  iteration?: number;
  currentDecisionId?: string | null;
  lastActionId?: string | null;
  completedAt?: Date | null;
  stopReason?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
}

export class AgentRunRepository {
  /**
   * Create a new RecoveryAgentRun record.
   */
  public async create(input: CreateAgentRunInput) {
    return prisma.recoveryAgentRun.create({
      data: {
        agentRunId: input.agentRunId,
        merchantId: input.merchantId,
        customerId: input.customerId ?? null,
        recoveryCaseId: input.recoveryCaseId,
        status: input.status ?? "RUNNING",
        currentState: input.currentState ?? "STARTING",
        iteration: input.iteration ?? 1,
        maxIterations: input.maxIterations ?? 5,
        currentDecisionId: input.currentDecisionId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Update an existing agent run by its unique agentRunId.
   */
  public async update(agentRunId: string, input: UpdateAgentRunInput) {
    return prisma.recoveryAgentRun.update({
      where: { agentRunId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.currentState ? { currentState: input.currentState } : {}),
        ...(input.iteration !== undefined ? { iteration: input.iteration } : {}),
        ...(input.currentDecisionId !== undefined ? { currentDecisionId: input.currentDecisionId } : {}),
        ...(input.lastActionId !== undefined ? { lastActionId: input.lastActionId } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        ...(input.stopReason !== undefined ? { stopReason: input.stopReason } : {}),
        ...(input.failureReason !== undefined ? { failureReason: input.failureReason } : {}),
        lastActivityAt: new Date(),
        ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  /**
   * Find agent run by unique agentRunId.
   */
  public async findByAgentRunId(agentRunId: string) {
    return prisma.recoveryAgentRun.findUnique({
      where: { agentRunId },
    });
  }

  /**
   * Find an active running agent for a given recovery case.
   */
  public async findActiveByRecoveryCaseId(recoveryCaseId: string) {
    return prisma.recoveryAgentRun.findFirst({
      where: {
        recoveryCaseId,
        status: { in: ["RUNNING", "WAITING"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find all runs for a given recovery case.
   */
  public async findByRecoveryCaseId(recoveryCaseId: string) {
    return prisma.recoveryAgentRun.findMany({
      where: { recoveryCaseId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const agentRunRepository = new AgentRunRepository();

