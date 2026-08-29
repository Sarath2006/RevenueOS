/**
 * ============================================================
 * RevenueOS — M6.10 + M6.11 AI PIPELINE TEST
 * ============================================================
 *
 * Tests:
 *
 * BullMQ
 *   ↓
 * Recovery Probability
 *   ↓
 * Recovery Priority
 *   ↓
 * Recovery Strategy
 *   ↓
 * Confidence + Fallback
 *
 * This test does NOT modify:
 * - M5 webhook ingestion
 * - M5 synchronization
 * - M6.1 AI architecture
 * - M6.2 provider abstraction
 * - M6.3 failure intelligence
 * - M6.4 customer profile
 * - M6.5 feature engineering
 * - M6.6 probability engine
 * - M6.7 priority engine
 * - M6.8 strategy engine
 * - M6.9 decision record
 *
 * It only submits a test job to the existing M6.10 queue.
 * ============================================================
 */

import {
  enqueueAIDecision,
  aiQueue,
} from "./queues/ai.queue";


/**
 * ============================================================
 * TEST FEATURES
 * ============================================================
 *
 * IMPORTANT:
 *
 * These fields must match the existing
 * RecoveryProbabilityFeatures contract.
 *
 * Do not add new fields here unless the
 * probability feature type requires them.
 */

const features = {
  transactionCount: 20,

  successfulTransactionCount: 5,
  failedTransactionCount: 14,
  pendingTransactionCount: 1,

  successfulTransactionRate: 0.25,
  failureRate: 0.70,
  pendingRate: 0.05,

  totalTransactionValue: 20000,
  successfulTransactionValue: 5000,
  failedTransactionValue: 15000,

  averageTransactionValue: 1000,
  averageSuccessfulTransactionValue: 1000,
  averageFailedTransactionValue: 1071.43,

  paymentMethodDiversity: 1,
  preferredPaymentMethodSuccessRate: 0.30,

  recoveryCaseCount: 5,
  activeRecoveryCaseCount: 4,
  recoveredCaseCount: 1,

  totalAmountAtRisk: 15000,
  totalRecoveredAmount: 1000,
  outstandingRecoveryAmount: 14000,

  historicalRecoveryRate: 0.20,
  averageRecoveryAmount: 1000,
  averageRecoveryRatio: 0.15,

  failureStreak: 6,
  successStreak: 0,

  recentFailureCount7d: 5,
  recentSuccessCount7d: 0,

  recentFailureCount30d: 14,
  recentSuccessCount30d: 5,

  daysSinceLastTransaction: 0,
  daysSinceLastSuccess: 25,
  daysSinceLastFailure: 0,
  daysSinceLastRecovery: 60,

  currentFailedAmount: 15000,
  currentFailedAmountRatio: 0.75,

  activeRiskRatio: 0.85,
  failureFrequency30d: 0.70,

  recoveryEfficiency: 0.10,
};


/**
 * ============================================================
 * TEST JOB
 * ============================================================
 */

async function main() {

  const recoveryCaseId = null;


  console.log(
    "\n============================================",
  );

  console.log(
    "RevenueOS M6.10 + M6.11 PIPELINE TEST",
  );

  console.log(
    "============================================\n",
  );


  /**
   * ==========================================================
   * ENQUEUE
   * ==========================================================
   */

  const job =
    await enqueueAIDecision({

      customerId:
        "cmtd8ioy20000ikveby5pbtco",

      merchantId:
        "cmtbrquy60000q4vecj8hqtkw",

      recoveryCaseId,

      currency:
        "INR",

      features,

      source:
        "SYSTEM",
    });


  console.log(
    "AI JOB ENQUEUED",
  );


  console.log({

    id:
      job.id,

    name:
      job.name,

    recoveryCaseId:
      job.data.recoveryCaseId,

  });


  /**
   * ==========================================================
   * WAIT FOR COMPLETION
   * ==========================================================
   *
   * We poll the BullMQ job instead of making assumptions
   * about worker timing.
   */

  let completedJob = job;

  const maxAttempts = 30;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 1000),
    );


    completedJob =
      await aiQueue.getJob(
        job.id!,
      ) ?? job;


    const state =
      await completedJob.getState();


    console.log(
      `Job state: ${state}`,
    );


    if (
      state === "completed" ||
      state === "failed"
    ) {
      break;
    }
  }


  /**
   * ==========================================================
   * FINAL STATE
   * ==========================================================
   */

  const state =
    await completedJob.getState();


  if (
    state === "failed"
  ) {

    console.error(
      "\nAI JOB FAILED",
    );


    console.error({

      id:
        completedJob.id,

      name:
        completedJob.name,

      state,

      attemptsMade:
        completedJob.attemptsMade,

      failedReason:
        completedJob.failedReason,

      stacktrace:
        completedJob.stacktrace,

    });


    process.exitCode = 1;

    await aiQueue.close();

    return;
  }


  if (
    state !== "completed"
  ) {

    console.error(
      "\nAI JOB DID NOT COMPLETE WITHIN TIME",
    );


    console.error({

      id:
        completedJob.id,

      state,

    });


    process.exitCode = 1;

    await aiQueue.close();

    return;
  }


  /**
   * ==========================================================
   * RESULT
   * ==========================================================
   */

  const result =
    completedJob.returnvalue;


  console.log(
    "\n============================================",
  );

  console.log(
    "AI JOB COMPLETED",
  );

  console.log(
    "============================================\n",
  );


  console.dir(
    result,
    {
      depth: null,
    },
  );


  /**
   * ==========================================================
   * BASIC VALIDATION
   * ==========================================================
   */

  if (
    !result ||
    result.success !== true
  ) {

    throw new Error(
      "AI pipeline returned an invalid result",
    );
  }


  /**
   * ==========================================================
   * M6.6 — PROBABILITY
   * ==========================================================
   */

  if (
    !result.probability ||
    typeof result.probability.probability !== "number"
  ) {

    throw new Error(
      "M6.6 probability result missing",
    );
  }


  /**
   * ==========================================================
   * M6.7 — PRIORITY
   * ==========================================================
   */

  if (
    !result.priority ||
    typeof result.priority.priorityScore !== "number"
  ) {

    throw new Error(
      "M6.7 priority result missing",
    );
  }


  /**
   * ==========================================================
   * M6.8 — STRATEGY
   * ==========================================================
   */

  if (
    !result.strategy ||
    typeof result.strategy.strategy !== "string"
  ) {

    throw new Error(
      "M6.8 strategy result missing",
    );
  }


  /**
   * ==========================================================
   * M6.11 — CONFIDENCE + FALLBACK
   * ==========================================================
   */

  if (
    !result.confidence ||
    typeof result.confidence.confidence !== "number"
  ) {

    throw new Error(
      "M6.11 confidence result missing",
    );
  }


  if (
    typeof result.confidence.confidencePercent !== "number"
  ) {

    throw new Error(
      "M6.11 confidencePercent missing",
    );
  }


  if (
    typeof result.confidence.fallbackRequired !== "boolean"
  ) {

    throw new Error(
      "M6.11 fallbackRequired missing",
    );
  }


  if (
    typeof result.confidence.selectedStrategy !== "string"
  ) {

    throw new Error(
      "M6.11 selectedStrategy missing",
    );
  }


  /**
   * ==========================================================
   * RANGE VALIDATION
   * ==========================================================
   */

  if (
    result.confidence.confidence < 0 ||
    result.confidence.confidence > 1
  ) {

    throw new Error(
      "M6.11 confidence must be between 0 and 1",
    );
  }


  if (
    result.confidence.confidencePercent < 0 ||
    result.confidence.confidencePercent > 100
  ) {

    throw new Error(
      "M6.11 confidencePercent must be between 0 and 100",
    );
  }


  /**
   * ==========================================================
   * IMPORTANT CONSISTENCY CHECK
   * ==========================================================
   *
   * The confidence engine may select the original strategy
   * or a fallback strategy.
   *
   * Therefore we do NOT require:
   *
   * result.strategy.strategy === selectedStrategy
   *
   * because M6.11 is specifically allowed to change the
   * selected strategy when fallback is required.
   */

  console.log(
    "\n============================================",
  );

  console.log(
    "PIPELINE SUMMARY",
  );

  console.log(
    "============================================",
  );


  console.log({

    probability:
      result.probability.probability,

    probabilityPercent:
      result.probability.probabilityPercent,

    probabilityBand:
      result.probability.band,

    priorityScore:
      result.priority.priorityScore,

    priorityBand:
      result.priority.priorityBand,

    originalStrategy:
      result.strategy.strategy,

    strategyScore:
      result.strategy.strategyScore,

    strategyConfidence:
      result.strategy.confidence,

    finalConfidence:
      result.confidence.confidence,

    confidencePercent:
      result.confidence.confidencePercent,

    confidenceBand:
      result.confidence.band,

    fallbackRequired:
      result.confidence.fallbackRequired,

    fallbackAction:
      result.confidence.fallbackAction,

    primaryStrategy:
      result.confidence.primaryStrategy,

    selectedStrategy:
      result.confidence.selectedStrategy,

    decisionChanged:
      result.confidence.decisionChanged,

  });


  console.log(
    "\n============================================",
  );

  console.log(
    "M6.10 + M6.11 TEST PASSED",
  );

  console.log(
    "============================================\n",
  );


  /**
   * ==========================================================
   * CLEANUP
   * ==========================================================
   */

  await aiQueue.close();
}


main()
  .catch(
    async (error) => {

      console.error(
        "\nTEST ERROR",
      );

      console.error(
        error,
      );


      process.exitCode = 1;


      try {
        await aiQueue.close();
      } catch {
        // Ignore cleanup errors.
      }
    },
  );