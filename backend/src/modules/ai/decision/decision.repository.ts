/**
 * ============================================================
 * M6.9 — AI DECISION REPOSITORY
 * ============================================================
 *
 * Repository responsibility:
 *
 * Service
 *    ↓
 * Repository
 *    ↓
 * Prisma
 *
 * No business rules should live here.
 * ============================================================
 */

import { Prisma } from "../../../generated/prisma/client";

import { prisma } from "../../../config/database";

import {
  DecisionInput,
} from "./decision.types";

export class AIDecisionRepository {
  /**
   * Create an immutable AI decision snapshot.
   */
  async create(
    decisionId: string,
    input: DecisionInput
  ) {
    return prisma.aIDecision.create({
      data: {
        decisionId,

        customerId:
          input.customerId,

        merchantId:
          input.merchantId,

        recoveryCaseId:
          input.recoveryCaseId ?? null,

        currency:
          input.currency,

        probability:
          input.probability,

        probabilityPercent:
          input.probabilityPercent,

        probabilityBand:
          input.probabilityBand,

        probabilityConfidence:
          input.probabilityConfidence,

        priorityScore:
          input.priorityScore,

        priorityBand:
          input.priorityBand,

        urgencyScore:
          input.urgencyScore,

        opportunityScore:
          input.opportunityScore,

        riskScore:
          input.riskScore,

        amountScore:
          input.amountScore,

        strategy:
          input.strategy,

        channel:
          input.channel,

        timing:
          input.timing,

        strategyScore:
          input.strategyScore,

        decisionConfidence:
          input.decisionConfidence,

        decisionStatus:
          "CREATED",

        decisionReason:
          input.decisionReason,

        modelVersions:
          input.modelVersions as unknown as Prisma.InputJsonValue,

        inputFeatures:
          input.inputFeatures as unknown as Prisma.InputJsonValue,

        positiveSignals:
          input.positiveSignals as unknown as Prisma.InputJsonValue,

        negativeSignals:
          input.negativeSignals as unknown as Prisma.InputJsonValue,

        alternatives:
          input.alternatives as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Find a decision by public decision ID.
   */
  async findByDecisionId(
    decisionId: string
  ) {
    return prisma.aIDecision.findUnique({
      where: {
        decisionId,
      },
    });
  }

  /**
   * Find recent decisions for a customer.
   */
  async findByCustomer(
    customerId: string,
    limit = 20
  ) {
    return prisma.aIDecision.findMany({
      where: {
        customerId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });
  }

  /**
   * Find recent decisions for a merchant.
   */
  async findByMerchant(
    merchantId: string,
    limit = 50
  ) {
    return prisma.aIDecision.findMany({
      where: {
        merchantId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });
  }

  /**
   * Update outcome after recovery execution.
   *
   * This is intentionally separate from creation because
   * outcome happens later in the lifecycle.
   */
  async updateOutcome(
    decisionId: string,
    outcome: string,
    outcomeAmount?: number | null
  ) {
    return prisma.aIDecision.update({
      where: {
        decisionId,
      },

      data: {
        outcome,

        outcomeAmount:
          outcomeAmount ?? null,

        outcomeRecordedAt:
          new Date(),

        decisionStatus:
          outcome === "RECOVERED" ||
          outcome === "PARTIALLY_RECOVERED"
            ? "SUCCEEDED"
            : "FAILED",
      },
    });
  }
}

export const aiDecisionRepository =
  new AIDecisionRepository();