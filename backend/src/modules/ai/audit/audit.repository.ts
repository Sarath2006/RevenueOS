/**
 * ============================================================
 * M6.12 — AI AUDIT REPOSITORY
 * ============================================================
 *
 * Service
 *    ↓
 * Repository
 *    ↓
 * Prisma
 *
 * Repository contains no business decisions.
 *
 * Audit records are append-only.
 * ============================================================
 */

import { Prisma } from "../../../generated/prisma/client";

import {
  prisma,
} from "../../../config/database";

import {
  CreateAIAuditLogInput,
} from "./audit.types";


export class AIAuditRepository {

  /**
   * Create an audit event.
   *
   * IMPORTANT:
   *
   * There is intentionally no update method.
   *
   * Audit records are append-only.
   */
  async create(
    
    input: CreateAIAuditLogInput,
  ) {


    console.log("🔥 M6.12 AUDIT CREATE CALLED", {
  decisionId: input.decisionId,
  merchantId: input.merchantId,
  customerId: input.customerId,
  recoveryCaseId: input.recoveryCaseId,
  eventType: input.eventType,
  stage: input.stage,
});

    return prisma.aIAuditLog.create({

      data: {

        decisionId:
          input.decisionId,

        merchantId:
          input.merchantId,

        customerId:
          input.customerId ?? null,

        recoveryCaseId:
          input.recoveryCaseId ?? null,

        eventType:
          input.eventType,

        stage:
          input.stage,

        status:
          input.status ?? null,

        strategy:
          input.strategy ?? null,

        confidence:
          input.confidence ?? null,

        fallbackRequired:
          input.fallbackRequired ?? null,

        fallbackAction:
          input.fallbackAction ?? null,

        fallbackReason:
          input.fallbackReason ?? null,

        modelVersions:
          input.modelVersions
            ? input.modelVersions as unknown as Prisma.InputJsonValue
            : undefined,

        metadata:
          input.metadata
            ? input.metadata as unknown as Prisma.InputJsonValue
            : undefined,
      },

    });
  }


  /**
   * Get the complete audit history
   * for a decision.
   */
  async findByDecisionId(
    decisionId: string,
  ) {

    return prisma.aIAuditLog.findMany({

      where: {
        decisionId,
      },

      orderBy: {
        createdAt: "asc",
      },

    });
  }


  /**
   * Get recent audit events
   * for a merchant.
   */
  async findByMerchant(
    merchantId: string,
    limit = 100,
  ) {

    return prisma.aIAuditLog.findMany({

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
   * Get audit history for a recovery case.
   */
  async findByRecoveryCase(
    recoveryCaseId: string,
    limit = 100,
  ) {

    return prisma.aIAuditLog.findMany({

      where: {
        recoveryCaseId,
      },

      orderBy: {
        createdAt: "asc",
      },

      take: limit,
    });
  }
}


export const aiAuditRepository =
  new AIAuditRepository();