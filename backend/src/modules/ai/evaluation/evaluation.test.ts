/**
 * ============================================================
 * RevenueOS — M6.15 AI EVALUATION / OBSERVABILITY TEST
 * ============================================================
 *
 * Tests:
 *
 * 1. Good decision
 * 2. Pending outcome
 * 3. Poor prediction
 * 4. Invalid prediction
 * 5. Evaluation snapshot
 * 6. Audit-driven observability
 * 7. Fallback frequency
 * 8. Safety risk observability
 * 9. Model-version comparison
 * 10. Pipeline health
 * ============================================================
 */

import {
  aiEvaluationService,
} from "./evaluation.service";

import type {
  AIDecisionRecord,
} from "../decision/decision.types";

import type {
  AIAuditLogRecord,
} from "../audit/audit.types";


function createDecision(
  overrides: Partial<AIDecisionRecord> = {},
): AIDecisionRecord {

  return {

    id:
      "internal-id",

    decisionId:
      "decision-test",

    customerId:
      "customer-test",

    merchantId:
      "merchant-test",

    recoveryCaseId:
      null,

    currency:
      "INR",

    probability:
      0.90,

    probabilityPercent:
      90,

    probabilityBand:
      "HIGH",

    probabilityConfidence:
      0.95,

    priorityScore:
      80,

    priorityBand:
      "HIGH",

    urgencyScore:
      80,

    opportunityScore:
      80,

    riskScore:
      20,

    amountScore:
      80,

    strategy:
      "RETRY_PAYMENT",

    channel:
      "PAYMENT_LINK",

    timing:
      "IMMEDIATE",

    strategyScore:
      90,

    decisionConfidence:
      0.90,

    decisionStatus:
      "SUCCEEDED",

    decisionReason:
      "High recovery probability.",

    modelVersions: {

      probability:
        "recovery-probability-v1",

      priority:
        "recovery-priority-v1",

      strategy:
        "recovery-strategy-v1",

      confidence:
        "confidence-fallback-v1",

      safety:
        "ai-safety-policy-v1",

      featureEngineering:
        "recovery-features-v1",
    },

    inputFeatures: {

      customerAge:
        30,

      paymentHistory:
        10,

      safety: {

        decision:
          "ALLOW",

        allowed:
          true,

        riskLevel:
          "LOW",

        reason:
          "Passed safety policy.",

        blockingRules:
          [],

        warnings:
          [],

        modelVersion:
          "ai-safety-policy-v1",

        evaluatedAt:
          new Date(),
      },
    },

    positiveSignals: [
      "High recovery probability",
    ],

    negativeSignals: [],

    alternatives: [],

    outcome:
      "RECOVERED",

    outcomeAmount:
      5000,

    outcomeRecordedAt:
      new Date(),

    createdAt:
      new Date(),

    updatedAt:
      new Date(),

    ...overrides,
  };
}


/**
 * ============================================================
 * AUDIT FIXTURE
 * ============================================================
 */

function createAudit(
  overrides: Partial<AIAuditLogRecord> = {},
): AIAuditLogRecord {

  return {

    id:
      "audit-id",

    decisionId:
      "decision-good",

    merchantId:
      "merchant-test",

    customerId:
      "customer-test",

    recoveryCaseId:
      null,

    eventType:
      "AI_DECISION_COMPLETED",

    stage:
      "DECISION",

    status:
      "SUCCESS",

    strategy:
      "RETRY_PAYMENT",

    confidence:
      0.90,

    fallbackRequired:
      false,

    fallbackAction:
      "USE_PRIMARY_DECISION",

    fallbackReason:
      "HIGH_CONFIDENCE",

    modelVersions:
      null,

    metadata:
      {},

    createdAt:
      new Date(),

    ...overrides,
  };
}


async function main() {

  console.log("");

  console.log(
    "============================================================",
  );

  console.log(
    "RevenueOS M6.15 AI EVALUATION / OBSERVABILITY TEST",
  );

  console.log(
    "============================================================",
  );


  /**
   * ==========================================================
   * TEST 1 — GOOD DECISION
   * ==========================================================
   */

  const goodDecision =
    createDecision({

      decisionId:
        "decision-good",

      probability:
        0.90,

      probabilityPercent:
        90,

      outcome:
        "RECOVERED",

      outcomeAmount:
        5000,

      decisionConfidence:
        0.90,
    });


  const good =
    aiEvaluationService.evaluate(
      goodDecision,
    );


  console.log("");
  console.log(
    "TEST 1 — GOOD DECISION",
  );

  console.log(
    good,
  );


  if (
    good.status !==
    "EVALUATED"
  ) {

    throw new Error(
      "TEST 1 FAILED: Expected EVALUATED",
    );
  }


  if (
    good.quality !==
    "GOOD"
  ) {

    throw new Error(
      "TEST 1 FAILED: Expected GOOD",
    );
  }


  if (
    good.recovered !==
    true
  ) {

    throw new Error(
      "TEST 1 FAILED: Expected recovered=true",
    );
  }


  console.log(
    "✓ Good decision evaluated",
  );


  /**
   * ==========================================================
   * TEST 2 — PENDING OUTCOME
   * ==========================================================
   */

  const pendingDecision =
    createDecision({

      decisionId:
        "decision-pending",

      strategy:
        "CUSTOMER_REMINDER",

      probability:
        0.75,

      probabilityPercent:
        75,

      decisionConfidence:
        0.80,

      outcome:
        "PENDING",

      outcomeAmount:
        null,

      modelVersions: {

        probability:
          "recovery-probability-v1",

        strategy:
          "recovery-strategy-v1",
      },
    });


  const pending =
    aiEvaluationService.evaluate(
      pendingDecision,
    );


  console.log("");
  console.log(
    "TEST 2 — PENDING OUTCOME",
  );

  console.log(
    pending,
  );


  if (
    pending.status !==
    "PENDING_OUTCOME"
  ) {

    throw new Error(
      "TEST 2 FAILED: Expected PENDING_OUTCOME",
    );
  }


  if (
    pending.quality !==
    "UNKNOWN"
  ) {

    throw new Error(
      "TEST 2 FAILED: Expected UNKNOWN",
    );
  }


  console.log(
    "✓ Pending outcome handled",
  );


  /**
   * ==========================================================
   * TEST 3 — POOR PREDICTION
   * ==========================================================
   */

  const poorDecision =
    createDecision({

      decisionId:
        "decision-poor",

      probability:
        0.95,

      probabilityPercent:
        95,

      decisionConfidence:
        0.95,

      outcome:
        "NOT_RECOVERED",

      outcomeAmount:
        0,

      inputFeatures: {

        safety: {

          decision:
            "ALLOW",

          allowed:
            true,

          riskLevel:
            "MEDIUM",
        },
      },
    });


  const poor =
    aiEvaluationService.evaluate(
      poorDecision,
    );


  console.log("");
  console.log(
    "TEST 3 — POOR PREDICTION",
  );

  console.log(
    poor,
  );


  if (
    poor.status !==
    "EVALUATED"
  ) {

    throw new Error(
      "TEST 3 FAILED: Expected EVALUATED",
    );
  }


  if (
    poor.quality !==
    "POOR"
  ) {

    throw new Error(
      "TEST 3 FAILED: Expected POOR",
    );
  }


  if (
    poor.recovered !==
    false
  ) {

    throw new Error(
      "TEST 3 FAILED: Expected recovered=false",
    );
  }


  console.log(
    "✓ Poor prediction detected",
  );


  /**
   * ==========================================================
   * TEST 4 — INVALID PREDICTION
   * ==========================================================
   */

  const invalidDecision =
    createDecision({

      decisionId:
        "decision-invalid",

      probability:
        1.5,

      probabilityPercent:
        150,

      outcome:
        null,

      outcomeAmount:
        5000,

      modelVersions:
        {},
    });


  const invalid =
    aiEvaluationService.evaluate(
      invalidDecision,
    );


  console.log("");
  console.log(
    "TEST 4 — INVALID PREDICTION",
  );

  console.log(
    invalid,
  );


  if (
    invalid.status !==
    "INVALID"
  ) {

    throw new Error(
      "TEST 4 FAILED: Expected INVALID",
    );
  }


  console.log(
    "✓ Invalid prediction rejected",
  );


  /**
   * ==========================================================
   * TEST 5 — BASE SNAPSHOT
   * ==========================================================
   */

  const decisions = [

    goodDecision,

    pendingDecision,

    poorDecision,
  ];


  const baseSnapshot =
    aiEvaluationService.snapshot(
      decisions,
    );


  console.log("");
  console.log(
    "TEST 5 — BASE EVALUATION SNAPSHOT",
  );

  console.log(
    baseSnapshot,
  );


  if (
    baseSnapshot.decisionCount !==
    3
  ) {

    throw new Error(
      "TEST 5 FAILED: Expected 3 decisions",
    );
  }


  if (
    baseSnapshot.probability.evaluatedPredictions !==
    2
  ) {

    throw new Error(
      "TEST 5 FAILED: Expected 2 evaluated predictions",
    );
  }


  if (
    baseSnapshot.probability.pendingPredictions !==
    1
  ) {

    throw new Error(
      "TEST 5 FAILED: Expected 1 pending prediction",
    );
  }


  console.log(
    "✓ Base snapshot generated",
  );


  /**
   * ==========================================================
   * TEST 6 — AUDIT-DRIVEN OBSERVABILITY
   * ==========================================================
   */

  const auditLogs:
    AIAuditLogRecord[] = [

      createAudit({

        id:
          "audit-start",

        decisionId:
          "decision-good",

        eventType:
          "AI_DECISION_STARTED",

        stage:
          "PIPELINE",

        status:
          "STARTED",
      }),

      createAudit({

        id:
          "audit-probability",

        decisionId:
          "decision-good",

        eventType:
          "PROBABILITY_CALCULATED",

        stage:
          "PROBABILITY",

        status:
          "SUCCESS",

        modelVersions: {

          probability:
            "recovery-probability-v1",
        },
      }),

      createAudit({

        id:
          "audit-priority",

        decisionId:
          "decision-good",

        eventType:
          "PRIORITY_CALCULATED",

        stage:
          "PRIORITY",

        status:
          "SUCCESS",

        modelVersions: {

          priority:
            "recovery-priority-v1",
        },
      }),

      createAudit({

        id:
          "audit-strategy",

        decisionId:
          "decision-good",

        eventType:
          "STRATEGY_RECOMMENDED",

        stage:
          "STRATEGY",

        status:
          "SUCCESS",

        modelVersions: {

          strategy:
            "recovery-strategy-v1",
        },
      }),

      createAudit({

        id:
          "audit-confidence",

        decisionId:
          "decision-good",

        eventType:
          "CONFIDENCE_EVALUATED",

        stage:
          "CONFIDENCE",

        status:
          "SUCCESS",

        modelVersions: {

          confidence:
            "confidence-fallback-v1",
        },
      }),

      createAudit({

        id:
          "audit-fallback",

        decisionId:
          "decision-good",

        eventType:
          "FALLBACK_EVALUATED",

        stage:
          "FALLBACK",

        status:
          "SUCCESS",

        fallbackRequired:
          true,

        fallbackAction:
          "CUSTOMER_REMINDER",

        fallbackReason:
          "LOW_CONFIDENCE",
      }),

      createAudit({

        id:
          "audit-completed",

        decisionId:
          "decision-good",

        eventType:
          "AI_DECISION_COMPLETED",

        stage:
          "DECISION",

        status:
          "SUCCESS",
      }),
    ];


  const audit =
    aiEvaluationService
      .getAuditObservability(
        auditLogs,
      );


  console.log("");
  console.log(
    "TEST 6 — AUDIT OBSERVABILITY",
  );

  console.log(
    audit,
  );


  if (
    audit.totalEvents !==
    7
  ) {

    throw new Error(
      "TEST 6 FAILED: Expected 7 audit events",
    );
  }


  if (
    audit.successfulEvents !==
    6
  ) {

    throw new Error(
      "TEST 6 FAILED: Expected 6 successful events",
    );
  }


  if (
    audit.fallbackEvents !==
    1
  ) {

    throw new Error(
      "TEST 6 FAILED: Expected 1 fallback event",
    );
  }


  if (
    audit.fallbackRequiredEvents !==
    1
  ) {

    throw new Error(
      "TEST 6 FAILED: Expected 1 required fallback",
    );
  }


  if (
    audit.pipelineRuns !==
    1
  ) {

    throw new Error(
      "TEST 6 FAILED: Expected 1 pipeline run",
    );
  }


  if (
    audit.successfulPipelineRuns !==
    1
  ) {

    throw new Error(
      "TEST 6 FAILED: Expected 1 successful pipeline run",
    );
  }


  console.log(
    "✓ Audit-driven observability works",
  );


  /**
   * ==========================================================
   * TEST 7 — FAILED AUDIT PIPELINE
   * ==========================================================
   */

  const failedAuditLogs = [

    ...auditLogs,

    createAudit({

      id:
        "audit-failure",

      decisionId:
        "decision-failed",

      eventType:
        "AI_DECISION_FAILED",

      stage:
        "DECISION",

      status:
        "FAILED",

      metadata: {

        error:
          "Strategy execution unavailable",
      },
    }),
  ];


  const failedAudit =
    aiEvaluationService
      .getAuditObservability(
        failedAuditLogs,
      );


  console.log("");
  console.log(
    "TEST 7 — FAILED PIPELINE OBSERVABILITY",
  );

  console.log(
    failedAudit,
  );


  if (
    failedAudit.failedEvents !==
    1
  ) {

    throw new Error(
      "TEST 7 FAILED: Expected 1 failed event",
    );
  }


  if (
    failedAudit.decisionFailedEvents !==
    1
  ) {

    throw new Error(
      "TEST 7 FAILED: Expected 1 decision failure",
    );
  }


  if (
    failedAudit.failedStages.DECISION !==
    1
  ) {

    throw new Error(
      "TEST 7 FAILED: Expected DECISION failure count = 1",
    );
  }


  console.log(
    "✓ Failed pipeline detected",
  );


  /**
   * ==========================================================
   * TEST 8 — SAFETY RISK OBSERVABILITY
   * ==========================================================
   */

  const safetyDecisions = [

    createDecision({

      decisionId:
        "safety-low",

      outcome:
        "RECOVERED",

      inputFeatures: {

        safety: {

          decision:
            "ALLOW",

          allowed:
            true,

          riskLevel:
            "LOW",
        },
      },
    }),

    createDecision({

      decisionId:
        "safety-medium",

      outcome:
        "RECOVERED",

      inputFeatures: {

        safety: {

          decision:
            "ALLOW",

          allowed:
            true,

          riskLevel:
            "MEDIUM",
        },
      },
    }),

    createDecision({

      decisionId:
        "safety-high",

      outcome:
        "NOT_RECOVERED",

      inputFeatures: {

        safety: {

          decision:
            "BLOCK",

          allowed:
            false,

          riskLevel:
            "HIGH",
        },
      },
    }),

    createDecision({

      decisionId:
        "safety-critical",

      outcome:
        "NOT_RECOVERED",

      inputFeatures: {

        safety: {

          decision:
            "REQUIRE_HUMAN_REVIEW",

          allowed:
            false,

          riskLevel:
            "CRITICAL",
        },
      },
    }),
  ];


  const safety =
    aiEvaluationService
      .getSafetyObservability(
        safetyDecisions,
      );


  console.log("");
  console.log(
    "TEST 8 — SAFETY RISK OBSERVABILITY",
  );

  console.log(
    safety,
  );


  if (
    safety.totalEvaluated !==
    4
  ) {

    throw new Error(
      "TEST 8 FAILED: Expected 4 safety evaluations",
    );
  }


  if (
    safety.allowed !==
    2
  ) {

    throw new Error(
      "TEST 8 FAILED: Expected 2 allowed decisions",
    );
  }


  if (
    safety.blocked !==
    1
  ) {

    throw new Error(
      "TEST 8 FAILED: Expected 1 blocked decision",
    );
  }


  if (
    safety.humanReviewRequired !==
    1
  ) {

    throw new Error(
      "TEST 8 FAILED: Expected 1 human-review decision",
    );
  }


  if (
    safety.lowRiskCount !==
    1 ||
    safety.mediumRiskCount !==
    1 ||
    safety.highRiskCount !==
    1 ||
    safety.criticalRiskCount !==
    1
  ) {

    throw new Error(
      "TEST 8 FAILED: Safety risk counts are incorrect",
    );
  }


  console.log(
    "✓ Actual safety risk levels preserved",
  );


  /**
   * ==========================================================
   * TEST 9 — MODEL VERSION COMPARISON
   * ==========================================================
   */

  const modelV1Decision =
    createDecision({

      decisionId:
        "model-v1-good",

      probability:
        0.90,

      probabilityPercent:
        90,

      outcome:
        "RECOVERED",

      modelVersions: {

        probability:
          "recovery-probability-v1",
      },
    });


  const modelV2Decision =
    createDecision({

      decisionId:
        "model-v2-poor",

      probability:
        0.95,

      probabilityPercent:
        95,

      outcome:
        "NOT_RECOVERED",

      modelVersions: {

        probability:
          "recovery-probability-v2",
      },
    });


  const modelComparison =
    aiEvaluationService
      .compareModelVersions(
        [
          modelV1Decision,
          modelV2Decision,
        ],
      );


  console.log("");
  console.log(
    "TEST 9 — MODEL VERSION COMPARISON",
  );

  console.log(
    modelComparison,
  );


  const v1 =
    modelComparison.find(
      (model) =>
        model.version ===
        "recovery-probability-v1",
    );


  const v2 =
    modelComparison.find(
      (model) =>
        model.version ===
        "recovery-probability-v2",
    );


  if (!v1) {

    throw new Error(
      "TEST 9 FAILED: v1 comparison missing",
    );
  }


  if (!v2) {

    throw new Error(
      "TEST 9 FAILED: v2 comparison missing",
    );
  }


  if (
    v1.recoveryRate !==
    1
  ) {

    throw new Error(
      "TEST 9 FAILED: v1 recovery rate should be 1",
    );
  }


  if (
    v2.recoveryRate !==
    0
  ) {

    throw new Error(
      "TEST 9 FAILED: v2 recovery rate should be 0",
    );
  }


  if (
    v1.meanAbsoluteError ===
    null
  ) {

    throw new Error(
      "TEST 9 FAILED: v1 MAE missing",
    );
  }


  if (
    v2.meanAbsoluteError ===
    null
  ) {

    throw new Error(
      "TEST 9 FAILED: v2 MAE missing",
    );
  }


  console.log(
    "✓ Model-version comparison works",
  );


  /**
   * ==========================================================
   * TEST 10 — COMPLETE OBSERVABILITY SNAPSHOT
   * ==========================================================
   */

  const snapshot =
    aiEvaluationService.snapshot(
      [
        ...decisions,
        ...safetyDecisions,
        modelV1Decision,
        modelV2Decision,
      ],
      failedAuditLogs,
    );


  console.log("");
  console.log(
    "TEST 10 — COMPLETE OBSERVABILITY SNAPSHOT",
  );

  console.log(
    snapshot,
  );


  if (
    snapshot.audit.totalEvents !==
    failedAuditLogs.length
  ) {

    throw new Error(
      "TEST 10 FAILED: Audit snapshot mismatch",
    );
  }


  if (
    snapshot.safety.criticalRiskCount <
    1
  ) {

    throw new Error(
      "TEST 10 FAILED: Critical safety risk not observed",
    );
  }


  if (
    snapshot.modelVersions.length ===
    0
  ) {

    throw new Error(
      "TEST 10 FAILED: Model-version metrics missing",
    );
  }


  if (
    snapshot.pipeline.totalRuns !==
    failedAudit.pipelineRuns
  ) {

    throw new Error(
      "TEST 10 FAILED: Pipeline run count mismatch",
    );
  }


  console.log(
    "✓ Complete observability snapshot generated",
  );


  /**
   * ==========================================================
   * FINAL
   * ==========================================================
   */

  console.log("");

  console.log(
    "============================================================",
  );

  console.log(
    "M6.15 AI EVALUATION + OBSERVABILITY TEST PASSED",
  );

  console.log(
    "============================================================",
  );
}


main().catch(
  (error) => {

    console.error("");

    console.error(
      "M6.15 AI EVALUATION / OBSERVABILITY TEST FAILED",
    );

    console.error(
      error,
    );

    process.exit(
      1,
    );
  },
);