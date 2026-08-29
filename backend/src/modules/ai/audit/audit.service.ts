/**
 * ============================================================
 * M6.12 — AI AUDIT TRAIL SERVICE
 * ============================================================
 *
 * Responsible for recording the lifecycle of AI decisions.
 *
 * It does NOT:
 *
 * - calculate probability
 * - calculate priority
 * - calculate strategy
 * - calculate confidence
 * - execute recovery actions
 * - modify decisions
 *
 * It ONLY records what happened.
 * ============================================================
 */

import {
  aiAuditRepository,
} from "./audit.repository";

import {
  CreateAIAuditLogInput,
} from "./audit.types";


export class AIAuditService {

  /**
   * Record one AI lifecycle event.
   */
  async record(
    input: CreateAIAuditLogInput,
  ) {

    console.log("🚨 M6.12 AUDIT SERVICE CALLED", {
    decisionId: input.decisionId,
    eventType: input.eventType,
    stage: input.stage,
  });

    if (
      !input.decisionId.trim()
    ) {
      throw new Error(
        "AI audit decisionId is required",
      );
    }


    if (
      !input.merchantId.trim()
    ) {
      throw new Error(
        "AI audit merchantId is required",
      );
    }


    if (
      !input.eventType
    ) {
      throw new Error(
        "AI audit eventType is required",
      );
    }


    if (
      !input.stage
    ) {
      throw new Error(
        "AI audit stage is required",
      );
    }


    if (
      input.confidence !==
        undefined &&
      input.confidence !==
        null &&
      (
        !Number.isFinite(
          input.confidence,
        ) ||
        input.confidence < 0 ||
        input.confidence > 1
      )
    ) {
      throw new Error(
        "AI audit confidence must be between 0 and 1",
      );
    }

    


    return aiAuditRepository.create(
      input,
    );
  }


  /**
   * Record successful pipeline start.
   */
  async recordDecisionStarted(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "AI_DECISION_STARTED",

      stage:
        "PIPELINE",

      status:
        "STARTED",

      metadata:
        input.metadata,
    });
  }


  /**
   * Record probability calculation.
   */
  async recordProbability(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      probability: number;
      probabilityBand: string;
      confidence: number;
      modelVersion?: string;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "PROBABILITY_CALCULATED",

      stage:
        "PROBABILITY",

      status:
        "SUCCESS",

      confidence:
        input.confidence,

      modelVersions:
        input.modelVersion
          ? {
              probability:
                input.modelVersion,
            }
          : undefined,

      metadata: {

        probability:
          input.probability,

        probabilityBand:
          input.probabilityBand,
      },
    });
  }


  /**
   * Record priority calculation.
   */
  async recordPriority(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      priorityScore: number;
      priorityBand: string;
      modelVersion?: string;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "PRIORITY_CALCULATED",

      stage:
        "PRIORITY",

      status:
        "SUCCESS",

      modelVersions:
        input.modelVersion
          ? {
              priority:
                input.modelVersion,
            }
          : undefined,

      metadata: {

        priorityScore:
          input.priorityScore,

        priorityBand:
          input.priorityBand,
      },
    });
  }


  /**
   * Record strategy recommendation.
   */
  async recordStrategy(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      strategy: string;
      strategyScore: number;
      confidence: number;
      modelVersion?: string;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "STRATEGY_RECOMMENDED",

      stage:
        "STRATEGY",

      status:
        "SUCCESS",

      strategy:
        input.strategy,

      confidence:
        input.confidence,

      modelVersions:
        input.modelVersion
          ? {
              strategy:
                input.modelVersion,
            }
          : undefined,

      metadata: {

        strategyScore:
          input.strategyScore,
      },
    });
  }


  /**
   * Record confidence evaluation.
   */
  async recordConfidence(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      confidence: number;
      confidenceBand: string;
      modelVersion?: string;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "CONFIDENCE_EVALUATED",

      stage:
        "CONFIDENCE",

      status:
        "SUCCESS",

      confidence:
        input.confidence,

      modelVersions:
        input.modelVersion
          ? {
              confidence:
                input.modelVersion,
            }
          : undefined,

      metadata: {

        confidenceBand:
          input.confidenceBand,
      },
    });
  }


  /**
   * Record fallback evaluation.
   */
  async recordFallback(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      strategy: string;
      confidence: number;
      fallbackRequired: boolean;
      fallbackAction: string;
      fallbackReason: string;
      selectedStrategy: string;
      decisionChanged: boolean;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "FALLBACK_EVALUATED",

      stage:
        "FALLBACK",

      status:
        "SUCCESS",

      strategy:
        input.selectedStrategy,

      confidence:
        input.confidence,

      fallbackRequired:
        input.fallbackRequired,

      fallbackAction:
        input.fallbackAction,

      fallbackReason:
        input.fallbackReason,

      metadata: {

        primaryStrategy:
          input.strategy,

        selectedStrategy:
          input.selectedStrategy,

        decisionChanged:
          input.decisionChanged,
      },
    });
  }


  /**
   * Record final successful decision.
   */
  async recordDecisionCompleted(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      strategy: string;
      confidence: number;
      metadata?: Record<string, unknown>;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "AI_DECISION_COMPLETED",

      stage:
        "DECISION",

      status:
        "SUCCESS",

      strategy:
        input.strategy,

      confidence:
        input.confidence,

      metadata:
        input.metadata,
    });
  }


  /**
   * Record failed AI decision.
   */
  async recordDecisionFailed(
    input: {
      decisionId: string;
      merchantId: string;
      customerId?: string | null;
      recoveryCaseId?: string | null;
      error: string;
    },
  ) {

    return this.record({

      decisionId:
        input.decisionId,

      merchantId:
        input.merchantId,

      customerId:
        input.customerId,

      recoveryCaseId:
        input.recoveryCaseId,

      eventType:
        "AI_DECISION_FAILED",

      stage:
        "DECISION",

      status:
        "FAILED",

      metadata: {

        error:
          input.error,
      },
    });
  }


  /**
   * Retrieve decision audit history.
   */
  async getDecisionAudit(
    decisionId: string,
  ) {

    return aiAuditRepository
      .findByDecisionId(
        decisionId,
      );
  }


  /**
   * Retrieve merchant audit history.
   */
  async getMerchantAudit(
    merchantId: string,
    limit = 100,
  ) {

    const safeLimit =
      Math.min(
        Math.max(
          limit,
          1,
        ),
        500,
      );

    return aiAuditRepository
      .findByMerchant(
        merchantId,
        safeLimit,
      );
  }


  /**
   * Retrieve recovery-case audit history.
   */
  async getRecoveryCaseAudit(
    recoveryCaseId: string,
    limit = 100,
  ) {

    const safeLimit =
      Math.min(
        Math.max(
          limit,
          1,
        ),
        500,
      );

    return aiAuditRepository
      .findByRecoveryCase(
        recoveryCaseId,
        safeLimit,
      );
  }
}


export const aiAuditService =
  new AIAuditService();