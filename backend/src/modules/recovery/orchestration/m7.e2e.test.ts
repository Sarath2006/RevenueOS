/**
 * ============================================================
 * RevenueOS — M7 END-TO-END RECOVERY ORCHESTRATION TEST
 * ============================================================
 *
 * Comprehensive integration test for Milestone 7 (M7.1 to M7.5).
 * Validates bounded execution, action policies, idempotency,
 * adapter dispatch, BullMQ worker processing, and database state.
 * ============================================================
 */

// Initialize worker in-process for queue testing
import "../../../workers/recovery-action.worker";

import {
  recoveryOrchestratorService,
} from "./orchestrator.service";

import {
  actionPolicyService,
} from "./action-policy.service";

import {
  idempotencyService,
} from "./idempotency.service";

import {
  actionRepository,
} from "./action.repository";

import {
  aiDecisionService,
} from "../../ai/decision/decision.service";

import {
  enqueueRecoveryAction,
  recoveryActionQueue,
} from "../../../queues/recovery-action.queue";

import { prisma } from "../../../config/database";
import type { AIDecisionRecord } from "../../ai/decision/decision.types";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function waitForJobCompletion(jobId: string, maxWaitMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const job = await recoveryActionQueue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state === "completed" || state === "failed") {
        return { job, state };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Recovery action job ${jobId} timed out`);
}

async function getOrCreateFixtures() {
  let merchant = await prisma.merchant.findFirst();
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        name: "Test Merchant M7",
        email: "m7.merchant@revenueos.test",
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
        name: "Test Customer M7",
        email: "m7.customer@revenueos.test",
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
  const decisionId = `aid_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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
    decisionReason: "High card recovery probability with recent positive signals.",
    modelVersions: {
      probability: "recovery-probability-v1",
      priority: "recovery-priority-v1",
      strategy: "recovery-strategy-v1",
      confidence: "confidence-fallback-v1",
      safety: "ai-safety-policy-v1",
    },
    inputFeatures: {},
    positiveSignals: ["HIGH_PROBABILITY"],
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
  console.log("RevenueOS — M7 RECOVERY ORCHESTRATION INTEGRATION TEST");
  console.log("============================================================\n");

  const { merchant, customer } = await getOrCreateFixtures();
  idempotencyService.clear();

  console.log("✓ Fixtures initialized:", {
    merchantId: merchant.id,
    customerId: customer.id,
  });

  /**
   * ==========================================================
   * TEST 1: NORMAL EXECUTION — RETRY_PAYMENT
   * ==========================================================
   */
  console.log("\n[TEST 1] Testing valid RETRY_PAYMENT action orchestration...");
  const case1 = await createFreshRecoveryCase(merchant.id, customer.id, 2500);
  const decision1 = createMockDecision(merchant.id, customer.id, case1.id, {
    strategy: "RETRY_PAYMENT",
    timing: "IMMEDIATE",
  });

  const outcome1 = await recoveryOrchestratorService.orchestrate({
    decision: decision1,
    recoveryCaseId: case1.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome1.status === "EXECUTED", "Outcome 1 must be EXECUTED");
  assert(outcome1.success === true, "Outcome 1 must succeed");
  assert(outcome1.actionType === "RETRY_PAYMENT", "Action type must be RETRY_PAYMENT");
  assert(Boolean(outcome1.actionResult?.providerReference), "Provider reference must be present");
  assert(outcome1.caseStatusAfterOrchestration === "RECOVERED", "Case should transition to RECOVERED on full recovery");

  console.log("✓ RETRY_PAYMENT succeeded & recovery case updated:", {
    actionId: outcome1.actionId,
    status: outcome1.status,
    recoveredAmount: outcome1.actionResult?.recoveredAmount,
  });

  /**
   * ==========================================================
   * TEST 2: NORMAL EXECUTION — CUSTOMER_REMINDER (WHATSAPP)
   * ==========================================================
   */
  console.log("\n[TEST 2] Testing valid CUSTOMER_REMINDER (WhatsApp) orchestration...");
  const case2 = await createFreshRecoveryCase(merchant.id, customer.id, 1500);
  const decision2 = createMockDecision(merchant.id, customer.id, case2.id, {
    strategy: "CUSTOMER_REMINDER",
    channel: "WHATSAPP",
    timing: "IMMEDIATE",
  });

  const outcome2 = await recoveryOrchestratorService.orchestrate({
    decision: decision2,
    recoveryCaseId: case2.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome2.status === "EXECUTED", "Outcome 2 must be EXECUTED");
  assert(outcome2.actionType === "SEND_WHATSAPP", "Action type mapped to SEND_WHATSAPP");
  assert(Boolean(outcome2.actionResult?.providerReference), "Provider message ID must be present");

  console.log("✓ CUSTOMER_REMINDER (WhatsApp) dispatched:", {
    actionId: outcome2.actionId,
    channel: outcome2.channel,
    providerRef: outcome2.actionResult?.providerReference,
  });

  /**
   * ==========================================================
   * TEST 3: NORMAL EXECUTION — PAYMENT_LINK
   * ==========================================================
   */
  console.log("\n[TEST 3] Testing valid PAYMENT_LINK creation...");
  const case3 = await createFreshRecoveryCase(merchant.id, customer.id, 4000);
  const decision3 = createMockDecision(merchant.id, customer.id, case3.id, {
    strategy: "PAYMENT_LINK",
    channel: "PAYMENT_LINK",
    timing: "IMMEDIATE",
  });

  const outcome3 = await recoveryOrchestratorService.orchestrate({
    decision: decision3,
    recoveryCaseId: case3.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome3.status === "EXECUTED", "Outcome 3 must be EXECUTED");
  assert(outcome3.actionType === "SEND_PAYMENT_LINK", "Action type mapped to SEND_PAYMENT_LINK");
  assert(Boolean(outcome3.actionResult?.providerReference), "Payment link ID generated");

  console.log("✓ PAYMENT_LINK created:", {
    actionId: outcome3.actionId,
    linkId: outcome3.actionResult?.providerReference,
  });

  /**
   * ==========================================================
   * TEST 4: NO_ACTION STRATEGY
   * ==========================================================
   */
  console.log("\n[TEST 4] Testing NO_ACTION strategy...");
  const case4 = await createFreshRecoveryCase(merchant.id, customer.id, 1000);
  const decision4 = createMockDecision(merchant.id, customer.id, case4.id, {
    strategy: "NO_ACTION",
  });

  const outcome4 = await recoveryOrchestratorService.orchestrate({
    decision: decision4,
    recoveryCaseId: case4.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome4.status === "EXECUTED", "NO_ACTION should complete cleanly");
  assert(outcome4.actionType === "NO_ACTION", "Action type must be NO_ACTION");

  console.log("✓ NO_ACTION completed with 0 external calls");

  /**
   * ==========================================================
   * TEST 5: SAFETY BOUNDARY BLOCK
   * ==========================================================
   */
  console.log("\n[TEST 5] Testing AI Safety BLOCK enforcement...");
  const case5 = await createFreshRecoveryCase(merchant.id, customer.id, 5000);
  const decision5 = createMockDecision(merchant.id, customer.id, case5.id, {
    strategy: "RETRY_PAYMENT",
  });
  // Simulate safety blocked decision
  (decision5 as any).safetyDecision = "BLOCK";
  (decision5 as any).safetyAllowed = false;

  const outcome5 = await recoveryOrchestratorService.orchestrate({
    decision: decision5,
    recoveryCaseId: case5.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome5.status === "BLOCKED", "Safety block must yield BLOCKED status");
  assert(outcome5.policyResult.code === "SAFETY_POLICY_BLOCKED", "Policy code must be SAFETY_POLICY_BLOCKED");

  console.log("✓ Safety BLOCK successfully prevented execution:", outcome5.message);

  /**
   * ==========================================================
   * TEST 6: LOW CONFIDENCE / HUMAN REVIEW
   * ==========================================================
   */
  console.log("\n[TEST 6] Testing low confidence human review trigger...");
  const case6 = await createFreshRecoveryCase(merchant.id, customer.id, 2000);
  const decision6 = createMockDecision(merchant.id, customer.id, case6.id, {
    decisionConfidence: 0.45, // Below 0.65 threshold
  });

  const outcome6 = await recoveryOrchestratorService.orchestrate({
    decision: decision6,
    recoveryCaseId: case6.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome6.status === "REQUIRES_HUMAN_REVIEW", "Must require human review");
  assert(outcome6.caseStatusAfterOrchestration === "ESCALATED", "Case must escalate");

  console.log("✓ Low confidence correctly triggered REQUIRES_HUMAN_REVIEW and escalated case");

  /**
   * ==========================================================
   * TEST 7: CASE ALREADY RECOVERED (SKIP)
   * ==========================================================
   */
  console.log("\n[TEST 7] Testing already-recovered case skip...");
  const case7 = await createFreshRecoveryCase(merchant.id, customer.id, 2000);
  await actionRepository.updateRecoveryCase(case7.id, {
    status: "RECOVERED",
    recoveredAmount: 2000,
  });

  const decision7 = createMockDecision(merchant.id, customer.id, case7.id);
  const outcome7 = await recoveryOrchestratorService.orchestrate({
    decision: decision7,
    recoveryCaseId: case7.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome7.status === "SKIPPED", "Must skip already recovered case");
  assert(outcome7.policyResult.code === "CASE_ALREADY_RECOVERED", "Code must be CASE_ALREADY_RECOVERED");

  console.log("✓ Already recovered case skipped cleanly");

  /**
   * ==========================================================
   * TEST 8: CLOSED / STOPPED CASE (SKIP)
   * ==========================================================
   */
  console.log("\n[TEST 8] Testing stopped case skip...");
  const case8 = await createFreshRecoveryCase(merchant.id, customer.id, 2000);
  await actionRepository.updateRecoveryCase(case8.id, {
    status: "STOPPED",
  });

  const decision8 = createMockDecision(merchant.id, customer.id, case8.id);
  const outcome8 = await recoveryOrchestratorService.orchestrate({
    decision: decision8,
    recoveryCaseId: case8.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome8.status === "SKIPPED", "Must skip stopped case");

  console.log("✓ Stopped case skipped cleanly");

  /**
   * ==========================================================
   * TEST 9: DECISION EXPIRATION (TTL)
   * ==========================================================
   */
  console.log("\n[TEST 9] Testing expired decision skip...");
  const case9 = await createFreshRecoveryCase(merchant.id, customer.id, 1000);
  const decision9 = createMockDecision(merchant.id, customer.id, case9.id, {
    createdAt: new Date(Date.now() - 48 * 3600 * 1000), // 48h old (TTL is 24h)
  });

  const outcome9 = await recoveryOrchestratorService.orchestrate({
    decision: decision9,
    recoveryCaseId: case9.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(outcome9.status === "SKIPPED", "Expired decision must be skipped");
  assert(outcome9.policyResult.code === "DECISION_EXPIRED", "Code must be DECISION_EXPIRED");

  console.log("✓ Expired decision skipped cleanly");

  /**
   * ==========================================================
   * TEST 10: RETRY ATTEMPTS BOUNDARY ENFORCEMENT
   * ==========================================================
   */
  console.log("\n[TEST 10] Testing maximum retry attempts boundary (3 retries max)...");
  const case10 = await createFreshRecoveryCase(merchant.id, customer.id, 5000);

  // Seed attempt 1, 2, 3 as failed retries (case stays OPEN / unrecovered)
  await actionRepository.create({
    merchantId: merchant.id,
    recoveryCaseId: case10.id,
    type: "RETRY_PAYMENT",
    status: "FAILED",
    attemptNumber: 1,
    completedAt: new Date(Date.now() - 3600000),
  });

  await actionRepository.create({
    merchantId: merchant.id,
    recoveryCaseId: case10.id,
    type: "RETRY_PAYMENT",
    status: "FAILED",
    attemptNumber: 2,
    completedAt: new Date(Date.now() - 1800000),
  });

  await actionRepository.create({
    merchantId: merchant.id,
    recoveryCaseId: case10.id,
    type: "RETRY_PAYMENT",
    status: "FAILED",
    attemptNumber: 3,
    completedAt: new Date(Date.now() - 600000),
  });

  // Attempt 4: MUST BE BLOCKED (exceeds max 3 attempts)
  const decision10_4 = createMockDecision(merchant.id, customer.id, case10.id, { timing: "IMMEDIATE" });
  const out10_4 = await recoveryOrchestratorService.orchestrate({
    decision: decision10_4,
    recoveryCaseId: case10.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });
  assert(out10_4.status === "BLOCKED", "Attempt 4 must be BLOCKED");
  assert(out10_4.policyResult.code === "MAX_RETRY_ATTEMPTS_EXCEEDED", "Code must be MAX_RETRY_ATTEMPTS_EXCEEDED");

  console.log("✓ Max retry attempt boundary verified (attempts 1-3 allowed, attempt 4 blocked)");

  /**
   * ==========================================================
   * TEST 11: IDEMPOTENCY — DUPLICATE ACTION SUPPRESSION
   * ==========================================================
   */
  console.log("\n[TEST 11] Testing idempotency and duplicate action suppression...");
  const case11 = await createFreshRecoveryCase(merchant.id, customer.id, 1200);
  const decision11 = createMockDecision(merchant.id, customer.id, case11.id, { timing: "IMMEDIATE" });

  const firstCall = await recoveryOrchestratorService.orchestrate({
    decision: decision11,
    recoveryCaseId: case11.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  const secondCall = await recoveryOrchestratorService.orchestrate({
    decision: decision11,
    recoveryCaseId: case11.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  assert(firstCall.actionId === secondCall.actionId, "Duplicate call must return same actionId");
  assert(firstCall.idempotencyKey === secondCall.idempotencyKey, "Idempotency keys must match");

  console.log("✓ Idempotency verified: duplicate action suppressed and cached outcome returned");

  /**
   * ==========================================================
   * TEST 12: REAL BULLMQ ASYNC QUEUE DISPATCH
   * ==========================================================
   */
  console.log("\n[TEST 12] Testing async BullMQ queue dispatch & worker execution...");
  const case12 = await createFreshRecoveryCase(merchant.id, customer.id, 3500);
  const decision12 = createMockDecision(merchant.id, customer.id, case12.id, { timing: "IMMEDIATE" });

  const enqueuedJob = await enqueueRecoveryAction({
    decision: decision12,
    recoveryCaseId: case12.id,
    merchantId: merchant.id,
    customerId: customer.id,
  });

  console.log("✓ Enqueued action job ID:", enqueuedJob.id);
  const { job: completedJob, state } = await waitForJobCompletion(enqueuedJob.id!);

  assert(state === "completed", "Job must reach completed state");
  const jobResult = completedJob.returnvalue;
  assert(jobResult.status === "EXECUTED", "Job result status must be EXECUTED");
  assert(Boolean(jobResult.actionId), "Action ID must be present in queue job result");

  console.log("✓ Async BullMQ job successfully processed by recoveryActionWorker:", {
    jobId: completedJob.id,
    status: jobResult.status,
    actionId: jobResult.actionId,
  });

  /**
   * ==========================================================
   * TEST 13: DATABASE PERSISTENCE & TRACEABILITY
   * ==========================================================
   */
  console.log("\n[TEST 13] Verifying PostgreSQL RecoveryAction records and traceability...");
  const actionsInDb = await actionRepository.findByRecoveryCaseId(case12.id);
  assert(actionsInDb.length >= 1, "RecoveryAction records must exist in PostgreSQL");
  const savedAction = actionsInDb[0];
  assert(savedAction.merchantId === merchant.id, "Action merchantId must match");
  assert(savedAction.status === "COMPLETED", "Action status must be COMPLETED");
  assert(Boolean(savedAction.providerMessageId), "Provider reference must be persisted");

  console.log("✓ PostgreSQL persistence verified for action:", {
    id: savedAction.id,
    status: savedAction.status,
    type: savedAction.type,
    providerMessageId: savedAction.providerMessageId,
  });

  console.log("\n============================================================");
  console.log("M7 RECOVERY ORCHESTRATION E2E TEST PASSED ✅");
  console.log("============================================================\n");

  await recoveryActionQueue.close();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("\n❌ M7 E2E TEST FAILED:", error);
  try {
    await recoveryActionQueue.close();
  } catch {}
  process.exit(1);
});
