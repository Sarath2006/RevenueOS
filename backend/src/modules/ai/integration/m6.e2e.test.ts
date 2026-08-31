/**
 * ============================================================
 * RevenueOS — M6.16 END-TO-END AI PIPELINE INTEGRATION TEST
 * ============================================================
 *
 * Comprehensive end-to-end integration test of the complete
 * RevenueOS Milestone 6 AI Decision Engine.
 *
 * Pipeline Flow Verified:
 *
 * BullMQ (Queue)
 *   ↓
 * aiWorker (Worker)
 *   ↓
 * Feature Normalization (38 features)
 *   ↓
 * Recovery Probability (M6.6)
 *   ↓
 * Recovery Priority (M6.7)
 *   ↓
 * Recovery Strategy (M6.8)
 *   ↓
 * Confidence & Fallback (M6.11)
 *   ↓
 * AI Safety & Policy Boundary (M6.13)
 *   ↓
 * Decision Persistence (M6.9 / PostgreSQL)
 *   ↓
 * AI Audit Trail Persistence (M6.12 / PostgreSQL)
 *   ↓
 * Evaluation & Observability (M6.15)
 *   ↓
 * Model Versioning Registry (M6.14)
 *
 * ============================================================
 */

// Initialize worker in-process so it processes queued jobs during the test
import "../../../workers/ai.worker";

import {
  enqueueAIDecision,
  aiQueue,
} from "../../../queues/ai.queue";

import {
  aiDecisionService,
} from "../decision/decision.service";

import {
  aiAuditService,
} from "../audit/audit.service";

import {
  aiEvaluationService,
} from "../evaluation/evaluation.service";

import {
  aiModelVersionRegistry,
} from "../versioning/version.registry";

import {
  prisma,
} from "../../../config/database";

import type {
  RecoveryProbabilityFeatures,
} from "../probability/probability.types";

import type {
  AIDecisionRecord,
} from "../decision/decision.types";

import type {
  AIAuditLogRecord,
} from "../audit/audit.types";


function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function waitForJobCompletion(
  jobId: string,
  maxWaitMs = 25000,
) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const job = await aiQueue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state === "completed" || state === "failed") {
        return { job, state };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Job ${jobId} did not complete within ${maxWaitMs}ms`);
}

async function getOrCreateTestFixtures() {
  let merchant = await prisma.merchant.findFirst();
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        name: "Test Merchant M6 E2E",
        email: "m6.e2e@revenueos.test",
      },
    });
  }

  let customer = await prisma.customer.findFirst({
    where: { merchantId: merchant.id },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        merchantId: merchant.id,
        name: "Test Customer M6 E2E",
        email: "cust.m6.e2e@revenueos.test",
      },
    });
  }

  let recoveryCase = await prisma.recoveryCase.findFirst({
    where: { merchantId: merchant.id },
  });
  if (!recoveryCase) {
    recoveryCase = await prisma.recoveryCase.create({
      data: {
        merchantId: merchant.id,
        customerId: customer.id,
        type: "PAYMENT_FAILURE",
        status: "OPEN",
        amountAtRisk: 2500,
      },
    });
  }

  return { merchant, customer, recoveryCase };
}


const validFeatures: RecoveryProbabilityFeatures = {
  transactionCount: 25,
  successfulTransactionCount: 20,
  failedTransactionCount: 4,
  pendingTransactionCount: 1,
  successfulTransactionRate: 0.80,
  failureRate: 0.16,
  pendingRate: 0.04,
  totalTransactionValue: 50000,
  successfulTransactionValue: 42000,
  failedTransactionValue: 8000,
  averageTransactionValue: 2000,
  averageSuccessfulTransactionValue: 2100,
  averageFailedTransactionValue: 2000,
  paymentMethodDiversity: 2,
  preferredPaymentMethodSuccessRate: 0.88,
  recoveryCaseCount: 3,
  activeRecoveryCaseCount: 1,
  recoveredCaseCount: 2,
  totalAmountAtRisk: 8000,
  totalRecoveredAmount: 5500,
  outstandingRecoveryAmount: 2500,
  historicalRecoveryRate: 0.68,
  averageRecoveryAmount: 2750,
  averageRecoveryRatio: 0.69,
  failureStreak: 1,
  successStreak: 4,
  recentFailureCount7d: 1,
  recentSuccessCount7d: 5,
  recentFailureCount30d: 3,
  recentSuccessCount30d: 18,
  daysSinceLastTransaction: 0,
  daysSinceLastSuccess: 1,
  daysSinceLastFailure: 0,
  daysSinceLastRecovery: 8,
  currentFailedAmount: 2500,
  currentFailedAmountRatio: 0.20,
  activeRiskRatio: 0.15,
  failureFrequency30d: 0.14,
  recoveryEfficiency: 0.78,
};


async function main() {
  console.log("\n============================================================");
  console.log("RevenueOS — M6.16 END-TO-END AI PIPELINE INTEGRATION TEST");
  console.log("============================================================\n");

  const { merchant, customer, recoveryCase } = await getOrCreateTestFixtures();
  console.log("✓ Test fixtures loaded:", {
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: recoveryCase.id,
  });


  /**
   * ==========================================================
   * 16.1 & 16.2 — REAL BULLMQ JOB DISPATCH & WORKER PROCESSING
   * ==========================================================
   */
  console.log("\n[16.1 & 16.2] Submitting real job to BullMQ queue...");

  const enqueuedJob = await enqueueAIDecision({
    customerId: customer.id,
    merchantId: merchant.id,
    recoveryCaseId: recoveryCase.id,
    currency: "INR",
    features: validFeatures,
    source: "SYSTEM",
  });

  console.log("✓ Enqueued job ID:", enqueuedJob.id);
  assert(Boolean(enqueuedJob.id), "Job must have a valid ID");

  console.log("Waiting for aiWorker to process job...");
  const { job: completedJob, state } = await waitForJobCompletion(enqueuedJob.id!);

  console.log(`✓ Job completed with state: ${state}`);
  assert(state === "completed", "Job must reach 'completed' state");

  const workerResult = completedJob.returnvalue;
  assert(workerResult.success === true, "Worker result must indicate success");
  assert(Boolean(workerResult.decisionId), "Worker result must contain decisionId");
  assert(typeof workerResult.probability.probability === "number", "Probability must be calculated");
  assert(typeof workerResult.priority.priorityScore === "number", "Priority must be calculated");
  assert(typeof workerResult.strategy.strategy === "string", "Strategy must be recommended");
  assert(typeof workerResult.confidence.confidence === "number", "Confidence must be evaluated");
  assert(typeof workerResult.safety.decision === "string", "Safety boundary must be evaluated");

  console.log("✓ Worker pipeline execution result validated:", {
    decisionId: workerResult.decisionId,
    strategy: workerResult.strategy.strategy,
    confidence: workerResult.confidence.confidence,
    safetyDecision: workerResult.safety.decision,
  });


  /**
   * ==========================================================
   * 16.3 — REAL AI DECISION PERSISTENCE (POSTGRESQL)
   * ==========================================================
   */
  console.log("\n[16.3] Verifying real AIDecision persistence in database...");
  const storedDecision = await aiDecisionService.getDecision(workerResult.decisionId);

  assert(storedDecision !== null, "AIDecision row must exist in database");
  assert(storedDecision.decisionId === workerResult.decisionId, "Stored decisionId must match");
  assert(storedDecision.merchantId === merchant.id, "Stored merchantId must match");
  assert(storedDecision.customerId === customer.id, "Stored customerId must match");
  assert(storedDecision.probability >= 0 && storedDecision.probability <= 1, "Stored probability in valid range");
  assert(storedDecision.priorityScore >= 0 && storedDecision.priorityScore <= 100, "Stored priority in valid range");
  assert(Boolean(storedDecision.strategy), "Stored strategy must not be empty");
  const modelVersions = (storedDecision.modelVersions ?? {}) as Record<string, string>;
  assert(Boolean(modelVersions.probability), "Probability model version must be recorded");
  assert(Boolean(modelVersions.safety), "Safety model version must be recorded");

  console.log("✓ Stored AIDecision verified:", {
    id: storedDecision.id,
    decisionId: storedDecision.decisionId,
    strategy: storedDecision.strategy,
    modelVersions: storedDecision.modelVersions,
  });


  /**
   * ==========================================================
   * 16.4 — REAL AI AUDIT TRAIL PERSISTENCE (POSTGRESQL)
   * ==========================================================
   */
  console.log("\n[16.4] Verifying real AIAuditLog persistence in database...");
  const auditEvents = await aiAuditService.getDecisionAudit(workerResult.decisionId);

  console.log(`✓ Fetched ${auditEvents.length} audit events for decision`);
  assert(auditEvents.length >= 8, "Expected at least 8 lifecycle audit events");

  const eventTypes = auditEvents.map((e) => e.eventType);
  const expectedEvents = [
    "AI_DECISION_STARTED",
    "PROBABILITY_CALCULATED",
    "PRIORITY_CALCULATED",
    "STRATEGY_RECOMMENDED",
    "CONFIDENCE_EVALUATED",
    "FALLBACK_EVALUATED",
    "SAFETY_EVALUATED",
    "AI_DECISION_COMPLETED",
  ];

  for (const exp of expectedEvents) {
    assert(eventTypes.includes(exp), `Audit trail must contain ${exp}`);
  }

  console.log("✓ All 8 lifecycle audit events verified:", eventTypes);


  /**
   * ==========================================================
   * 16.5 — REAL EVALUATION & OBSERVABILITY COMPATIBILITY
   * ==========================================================
   */
  console.log("\n[16.5] Verifying M6.15 evaluation and observability compatibility...");
  const decisionRecord = storedDecision as unknown as AIDecisionRecord;
  const evaluation = aiEvaluationService.evaluate(decisionRecord);
  assert(evaluation.decisionId === storedDecision.decisionId, "Evaluation decisionId must match");
  assert(evaluation.status === "PENDING_OUTCOME" || evaluation.status === "EVALUATED", "Valid evaluation status");

  const snapshot = aiEvaluationService.snapshot(
    [decisionRecord],
    auditEvents as unknown as AIAuditLogRecord[],
  );
  assert(snapshot.decisionCount === 1, "Snapshot decisionCount must be 1");
  assert(snapshot.probability.totalPredictions === 1, "Probability metrics aggregated");
  assert(snapshot.confidence.totalDecisions === 1, "Confidence metrics aggregated");
  assert(snapshot.safety.totalEvaluated === 1, "Safety metrics aggregated");
  assert(snapshot.audit.totalEvents >= 8, "Audit metrics aggregated");
  assert(snapshot.pipeline.health === "HEALTHY", "Pipeline health should be HEALTHY");

  console.log("✓ Observability snapshot validated:", {
    decisionCount: snapshot.decisionCount,
    auditEvents: snapshot.audit.totalEvents,
    pipelineHealth: snapshot.pipeline.health,
  });


  /**
   * ==========================================================
   * 16.6 — FAILURE-PATH E2E TEST
   * ==========================================================
   */
  console.log("\n[16.6] Testing failure handling path...");

  const failedJob = await enqueueAIDecision({
    customerId: customer.id,
    merchantId: merchant.id,
    recoveryCaseId: recoveryCase.id,
    currency: "INVALID_CURRENCY_CODE",
    features: validFeatures,
    source: "SYSTEM",
  });

  const { state: failedState, job: finalFailedJob } = await waitForJobCompletion(failedJob.id!);
  console.log(`✓ Failed job state: ${failedState}`);
  assert(failedState === "failed", "Invalid job must fail");
  assert(Boolean(finalFailedJob.failedReason), "Job must have a failedReason");
  console.log("✓ Failure reason properly captured:", finalFailedJob.failedReason);


  /**
   * ==========================================================
   * 16.7 — SAFETY-PATH E2E TEST
   * ==========================================================
   */
  console.log("\n[16.7] Testing safety boundary enforcement path...");

  // High risk features with heavy active exposure
  const highRiskFeatures: RecoveryProbabilityFeatures = {
    ...validFeatures,
    currentFailedAmount: 500000,
    outstandingRecoveryAmount: 500000,
    failureStreak: 8,
    activeRecoveryCaseCount: 5,
  };

  const safetyJob = await enqueueAIDecision({
    customerId: customer.id,
    merchantId: merchant.id,
    recoveryCaseId: recoveryCase.id,
    currency: "INR",
    features: highRiskFeatures,
    source: "SYSTEM",
  });

  const { job: completedSafetyJob, state: safetyJobState } = await waitForJobCompletion(safetyJob.id!);
  assert(safetyJobState === "completed", "Safety job completed execution");

  const safetyResult = completedSafetyJob.returnvalue;
  assert(Boolean(safetyResult.safety), "Safety result must be present");
  console.log("✓ Safety boundary result under high risk:", {
    riskLevel: safetyResult.safety.riskLevel,
    decision: safetyResult.safety.decision,
    blockingRulesCount: safetyResult.safety.blockingRules.length,
  });


  /**
   * ==========================================================
   * 16.8 — BOUNDED SCOPE & MODEL VERSION REGISTRY VERIFICATION
   * ==========================================================
   */
  console.log("\n[16.8] Verifying bounded scope & model registry integrity...");
  const registeredModels = aiModelVersionRegistry.list();
  const modelIds = registeredModels.map((m) => m.modelId);

  const requiredModels = [
    "recovery-probability",
    "recovery-priority",
    "recovery-strategy",
    "confidence-fallback",
    "ai-safety-policy",
    "recovery-features",
  ];

  for (const req of requiredModels) {
    assert(modelIds.includes(req), `Model registry must include ${req}`);
  }
  console.log("✓ All 6 core AI models registered in version registry:", modelIds);

  console.log("\n============================================================");
  console.log("M6.16 END-TO-END AI PIPELINE INTEGRATION TEST PASSED ✅");
  console.log("============================================================\n");

  await aiQueue.close();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("\n❌ M6.16 TEST FAILED:", error);
  try {
    await aiQueue.close();
  } catch {}
  process.exit(1);
});
