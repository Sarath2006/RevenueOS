/**
 * ============================================================
 * RevenueOS — M8 END-TO-END RECOVERY AGENT LOOP TEST SUITE
 * ============================================================
 *
 * Comprehensive integration test for Milestone 8 (M8.1 to M8.5).
 * Validates the complete autonomous recovery agent lifecycle:
 * - State machine transitions
 * - Outcome evaluation & real-time webhook reactions
 * - Next-action strategy shifting
 * - Stopping rules & human escalation guards
 * - Concurrency locks & idempotency
 * - BullMQ background worker execution
 * - The Golden Autonomous Recovery Lifecycle
 * ============================================================
 */

// Initialize worker in-process for queue testing
import "../../workers/recovery-agent.worker";
import "../../workers/recovery-action.worker";

import {
  recoveryAgentService,
} from "./controller/agent.service";

import {
  agentRunRepository,
} from "./controller/agent-run.repository";

import {
  stoppingService,
} from "./stopping/stopping.service";

import {
  escalationService,
} from "./stopping/escalation.service";

import {
  outcomeEvaluatorService,
} from "./state/outcome.evaluator";

import {
  nextActionService,
} from "./decision/next-action.service";

import {
  actionRepository,
} from "../recovery/orchestration/action.repository";

import {
  idempotencyService,
} from "../recovery/orchestration/idempotency.service";

import {
  aiDecisionService,
} from "../ai/decision/decision.service";

import {
  enqueueRecoveryAgentRun,
  recoveryAgentQueue,
} from "../../queues/recovery-agent.queue";

import { prisma } from "../../config/database";
import type { AIDecisionRecord } from "../ai/decision/decision.types";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function waitForJobCompletion(jobId: string, maxWaitMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const job = await recoveryAgentQueue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state === "completed" || state === "failed") {
        return { job, state };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Recovery agent job ${jobId} timed out`);
}

async function getOrCreateFixtures() {
  let merchant = await prisma.merchant.findFirst();
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        name: "Test Merchant M8",
        email: "m8.merchant@revenueos.test",
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
        name: "Test Customer M8",
        email: "m8.customer@revenueos.test",
        phone: "+919876543210",
      },
    });
  }

  return { merchant, customer };
}

async function createFreshRecoveryCase(merchantId: string, customerId: string, amount = 3000) {
  return prisma.recoveryCase.create({
    data: {
      merchantId,
      customerId,
      type: "PAYMENT_FAILURE",
      status: "OPEN",
      amountAtRisk: amount,
      recoveredAmount: 0,
    },
  });
}

function createMockDecision(
  merchantId: string,
  customerId: string,
  recoveryCaseId: string,
  overrides?: Partial<AIDecisionRecord>,
): AIDecisionRecord {
  const decisionId = `aid_m8_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  return {
    id: `rec_${Date.now()}`,
    decisionId,
    merchantId,
    customerId,
    recoveryCaseId,
    currency: "INR",
    probability: 0.85,
    probabilityPercent: 85,
    probabilityBand: "HIGH",
    probabilityConfidence: 0.9,
    priorityScore: 75,
    priorityBand: "HIGH",
    urgencyScore: 80,
    opportunityScore: 75,
    riskScore: 20,
    amountScore: 60,
    strategy: "RETRY_PAYMENT",
    channel: "PAYMENT_RETRY",
    timing: "IMMEDIATE",
    strategyScore: 90,
    decisionConfidence: 0.9,
    decisionReason: "Autonomous recovery agent initial strategy recommendation.",
    modelVersions: {
      probability: "recovery-probability-v1",
      priority: "recovery-priority-v1",
      strategy: "recovery-strategy-v1",
      confidence: "confidence-fallback-v1",
      safety: "ai-safety-policy-v1",
    },
    inputFeatures: {},
    positiveSignals: ["AUTO_AGENT_SIGNAL"],
    negativeSignals: [],
    alternatives: [],
    decisionStatus: "CREATED",
    outcome: null,
    outcomeAmount: null,
    outcomeRecordedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function main() {
  console.log("\n============================================================");
  console.log("RevenueOS — M8 AUTOMATIC AGENT LOOP & STOPPING RULES TEST");
  console.log("============================================================\n");

  const { merchant, customer } = await getOrCreateFixtures();
  idempotencyService.clear();

  console.log("✓ Test fixtures initialized:", {
    merchantId: merchant.id,
    customerId: customer.id,
  });

  /**
   * ==========================================================
   * TEST 1: SUCCESSFUL FIRST ACTION -> RECOVERED -> STOP
   * ==========================================================
   */
  console.log("\n[TEST 1] Testing successful first action (Retry -> Captured -> RECOVERED -> STOP)...");
  const case1 = await createFreshRecoveryCase(merchant.id, customer.id, 2500);
  const decision1 = createMockDecision(merchant.id, customer.id, case1.id);
  await aiDecisionService.createDecision(decision1 as any);

  const runResult1 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case1.id,
    initialDecisionId: decision1.decisionId,
  });

  assert(runResult1.status === "COMPLETED", "Agent run 1 must be COMPLETED");
  assert(runResult1.finalState === "RECOVERED", "Final state must be RECOVERED");
  assert(runResult1.recovered === true, "Recovered flag must be true");
  assert(runResult1.recoveredAmount === 2500, "Recovered amount must be 2500");
  assert(runResult1.totalIterations === 1, "Should succeed in 1 iteration");

  console.log("✓ Agent executed single iteration to full recovery:", {
    agentRunId: runResult1.agentRunId,
    status: runResult1.status,
    finalState: runResult1.finalState,
    recoveredAmount: runResult1.recoveredAmount,
  });

  /**
   * ==========================================================
   * TEST 2: RETRY FAILURE -> STRATEGY SHIFT (PAYMENT LINK)
   * ==========================================================
   */
  console.log("\n[TEST 2] Testing retry failure -> strategy shift to Payment Link...");
  const case2 = await createFreshRecoveryCase(merchant.id, customer.id, 3500);

  // Seed 2 historical failed retries
  await actionRepository.create({
    merchantId: merchant.id,
    recoveryCaseId: case2.id,
    type: "RETRY_PAYMENT",
    status: "FAILED",
    attemptNumber: 1,
    completedAt: new Date(Date.now() - 3600000),
  });

  await actionRepository.create({
    merchantId: merchant.id,
    recoveryCaseId: case2.id,
    type: "RETRY_PAYMENT",
    status: "FAILED",
    attemptNumber: 2,
    completedAt: new Date(Date.now() - 1800000),
  });

  const runResult2 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case2.id,
    maxIterations: 3,
  });

  assert(runResult2.finalState === "WAITING", "After dispatching payment link, agent should transition to WAITING");
  assert(runResult2.status === "WAITING", "Run status should be WAITING");

  console.log("✓ NextActionEngine shifted strategy to Payment Link and entered WAITING state:", {
    agentRunId: runResult2.agentRunId,
    finalState: runResult2.finalState,
    stopReason: runResult2.stopReason,
  });

  /**
   * ==========================================================
   * TEST 3: MAX PAYMENT RETRIES BOUNDARY
   * ==========================================================
   */
  console.log("\n[TEST 3] Testing max payment retries stopping rule (3 retries max)...");
  const case3 = await createFreshRecoveryCase(merchant.id, customer.id, 5000);

  // Seed 3 historical failed retries
  for (let i = 1; i <= 3; i++) {
    await actionRepository.create({
      merchantId: merchant.id,
      recoveryCaseId: case3.id,
      type: "RETRY_PAYMENT",
      status: "FAILED",
      attemptNumber: i,
      completedAt: new Date(Date.now() - (4 - i) * 1800000),
    });
  }

  const runResult3 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case3.id,
  });

  assert(runResult3.stopReason === "MAX_PAYMENT_RETRIES" || runResult3.stopReason === "HUMAN_REVIEW_REQUIRED", "Must stop on MAX_PAYMENT_RETRIES or HUMAN_REVIEW");
  assert(runResult3.finalState === "HUMAN_REVIEW" || runResult3.finalState === "STOPPED", "State must be HUMAN_REVIEW or STOPPED");

  console.log("✓ Max payment retries stopping rule enforced:", {
    finalState: runResult3.finalState,
    stopReason: runResult3.stopReason,
  });

  /**
   * ==========================================================
   * TEST 4: MAX AGENT ITERATIONS BOUNDARY
   * ==========================================================
   */
  console.log("\n[TEST 4] Testing maximum agent iterations stopping rule...");
  const case4 = await createFreshRecoveryCase(merchant.id, customer.id, 1000);

  // Run with maxIterations = 2
  const runResult4 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case4.id,
    maxIterations: 2,
  });

  assert(runResult4.totalIterations <= 2, "Total iterations must not exceed maxIterations");

  console.log("✓ Max agent iterations bounded cleanly at:", runResult4.totalIterations);

  /**
   * ==========================================================
   * TEST 5: ALREADY RECOVERED CASE -> IMMEDIATE STOP
   * ==========================================================
   */
  console.log("\n[TEST 5] Testing already-recovered case immediate stop...");
  const case5 = await createFreshRecoveryCase(merchant.id, customer.id, 2000);
  await actionRepository.updateRecoveryCase(case5.id, {
    status: "RECOVERED",
    recoveredAmount: 2000,
  });

  const runResult5 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case5.id,
  });

  assert(runResult5.finalState === "RECOVERED", "State must be RECOVERED");
  assert(runResult5.stopReason === "CASE_RECOVERED", "Stop reason must be CASE_RECOVERED");
  assert(runResult5.totalIterations <= 1, "Should terminate immediately without executing actions");

  console.log("✓ Already recovered case stopped immediately with 0 extra actions");

  /**
   * ==========================================================
   * TEST 6: SAFETY BOUNDARY BLOCK -> IMMEDIATE STOP
   * ==========================================================
   */
  console.log("\n[TEST 6] Testing AI Safety BLOCK stopping rule...");
  const case6 = await createFreshRecoveryCase(merchant.id, customer.id, 8000);
  const decision6 = createMockDecision(merchant.id, customer.id, case6.id);
  (decision6 as any).safetyDecision = "BLOCK";
  (decision6 as any).safetyAllowed = false;
  const created6 = await aiDecisionService.createDecision(decision6 as any);

  const runResult6 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case6.id,
    initialDecisionId: created6.decisionId,
  });

  assert(runResult6.stopReason === "SAFETY_BLOCK" || runResult6.finalState === "STOPPED", "Must stop due to safety block");

  console.log("✓ Safety BLOCK halted autonomous agent:", runResult6.message);

  /**
   * ==========================================================
   * TEST 7: LOW CONFIDENCE -> HUMAN REVIEW ESCALATION
   * ==========================================================
   */
  console.log("\n[TEST 7] Testing low confidence human escalation guard...");
  const case7 = await createFreshRecoveryCase(merchant.id, customer.id, 3000);
  const decision7 = createMockDecision(merchant.id, customer.id, case7.id, {
    decisionConfidence: 0.4, // Below 0.65 threshold
  });
  const created7 = await aiDecisionService.createDecision(decision7 as any);

  const runResult7 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case7.id,
    initialDecisionId: created7.decisionId,
  });

  assert(runResult7.finalState === "HUMAN_REVIEW", "Final state must be HUMAN_REVIEW");
  assert(runResult7.status === "HUMAN_REVIEW", "Status must be HUMAN_REVIEW");

  console.log("✓ Low confidence escalated case to human supervisor review");

  /**
   * ==========================================================
   * TEST 8: DECISION EXPIRED -> STOP
   * ==========================================================
   */
  console.log("\n[TEST 8] Testing decision expiration stopping rule...");
  const case8 = await createFreshRecoveryCase(merchant.id, customer.id, 1500);
  const decision8 = createMockDecision(merchant.id, customer.id, case8.id);
  const created8 = await aiDecisionService.createDecision(decision8 as any);

  // Set createdAt to 48 hours ago
  await prisma.aIDecision.update({
    where: { decisionId: created8.decisionId },
    data: { createdAt: new Date(Date.now() - 48 * 3600 * 1000) },
  });

  const runResult8 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case8.id,
    initialDecisionId: created8.decisionId,
  });

  assert(runResult8.stopReason === "DECISION_EXPIRED" || runResult8.finalState === "STOPPED", "Must stop on DECISION_EXPIRED");

  console.log("✓ Expired decision stopped autonomous execution");

  /**
   * ==========================================================
   * TEST 9: NO_PROGRESS DETECTION -> HUMAN REVIEW
   * ==========================================================
   */
  console.log("\n[TEST 9] Testing NO_PROGRESS detection (3 consecutive failed actions)...");
  const case9 = await createFreshRecoveryCase(merchant.id, customer.id, 4000);

  for (let i = 1; i <= 3; i++) {
    await actionRepository.create({
      merchantId: merchant.id,
      recoveryCaseId: case9.id,
      type: "SEND_WHATSAPP",
      status: "FAILED",
      attemptNumber: i,
      completedAt: new Date(Date.now() - (4 - i) * 600000),
      errorMessage: "Customer unreachable",
    });
  }

  const runResult9 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case9.id,
  });

  assert(runResult9.stopReason === "NO_PROGRESS" || runResult9.finalState === "HUMAN_REVIEW", "Must detect NO_PROGRESS");

  console.log("✓ NO_PROGRESS detected after repeated failures; escalated to human supervisor");

  /**
   * ==========================================================
   * TEST 10: REAL-TIME WEBHOOK EVENT REACTION
   * ==========================================================
   */
  console.log("\n[TEST 10] Testing real-time webhook event handling (payment.captured)...");
  const case10 = await createFreshRecoveryCase(merchant.id, customer.id, 2200);

  const webhookResult = await recoveryAgentService.handleWebhookEvent({
    eventType: "payment.captured",
    recoveryCaseId: case10.id,
    merchantId: merchant.id,
    amount: 2200,
    paymentStatus: "CAPTURED",
  });

  assert(webhookResult.handled === true, "Webhook event must be handled");
  const updatedCase10 = await prisma.recoveryCase.findUnique({ where: { id: case10.id } });
  assert(updatedCase10?.status === "RECOVERED", "Case status must update to RECOVERED");

  console.log("✓ Real-time payment.captured webhook processed and case marked RECOVERED");

  /**
   * ==========================================================
   * TEST 11: CONCURRENT AGENT RUNS PROTECTION
   * ==========================================================
   */
  console.log("\n[TEST 11] Testing concurrent agent runs suppression via lock...");
  const case11 = await createFreshRecoveryCase(merchant.id, customer.id, 3000);

  // Acquire lock manually to simulate active running process
  const lockKey = `agent_lock:${case11.id}`;
  await idempotencyService.acquireLock(lockKey, 30000);

  const concurrentRun = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case11.id,
  });

  assert(concurrentRun.stopReason === "DUPLICATE_EVENT", "Concurrent run must be suppressed with DUPLICATE_EVENT");
  await idempotencyService.releaseLock(lockKey);

  console.log("✓ Concurrent agent execution successfully locked and duplicate run suppressed");

  /**
   * ==========================================================
   * TEST 12: CANCELLED & STOPPED CASES
   * ==========================================================
   */
  console.log("\n[TEST 12] Testing cancelled / stopped case termination...");
  const case12 = await createFreshRecoveryCase(merchant.id, customer.id, 1800);
  await actionRepository.updateRecoveryCase(case12.id, { status: "STOPPED" });

  const runResult12 = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case12.id,
  });

  assert(runResult12.finalState === "STOPPED", "Final state must be STOPPED");
  assert(runResult12.stopReason === "CASE_STOPPED", "Stop reason must be CASE_STOPPED");

  console.log("✓ Explicitly stopped case halted agent immediately");

  /**
   * ==========================================================
   * TEST 13: ASYNC BULLMQ WORKER PROCESSING
   * ==========================================================
   */
  console.log("\n[TEST 13] Testing asynchronous BullMQ queue dispatch & worker execution...");
  const case13 = await createFreshRecoveryCase(merchant.id, customer.id, 3200);

  const enqueuedJob = await enqueueRecoveryAgentRun({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: case13.id,
    jobType: "START_AGENT",
  });

  console.log("✓ Enqueued agent job ID:", enqueuedJob.id);
  const { job: completedJob, state } = await waitForJobCompletion(enqueuedJob.id!);

  assert(state === "completed", "Agent job must reach completed state");
  const jobResult = completedJob.returnvalue;
  assert(jobResult.status === "COMPLETED", "Job return status must be COMPLETED");
  assert(jobResult.recovered === true, "Case must be recovered");

  console.log("✓ BullMQ recoveryAgentWorker processed job asynchronously to completion:", {
    jobId: completedJob.id,
    status: jobResult.status,
    finalState: jobResult.finalState,
  });

  /**
   * ==========================================================
   * TEST 14: DATABASE PERSISTENCE & AUDIT TRACEABILITY
   * ==========================================================
   */
  console.log("\n[TEST 14] Verifying RecoveryAgentRun records in PostgreSQL...");
  const agentRunsInDb = await agentRunRepository.findByRecoveryCaseId(case13.id);
  assert(agentRunsInDb.length >= 1, "RecoveryAgentRun record must exist in PostgreSQL");
  const savedRun = agentRunsInDb[0];
  assert(savedRun.merchantId === merchant.id, "merchantId must match");
  assert(savedRun.status === "COMPLETED", "status must be COMPLETED");
  assert(savedRun.currentState === "RECOVERED", "currentState must be RECOVERED");

  console.log("✓ PostgreSQL RecoveryAgentRun persistence validated:", {
    id: savedRun.id,
    agentRunId: savedRun.agentRunId,
    status: savedRun.status,
    currentState: savedRun.currentState,
    iteration: savedRun.iteration,
  });

  /**
   * ==========================================================
   * TEST 15: GOLDEN AUTONOMOUS RECOVERY LIFECYCLE
   * ==========================================================
   */
  console.log("\n[TEST 15] Executing the Full Golden Autonomous Recovery Lifecycle...");
  // Step A: Customer has failed payment
  const goldenCase = await createFreshRecoveryCase(merchant.id, customer.id, 5000);

  // Step B: Recovery Agent Starts
  console.log("  Step A -> Recovery case OPEN (Amount: 5000)");
  console.log("  Step B -> Autonomous agent initiated");

  const goldenRun = await recoveryAgentService.runAgent({
    merchantId: merchant.id,
    customerId: customer.id,
    recoveryCaseId: goldenCase.id,
    source: "WEBHOOK",
  });

  assert(goldenRun.recovered === true, "Golden run must achieve recovery");
  assert(goldenRun.finalState === "RECOVERED", "Golden run final state must be RECOVERED");

  // Step C: Verify updated database state
  const finalGoldenCase = await prisma.recoveryCase.findUnique({ where: { id: goldenCase.id } });
  assert(finalGoldenCase?.status === "RECOVERED", "Case status in DB must be RECOVERED");
  assert(Number(finalGoldenCase?.recoveredAmount) === 5000, "Recovered amount in DB must match 5000");

  console.log("  Step C -> M6 AI Decision evaluated");
  console.log("  Step D -> M7 Bounded action safely executed");
  console.log("  Step E -> M8 State Evaluator observed payment capture");
  console.log("  Step F -> Agent loop cleanly terminated with status RECOVERED");

  console.log("\n============================================================");
  console.log("M8 AUTOMATIC AGENT LOOP E2E TEST PASSED ✅");
  console.log("============================================================\n");

  await recoveryAgentQueue.close();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("\n❌ M8 E2E TEST FAILED:", error);
  try {
    await recoveryAgentQueue.close();
  } catch {}
  process.exit(1);
});
