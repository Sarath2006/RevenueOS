/**
 * ============================================================
 * M7.4 — RECOVERY ACTION REPOSITORY
 * ============================================================
 *
 * Persistence layer for RecoveryAction and RecoveryCase updates.
 * ============================================================
 */

import { prisma } from "../../../config/database";
import type {
  DecisionType,
  Channel,
  ActionStatus,
  RecoveryCaseStatus,
  Prisma,
} from "../../../generated/prisma/client";

export interface CreateActionRecordInput {
  merchantId: string;
  recoveryCaseId: string;
  type: DecisionType;
  channel?: Channel | null;
  status?: ActionStatus;
  attemptNumber?: number;
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  message?: string | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateActionRecordInput {
  status?: ActionStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

export class ActionRepository {
  /**
   * Create a new RecoveryAction record.
   */
  public async create(input: CreateActionRecordInput) {
    return prisma.recoveryAction.create({
      data: {
        merchantId: input.merchantId,
        recoveryCaseId: input.recoveryCaseId,
        type: input.type,
        channel: input.channel ?? null,
        status: input.status ?? "PENDING",
        attemptNumber: input.attemptNumber ?? 1,
        scheduledAt: input.scheduledAt ?? null,
        startedAt: input.startedAt ?? null,
        completedAt: input.completedAt ?? null,
        message: input.message ?? null,
        providerMessageId: input.providerMessageId ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Update an existing RecoveryAction record.
   */
  public async update(id: string, input: UpdateActionRecordInput) {
    return prisma.recoveryAction.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        ...(input.providerMessageId !== undefined ? { providerMessageId: input.providerMessageId } : {}),
        ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
        ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
        ...(input.message !== undefined ? { message: input.message } : {}),
        ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  /**
   * Find an action by primary ID.
   */
  public async findById(id: string) {
    return prisma.recoveryAction.findUnique({
      where: { id },
    });
  }

  /**
   * Find all actions for a specific recovery case.
   */
  public async findByRecoveryCaseId(recoveryCaseId: string) {
    return prisma.recoveryAction.findMany({
      where: { recoveryCaseId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Get RecoveryCase with merchant & customer relations.
   */
  public async getRecoveryCase(recoveryCaseId: string) {
    return prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        merchant: true,
        customer: true,
        payment: true,
        subscription: true,
        actions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  /**
   * Update RecoveryCase status and amount metrics.
   */
  public async updateRecoveryCase(
    recoveryCaseId: string,
    data: {
      status?: RecoveryCaseStatus;
      recoveredAmount?: number;
      lastActionAt?: Date;
      recoveredAt?: Date;
      stoppedAt?: Date;
    },
  ) {
    return prisma.recoveryCase.update({
      where: { id: recoveryCaseId },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.recoveredAmount !== undefined ? { recoveredAmount: data.recoveredAmount } : {}),
        ...(data.lastActionAt ? { lastActionAt: data.lastActionAt } : {}),
        ...(data.recoveredAt ? { recoveredAt: data.recoveredAt } : {}),
        ...(data.stoppedAt ? { stoppedAt: data.stoppedAt } : {}),
      },
    });
  }
}

export const actionRepository = new ActionRepository();

