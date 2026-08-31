/**
 * ============================================================
 * M6.13 — AI SAFETY INTEGRATION TEST
 * ============================================================
 *
 * Tests:
 *
 * 1. Evaluate safety
 * 2. Create AI decision containing safety snapshot
 * 3. Record safety audit event
 * 4. Read decision
 * 5. Read audit history
 * 6. Verify safety information persisted
 *
 * NOTE:
 * This test requires valid merchant/customer IDs.
 * ============================================================
 */

import {
  aiSafetyService,
} from "./safety.service";

import {
  aiDecisionService,
} from "../decision/decision.service";

import {
  aiAuditService,
} from "../audit/audit.service";


async function main() {

  console.log("");
  console.log(
    "============================================================",
  );

  console.log(
    "RevenueOS M6.13 SAFETY INTEGRATION TEST",
  );

  console.log(
    "============================================================",
  );


  /**
   * ----------------------------------------------------------
   * IMPORTANT
   * ----------------------------------------------------------
   *
   * Replace these with existing valid database IDs.
   */

  const customerId =
    "cmtd8ioy20000ikveby5pbtco";

  const merchantId =
    "cmtbrquy60000q4vecj8hqtkw";

  const recoveryCaseId =
    null;


  /**
   * ----------------------------------------------------------
   * 1. Evaluate safety
   * ----------------------------------------------------------
   */

  const safety =
    aiSafetyService.evaluate({

      strategy:
        "RETRY_PAYMENT",

      confidence:
        0.90,

      currentFailedAmount:
        5000,

      outstandingRecoveryAmount:
        5000,

      recoveryAttemptCount:
        0,

      customerOptedOut:
        false,

      alreadyPaid:
        false,

      refundDetected:
        false,

      caseStopped:
        false,

      actionAllowed:
        true,
    });


  console.log("");
  console.log(
    "SAFETY RESULT",
  );

  console.log({
    decision:
      safety.decision,

    allowed:
      safety.allowed,

    riskLevel:
      safety.riskLevel,

    reason:
      safety.reason,

    blockingRules:
      safety.blockingRules.map(
        rule => rule.code,
      ),

    warnings:
      safety.warnings.map(
        rule => rule.code,
      ),
  });


  if (
    safety.decision !==
    "ALLOW"
  ) {

    throw new Error(
      "Safety integration test expected ALLOW",
    );
  }


  /**
   * ----------------------------------------------------------
   * 2. Create decision
   * ----------------------------------------------------------
   *
   * Minimal valid decision snapshot.
   */

  const decision =
    await aiDecisionService.createDecision({

      customerId,

      merchantId,

      recoveryCaseId,

      currency:
        "INR",

      probability:
        0.90,

      probabilityPercent:
        90,

      probabilityBand:
        "HIGH",

      probabilityConfidence:
        0.90,

      priorityScore:
        75,

      priorityBand:
        "HIGH",

      urgencyScore:
        80,

      opportunityScore:
        75,

      riskScore:
        20,

      amountScore:
        50,

      strategy:
        "RETRY_PAYMENT",

      channel:
        "PAYMENT_RETRY",

      timing:
        "IMMEDIATE",

      strategyScore:
        90,

      decisionConfidence:
        0.90,

      decisionReason:
        "Safety integration test decision.",

      modelVersions: {
        probability:
          "recovery-probability-v1",

        priority:
          "recovery-priority-v1",

        strategy:
          "recovery-strategy-v1",

        confidence:
          "confidence-fallback-v1",
      },

      inputFeatures: {},

      positiveSignals: [],

      negativeSignals: [],

      alternatives: [],

      /**
       * M6.13
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
          rule => rule.code,
        ),

      safetyWarnings:
        safety.warnings.map(
          rule => rule.code,
        ),

      safetyModelVersion:
        safety.modelVersion,

      safetyEvaluatedAt:
        safety.generatedAt,
    });


  console.log("");
  console.log(
    "AI DECISION CREATED",
  );

  console.log({
    decisionId:
      decision.decisionId,
  });


  /**
   * ----------------------------------------------------------
   * 3. Record safety audit event
   * ----------------------------------------------------------
   */

  await aiAuditService.recordSafety({

    decisionId:
      decision.decisionId,

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
        rule => rule.code,
      ),

    safetyWarnings:
      safety.warnings.map(
        rule => rule.code,
      ),

    safetyModelVersion:
      safety.modelVersion,

    strategy:
      "RETRY_PAYMENT",

    confidence:
      0.90,
  });


  console.log("");
  console.log(
    "SAFETY AUDIT RECORDED",
  );


  /**
   * ----------------------------------------------------------
   * 4. Read decision
   * ----------------------------------------------------------
   */

  const storedDecision =
    await aiDecisionService.getDecision(
      decision.decisionId,
    );


  if (!storedDecision) {

    throw new Error(
      "Stored AI decision could not be found.",
    );
  }


  /**
   * ----------------------------------------------------------
   * 5. Read audit history
   * ----------------------------------------------------------
   */

  const audit =
    await aiAuditService.getDecisionAudit(
      decision.decisionId,
    );


  const safetyAudit =
    audit.find(
      event =>
        event.eventType ===
        "SAFETY_EVALUATED",
    );


  if (!safetyAudit) {

    throw new Error(
      "SAFETY_EVALUATED audit event was not found.",
    );
  }


  /**
   * ----------------------------------------------------------
   * 6. Verify
   * ----------------------------------------------------------
   */

  const inputFeatures =
    storedDecision.inputFeatures as Record<
      string,
      unknown
    >;

  const safetySnapshot =
    inputFeatures.safety as Record<
      string,
      unknown
    >;


  if (
    safetySnapshot.decision !==
    "ALLOW"
  ) {

    throw new Error(
      "Safety decision was not persisted correctly.",
    );
  }


  if (
    safetySnapshot.allowed !==
    true
  ) {

    throw new Error(
      "Safety allowed flag was not persisted correctly.",
    );
  }


  console.log("");
  console.log(
    "============================================================",
  );

  console.log(
    "M6.13 SAFETY INTEGRATION TEST PASSED",
  );

  console.log(
    "============================================================",
  );

}


main().catch(
  error => {

    console.error("");

    console.error(
      "M6.13 SAFETY INTEGRATION TEST FAILED",
    );

    console.error(
      error,
    );

    process.exit(
      1,
    );
  },
);