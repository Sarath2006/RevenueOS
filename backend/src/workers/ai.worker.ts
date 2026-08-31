/**
 * ============================================================
 * RevenueOS — AI Decision Worker
 * ============================================================
 *
 * M6.10 + M6.11 + M6.12
 *
 * Pipeline:
 *
 * BullMQ
 *   ↓
 * Feature Normalization
 *   ↓
 * Probability
 *   ↓
 * Priority
 *   ↓
 * Strategy
 *   ↓
 * Confidence + Fallback
 *   ↓
 * M6.9 AI Decision Snapshot
 *   ↓
 * M6.12 AI Audit Trail
 *   ↓
 * Result
 *
 * This worker is responsible for asynchronous AI analysis.
 *
 * It does NOT:
 * - call Razorpay
 * - charge customers
 * - send notifications
 * - create recovery cases
 * ============================================================
 */

import {
  Worker,
  Job,
} from "bullmq";

import {
  createQueueConnection,
} from "../queues/connection";

import {
  AI_QUEUE_NAME,
} from "../queues/ai.queue";

import {
  AIDecisionJobData,
} from "../queues/ai.types";

import {
  logger,
} from "../config/logger";

import {
  recoveryProbabilityService,
} from "../modules/ai/probability/probability.service";

import {
  recoveryPriorityService,
} from "../modules/ai/priority/priority.service";

import {
  recoveryStrategyService,
} from "../modules/ai/strategy/strategy.service";

import {
  confidenceFallbackService,
} from "../modules/ai/confidence/confidence.service";

/**
 * M6.13 — AI Safety / Policy Boundary.
 */
import {
  aiSafetyService,
} from "../modules/ai/safety/safety.service";

/**
 * M6.9 — AI Decision persistence.
 */
import {
  aiDecisionService,
} from "../modules/ai/decision/decision.service";

/**
 * M6.12 — AI Audit Trail.
 */
import {
  aiAuditService,
} from "../modules/ai/audit/audit.service";

import type {
  RecoveryProbabilityFeatures,
} from "../modules/ai/probability/probability.types";


/**
 * ============================================================
 * FEATURE NORMALIZATION
 * ============================================================
 *
 * The AI queue contract stores features directly under:
 *
 * job.data.features
 *
 * This function creates a defensive normalized feature object
 * so every downstream AI engine receives valid numeric values.
 * ============================================================
 */

function normalizeFeatures(
  features: AIDecisionJobData["features"],
): RecoveryProbabilityFeatures {

  if (!features) {
    throw new Error(
      "AI decision job is missing required features",
    );
  }

  const normalized: RecoveryProbabilityFeatures = {

    transactionCount:
      Number(
        features.transactionCount ?? 0,
      ),

    successfulTransactionCount:
      Number(
        features.successfulTransactionCount ?? 0,
      ),

    failedTransactionCount:
      Number(
        features.failedTransactionCount ?? 0,
      ),

    pendingTransactionCount:
      Number(
        features.pendingTransactionCount ?? 0,
      ),

    successfulTransactionRate:
      Number(
        features.successfulTransactionRate ?? 0,
      ),

    failureRate:
      Number(
        features.failureRate ?? 0,
      ),

    pendingRate:
      Number(
        features.pendingRate ?? 0,
      ),

    totalTransactionValue:
      Number(
        features.totalTransactionValue ?? 0,
      ),

    successfulTransactionValue:
      Number(
        features.successfulTransactionValue ?? 0,
      ),

    failedTransactionValue:
      Number(
        features.failedTransactionValue ?? 0,
      ),

    averageTransactionValue:
      Number(
        features.averageTransactionValue ?? 0,
      ),

    averageSuccessfulTransactionValue:
      Number(
        features.averageSuccessfulTransactionValue ?? 0,
      ),

    averageFailedTransactionValue:
      Number(
        features.averageFailedTransactionValue ?? 0,
      ),

    paymentMethodDiversity:
      Number(
        features.paymentMethodDiversity ?? 0,
      ),

    preferredPaymentMethodSuccessRate:
      Number(
        features.preferredPaymentMethodSuccessRate ?? 0,
      ),

    recoveryCaseCount:
      Number(
        features.recoveryCaseCount ?? 0,
      ),

    activeRecoveryCaseCount:
      Number(
        features.activeRecoveryCaseCount ?? 0,
      ),

    recoveredCaseCount:
      Number(
        features.recoveredCaseCount ?? 0,
      ),

    totalAmountAtRisk:
      Number(
        features.totalAmountAtRisk ?? 0,
      ),

    totalRecoveredAmount:
      Number(
        features.totalRecoveredAmount ?? 0,
      ),

    outstandingRecoveryAmount:
      Number(
        features.outstandingRecoveryAmount ?? 0,
      ),

    historicalRecoveryRate:
      Number(
        features.historicalRecoveryRate ?? 0,
      ),

    averageRecoveryAmount:
      Number(
        features.averageRecoveryAmount ?? 0,
      ),

    averageRecoveryRatio:
      Number(
        features.averageRecoveryRatio ?? 0,
      ),

    failureStreak:
      Number(
        features.failureStreak ?? 0,
      ),

    successStreak:
      Number(
        features.successStreak ?? 0,
      ),

    recentFailureCount7d:
      Number(
        features.recentFailureCount7d ?? 0,
      ),

    recentSuccessCount7d:
      Number(
        features.recentSuccessCount7d ?? 0,
      ),

    recentFailureCount30d:
      Number(
        features.recentFailureCount30d ?? 0,
      ),

    recentSuccessCount30d:
      Number(
        features.recentSuccessCount30d ?? 0,
      ),

    daysSinceLastTransaction:
      Number(
        features.daysSinceLastTransaction ?? 0,
      ),

    daysSinceLastSuccess:
      Number(
        features.daysSinceLastSuccess ?? 0,
      ),

    daysSinceLastFailure:
      Number(
        features.daysSinceLastFailure ?? 0,
      ),

    daysSinceLastRecovery:
      features.daysSinceLastRecovery !== undefined &&
      features.daysSinceLastRecovery !== null
        ? Number(
            features.daysSinceLastRecovery,
          )
        : null,

    currentFailedAmount:
      Number(
        features.currentFailedAmount ?? 0,
      ),

    currentFailedAmountRatio:
      Number(
        features.currentFailedAmountRatio ?? 0,
      ),

    activeRiskRatio:
      Number(
        features.activeRiskRatio ?? 0,
      ),

    failureFrequency30d:
      Number(
        features.failureFrequency30d ?? 0,
      ),

    recoveryEfficiency:
      Number(
        features.recoveryEfficiency ?? 0,
      ),
  };

  return normalized;
}


/**
 * ============================================================
 * M6.11 — FEATURE QUALITY
 * ============================================================
 */

function calculateAIWorkerFeatureQuality(
  features: RecoveryProbabilityFeatures,
): number {

  const values =
    Object.values(features);

  if (values.length === 0) {
    return 0;
  }

  const valid =
    values.filter(
      (value) => {

        if (
          value === null ||
          value === undefined
        ) {
          return true;
        }

        return (
          typeof value === "number" &&
          Number.isFinite(value)
        );
      },
    ).length;

  return Math.min(
    Math.max(
      valid / values.length,
      0,
    ),
    1,
  );
}


/**
 * ============================================================
 * JOB PROCESSOR
 * ============================================================
 */

async function processAIDecisionJob(
  job: Job<AIDecisionJobData>,
) {

  const {
    customerId,
    merchantId,
    recoveryCaseId,
    currency,
    features,
    source,
  } = job.data;


  let persistedDecisionId: string | null = null;

  try {
    /**
     * ==========================================================
     * JOB START
     * ==========================================================
     */

  logger.info(
    {
      jobId: job.id,
      jobName: job.name,
      customerId,
      merchantId,
      recoveryCaseId,
      source,
    },
    "AI decision job started",
  );


  /**
   * ==========================================================
   * STEP 0 — NORMALIZE FEATURES
   * ==========================================================
   */

  const normalizedFeatures =
    normalizeFeatures(features);


  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,

      transactionCount:
        normalizedFeatures.transactionCount,

      failureRate:
        normalizedFeatures.failureRate,

      daysSinceLastFailure:
        normalizedFeatures.daysSinceLastFailure,

      featureKeys:
        Object.keys(normalizedFeatures),
    },
    "AI decision features normalized",
  );


  /**
   * ==========================================================
   * STEP 1 — RECOVERY PROBABILITY
   * ==========================================================
   */

  const probability =
    recoveryProbabilityService.calculate(
      normalizedFeatures,
    );


  if (
    !probability ||
    typeof probability.probability !== "number"
  ) {
    throw new Error(
      "Invalid recovery probability result",
    );
  }


  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,

      probability:
        probability.probability,

      probabilityPercent:
        probability.probabilityPercent,

      probabilityBand:
        probability.band,

      confidence:
        probability.confidence,
    },
    "Recovery probability calculated",
  );


  /**
   * ==========================================================
   * STEP 2 — RECOVERY PRIORITY
   * ==========================================================
   */

  const priority =
    recoveryPriorityService.calculate(
      {
        recoveryProbability:
          probability.probability,

        confidence:
          probability.confidence,

        ...normalizedFeatures,
      },
    );


  if (
    !priority ||
    typeof priority.priorityScore !== "number"
  ) {
    throw new Error(
      "Invalid recovery priority result",
    );
  }


  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,

      priorityScore:
        priority.priorityScore,

      priorityBand:
        priority.priorityBand,

      urgencyScore:
        priority.urgencyScore,

      opportunityScore:
        priority.opportunityScore,

      riskScore:
        priority.riskScore,

      amountScore:
        priority.amountScore,
    },
    "Recovery priority calculated",
  );


  /**
   * ==========================================================
   * STEP 3 — RECOVERY STRATEGY
   * ==========================================================
   *
   * Features remain nested inside strategyContext.features.
   */

  const strategyContext = {

    recoveryProbability:
      probability.probability,

    recoveryProbabilityPercent:
      probability.probabilityPercent,

    probabilityBand:
      probability.band,

    probabilityConfidence:
      probability.confidence,

    priorityScore:
      priority.priorityScore,

    priorityBand:
      priority.priorityBand,

    urgencyScore:
      priority.urgencyScore,

    opportunityScore:
      priority.opportunityScore,

    riskScore:
      priority.riskScore,

    amountScore:
      priority.amountScore,

    features:
      normalizedFeatures,
  };


  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,

      hasFeatures:
        !!strategyContext.features,

      daysSinceLastFailure:
        strategyContext
          .features
          .daysSinceLastFailure,

      transactionCount:
        strategyContext
          .features
          .transactionCount,
    },
    "Strategy context prepared",
  );


  const strategy =
    recoveryStrategyService.recommend(
      strategyContext,
    );


  if (
    !strategy ||
    !strategy.strategy
  ) {
    throw new Error(
      "Invalid recovery strategy result",
    );
  }


  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,

      strategy:
        strategy.strategy,

      channel:
        strategy.channel,

      timing:
        strategy.timing,

      strategyScore:
        strategy.strategyScore,

      confidence:
        strategy.confidence,
    },
    "Recovery strategy calculated",
  );


  /**
   * ==========================================================
   * STEP 4 — M6.11 CONFIDENCE + FALLBACK
   * ==========================================================
   */

  const featureQuality =
    calculateAIWorkerFeatureQuality(
      normalizedFeatures,
    );


  const confidence =
    confidenceFallbackService.evaluate(
      {
        probability:
          probability.probability,

        probabilityConfidence:
          probability.confidence,

        priorityScore:
          priority.priorityScore,

        strategyScore:
          strategy.strategyScore,

        strategyConfidence:
          strategy.confidence,

        featureQuality,

        recoveryProbabilityBand:
          probability.band,

        priorityBand:
          priority.priorityBand,

        strategy:
          strategy.strategy,
      },
    );


  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,

      confidence:
        confidence.confidence,

      confidencePercent:
        confidence.confidencePercent,

      confidenceBand:
        confidence.band,

      fallbackRequired:
        confidence.fallbackRequired,

      fallbackAction:
        confidence.fallbackAction,

      fallbackReason:
        confidence.fallbackReason,

      primaryStrategy:
        confidence.primaryStrategy,

      selectedStrategy:
        confidence.selectedStrategy,

      decisionChanged:
        confidence.decisionChanged,

      featureQuality,
    },
    "AI confidence and fallback evaluated",
  );


  /**
   * ==========================================================
   * STEP 5 — M6.13 AI SAFETY / POLICY BOUNDARY
   * ==========================================================
   */

  const safety =
    aiSafetyService.evaluate({
      decisionId: null,
      strategy: confidence.selectedStrategy,
      confidence: confidence.confidence,
      currentFailedAmount: normalizedFeatures.currentFailedAmount,
      outstandingRecoveryAmount: normalizedFeatures.outstandingRecoveryAmount,
      recoveryAttemptCount: normalizedFeatures.activeRecoveryCaseCount,
      customerOptedOut: false,
      alreadyPaid: false,
      refundDetected: false,
      caseStopped: false,
      actionAllowed: true,
    });

  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,
      safetyDecision: safety.decision,
      safetyAllowed: safety.allowed,
      safetyRiskLevel: safety.riskLevel,
      safetyReason: safety.reason,
      blockingRules: safety.blockingRules.map((r) => r.code),
    },
    "AI safety boundary evaluated",
  );


  /**
   * ==========================================================
   * STEP 6 — M6.9 PERSIST AI DECISION
   * ==========================================================
   *
   * The AIDecision is created BEFORE audit events.
   *
   * Audit records therefore reference the real:
   *
   * AIDecision.decisionId
   */

  const decision =
    await aiDecisionService.createDecision(
      {

        customerId,

        merchantId,

        recoveryCaseId,

        currency,

        probability:
          probability.probability,

        probabilityPercent:
          probability.probabilityPercent,

        probabilityBand:
          probability.band,

        probabilityConfidence:
          probability.confidence,

        priorityScore:
          priority.priorityScore,

        priorityBand:
          priority.priorityBand,

        urgencyScore:
          priority.urgencyScore,

        opportunityScore:
          priority.opportunityScore,

        riskScore:
          priority.riskScore,

        amountScore:
          priority.amountScore,

        /**
         * Persist FINAL selected strategy.
         */
        strategy:
          confidence.selectedStrategy,

        /**
         * If fallback changed strategy,
         * primary strategy channel/timing
         * cannot safely be reused.
         */
        channel:
          confidence.selectedStrategy === strategy.strategy
            ? strategy.channel
            : "NONE",

        timing:
          confidence.selectedStrategy === strategy.strategy
            ? strategy.timing
            : "NO_ACTION",

        strategyScore:
          strategy.strategyScore,

        decisionConfidence:
          confidence.confidence,

        decisionReason:
          strategy.reason,

        modelVersions: {

          probability:
            probability.modelVersion,

          priority:
            priority.modelVersion,

          strategy:
            strategy.modelVersion,

          confidence:
            confidence.modelVersion,

          safety:
            safety.modelVersion,
        },

        inputFeatures:
          normalizedFeatures,

        positiveSignals: [

          ...probability.positiveSignals,

          ...priority.positiveSignals,

          ...strategy.positiveSignals,

          ...confidence.positiveSignals,

        ],

        negativeSignals: [

          ...probability.negativeSignals,

          ...priority.negativeSignals,

          ...strategy.negativeSignals,

          ...confidence.negativeSignals,

        ],

        alternatives:
          strategy.alternatives,

        /**
         * M6.13 Safety
         */
        safetyDecision:
          safety.decision,

        safetyAllowed:
          safety.allowed,

        safetyRiskLevel:
          safety.riskLevel,

        safetyReason:
          safety.reason,

        safetyBlockingRules:
          safety.blockingRules.map(
            (r) => r.code,
          ),

        safetyWarnings:
          safety.warnings.map(
            (r) => r.code,
          ),

        safetyModelVersion:
          safety.modelVersion,

        safetyEvaluatedAt:
          safety.generatedAt,
      },
    );


  if (
    !decision ||
    !decision.decisionId
  ) {
    throw new Error(
      "AI decision was not persisted correctly",
    );
  }


  const decisionId =
    decision.decisionId;

  persistedDecisionId =
    decisionId;


  logger.info(
    {
      jobId: job.id,
      decisionId,
      customerId,
      merchantId,
      recoveryCaseId,
    },
    "AI decision snapshot persisted",
  );


  /**
   * ==========================================================
   * STEP 7 — M6.12 AUDIT TRAIL
   * ==========================================================
   *
   * EIGHT LIFECYCLE EVENTS:
   *
   * 1. AI_DECISION_STARTED
   * 2. PROBABILITY_CALCULATED
   * 3. PRIORITY_CALCULATED
   * 4. STRATEGY_RECOMMENDED
   * 5. CONFIDENCE_EVALUATED
   * 6. FALLBACK_EVALUATED
   * 7. SAFETY_EVALUATED
   * 8. AI_DECISION_COMPLETED
   *
   * IMPORTANT:
   *
   * This block must appear ONLY ONCE.
   */


  /**
   * ----------------------------------------------------------
   * 7.1 — DECISION STARTED
   * ----------------------------------------------------------
   */

  await aiAuditService.recordDecisionStarted({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    metadata: {

      jobId:
        job.id,

      jobName:
        job.name,

      source:
        source ?? null,
    },
  });


  /**
   * ----------------------------------------------------------
   * 7.2 — PROBABILITY
   * ----------------------------------------------------------
   */

  await aiAuditService.recordProbability({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    probability:
      probability.probability,

    probabilityBand:
      probability.band,

    confidence:
      probability.confidence,

    modelVersion:
      probability.modelVersion,
  });


  /**
   * ----------------------------------------------------------
   * 7.3 — PRIORITY
   * ----------------------------------------------------------
   */

  await aiAuditService.recordPriority({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    priorityScore:
      priority.priorityScore,

    priorityBand:
      priority.priorityBand,

    modelVersion:
      priority.modelVersion,
  });


  /**
   * ----------------------------------------------------------
   * 7.4 — STRATEGY
   * ----------------------------------------------------------
   */

  await aiAuditService.recordStrategy({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    strategy:
      strategy.strategy,

    strategyScore:
      strategy.strategyScore,

    confidence:
      strategy.confidence,

    modelVersion:
      strategy.modelVersion,
  });


  /**
   * ----------------------------------------------------------
   * 7.5 — CONFIDENCE
   * ----------------------------------------------------------
   */

  await aiAuditService.recordConfidence({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    confidence:
      confidence.confidence,

    confidenceBand:
      confidence.band,

    modelVersion:
      confidence.modelVersion,
  });


  /**
   * ----------------------------------------------------------
   * 7.6 — FALLBACK
   * ----------------------------------------------------------
   *
   * Recorded even when fallback is NOT required.
   *
   * This creates a complete audit history.
   */

  await aiAuditService.recordFallback({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    strategy:
      confidence.primaryStrategy,

    confidence:
      confidence.confidence,

    fallbackRequired:
      confidence.fallbackRequired,

    fallbackAction:
      confidence.fallbackAction,

    fallbackReason:
      confidence.fallbackReason,

    selectedStrategy:
      confidence.selectedStrategy,

    decisionChanged:
      confidence.decisionChanged,
  });


  /**
   * ----------------------------------------------------------
   * 7.7 — SAFETY
   * ----------------------------------------------------------
   */

  await aiAuditService.recordSafety({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    safetyDecision:
      safety.decision,

    safetyAllowed:
      safety.allowed,

    safetyRiskLevel:
      safety.riskLevel,

    safetyReason:
      safety.reason,

    safetyBlockingRules:
      safety.blockingRules.map(
        (r) => r.code,
      ),

    safetyWarnings:
      safety.warnings.map(
        (r) => r.code,
      ),

    safetyModelVersion:
      safety.modelVersion,

    strategy:
      confidence.selectedStrategy,

    confidence:
      confidence.confidence,
  });


  /**
   * ----------------------------------------------------------
   * 7.8 — DECISION COMPLETED
   * ----------------------------------------------------------
   */

  await aiAuditService.recordDecisionCompleted({

    decisionId,

    merchantId,

    customerId,

    recoveryCaseId,

    strategy:
      confidence.selectedStrategy,

    confidence:
      confidence.confidence,

    metadata: {

      jobId:
        job.id,

      probability:
        probability.probability,

      probabilityBand:
        probability.band,

      priorityScore:
        priority.priorityScore,

      priorityBand:
        priority.priorityBand,

      strategyScore:
        strategy.strategyScore,

      fallbackRequired:
        confidence.fallbackRequired,

      fallbackAction:
        confidence.fallbackAction,

      decisionChanged:
        confidence.decisionChanged,

      safetyDecision:
        safety.decision,

      safetyRiskLevel:
        safety.riskLevel,
    },
  });


  logger.info(
    {
      jobId:
        job.id,

      recoveryCaseId,

      decisionId,

      auditEvents: [
        "AI_DECISION_STARTED",
        "PROBABILITY_CALCULATED",
        "PRIORITY_CALCULATED",
        "STRATEGY_RECOMMENDED",
        "CONFIDENCE_EVALUATED",
        "FALLBACK_EVALUATED",
        "SAFETY_EVALUATED",
        "AI_DECISION_COMPLETED",
      ],

      selectedStrategy:
        confidence.selectedStrategy,

      confidence:
        confidence.confidence,

      safetyDecision:
        safety.decision,
    },
    "AI audit trail completed",
  );


  /**
   * ==========================================================
   * STEP 8 — FINAL RESULT
   * ==========================================================
   */

  const result = {

    success: true,

    decisionId:
      decision.decisionId,

    customerId,

    merchantId,

    recoveryCaseId,

    currency,

    probability,

    priority,

    strategy,

    confidence,

    safety,

    source,

    generatedAt:
      new Date(),
  };


  logger.info(
    {
      jobId:
        job.id,

      recoveryCaseId,

      decisionId,

      probability:
        probability.probability,

      priorityScore:
        priority.priorityScore,

      strategy:
        strategy.strategy,

      confidence:
        confidence.confidence,

      fallbackRequired:
        confidence.fallbackRequired,

      selectedStrategy:
        confidence.selectedStrategy,
    },
    "AI decision job completed",
  );


    return result;
  } catch (error: any) {
    logger.error(
      {
        jobId: job.id,
        customerId,
        merchantId,
        recoveryCaseId,
        error: error.message,
        stack: error.stack,
      },
      "AI decision job execution failed",
    );

    if (persistedDecisionId && merchantId) {
      try {
        await aiAuditService.recordDecisionFailed({
          decisionId: persistedDecisionId,
          merchantId,
          customerId,
          recoveryCaseId,
          error: error.message || "AI decision job failed",
        });
      } catch (auditError: any) {
        logger.warn(
          {
            jobId: job.id,
            auditError: auditError.message,
          },
          "Could not record AI_DECISION_FAILED audit event",
        );
      }
    }

    throw error;
  }
}


/**
 * ============================================================
 * AI WORKER
 * ============================================================
 */

export const aiWorker =
  new Worker<AIDecisionJobData>(
    AI_QUEUE_NAME,

    processAIDecisionJob,

    {

      connection:
        createQueueConnection(),

      /**
       * Three AI jobs concurrently.
       */
      concurrency:
        3,

      /**
       * Prevent long-running locks.
       */
      lockDuration:
        30000,

      /**
       * Detect stalled jobs.
       */
      stalledInterval:
        30000,
    },
  );


/**
 * ============================================================
 * WORKER EVENTS
 * ============================================================
 */

aiWorker.on(
  "ready",
  () => {

    logger.info(
      "AI decision worker ready",
    );

  },
);


aiWorker.on(
  "completed",
  (job) => {

    logger.info(
      {
        jobId:
          job.id,

        jobName:
          job.name,
      },

      "AI queue job completed",
    );

  },
);


aiWorker.on(
  "failed",
  (job, error) => {

    logger.error(
      {
        jobId:
          job?.id,

        jobName:
          job?.name,

        error:
          error.message,

        stack:
          error.stack,
      },

      "AI queue job failed",
    );

  },
);


aiWorker.on(
  "error",
  (error) => {

    logger.error(
      {
        error:
          error.message,

        stack:
          error.stack,
      },

      "AI worker error",
    );

  },
);


aiWorker.on(
  "stalled",
  (jobId) => {

    logger.warn(
      {
        jobId,
      },

      "AI job stalled",
    );

  },
);


/**
 * ============================================================
 * STARTUP
 * ============================================================
 */

logger.info(
  "AI decision worker initialized",
);