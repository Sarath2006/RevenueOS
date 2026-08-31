/**
 * ============================================================
 * RevenueOS — M6.13 AI SAFETY TEST
 * ============================================================
 */

import {
  aiSafetyService,
} from "./safety.service";


function printResult(
  name: string,
  result: ReturnType<
    typeof aiSafetyService.evaluate
  >,
) {

  console.log("");
  console.log(
    "------------------------------------------------------------",
  );

  console.log(
    name,
  );

  console.log(
    "------------------------------------------------------------",
  );

  console.log({
    decision:
      result.decision,

    allowed:
      result.allowed,

    riskLevel:
      result.riskLevel,

    strategy:
      result.strategy,

    confidence:
      result.confidence,

    reason:
      result.reason,

    blockingRules:
      result.blockingRules.map(
        (rule) => rule.code,
      ),

    warnings:
      result.warnings.map(
        (rule) => rule.code,
      ),
  });
}


async function main() {

  console.log("");
  console.log(
    "============================================================",
  );
  console.log(
    "RevenueOS M6.13 AI SAFETY / POLICY TEST",
  );
  console.log(
    "============================================================",
  );


  /**
   * ==========================================================
   * TEST 1 — SAFE DECISION
   * ==========================================================
   */

  const safe =
    aiSafetyService.evaluate({

      decisionId:
        "test-safe-decision",

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


  printResult(
    "TEST 1 — SAFE DECISION",
    safe,
  );


  if (
    safe.decision !==
    "ALLOW"
  ) {

    throw new Error(
      "TEST 1 FAILED: Expected ALLOW",
    );
  }


  /**
   * ==========================================================
   * TEST 2 — AMOUNT TOO HIGH
   * ==========================================================
   */

  const amountBlocked =
    aiSafetyService.evaluate({

      decisionId:
        "test-amount-block",

      strategy:
        "RETRY_PAYMENT",

      confidence:
        0.90,

      currentFailedAmount:
        150000,

      outstandingRecoveryAmount:
        150000,

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


  printResult(
    "TEST 2 — AMOUNT LIMIT",
    amountBlocked,
  );


  if (
    amountBlocked.decision !==
    "BLOCK"
  ) {

    throw new Error(
      "TEST 2 FAILED: Expected BLOCK",
    );
  }


  /**
   * ==========================================================
   * TEST 3 — TOO MANY ATTEMPTS
   * ==========================================================
   */

  const attemptsBlocked =
    aiSafetyService.evaluate({

      decisionId:
        "test-attempt-block",

      strategy:
        "RETRY_PAYMENT",

      confidence:
        0.90,

      currentFailedAmount:
        5000,

      outstandingRecoveryAmount:
        5000,

      recoveryAttemptCount:
        3,

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


  printResult(
    "TEST 3 — ATTEMPT LIMIT",
    attemptsBlocked,
  );


  if (
    attemptsBlocked.decision !==
    "BLOCK"
  ) {

    throw new Error(
      "TEST 3 FAILED: Expected BLOCK",
    );
  }


  /**
   * ==========================================================
   * TEST 4 — CUSTOMER OPTED OUT
   * ==========================================================
   */

  const optOutBlocked =
    aiSafetyService.evaluate({

      decisionId:
        "test-optout-block",

      strategy:
        "CUSTOMER_REMINDER",

      confidence:
        0.90,

      currentFailedAmount:
        5000,

      outstandingRecoveryAmount:
        5000,

      recoveryAttemptCount:
        0,

      customerOptedOut:
        true,

      alreadyPaid:
        false,

      refundDetected:
        false,

      caseStopped:
        false,

      actionAllowed:
        true,
    });


  printResult(
    "TEST 4 — CUSTOMER OPT OUT",
    optOutBlocked,
  );


  if (
    optOutBlocked.decision !==
    "BLOCK"
  ) {

    throw new Error(
      "TEST 4 FAILED: Expected BLOCK",
    );
  }


  /**
   * ==========================================================
   * TEST 5 — ALREADY PAID
   * ==========================================================
   */

  const paidBlocked =
    aiSafetyService.evaluate({

      decisionId:
        "test-paid-block",

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
        true,

      refundDetected:
        false,

      caseStopped:
        false,

      actionAllowed:
        true,
    });


  printResult(
    "TEST 5 — ALREADY PAID",
    paidBlocked,
  );


  if (
    paidBlocked.decision !==
    "BLOCK"
  ) {

    throw new Error(
      "TEST 5 FAILED: Expected BLOCK",
    );
  }


  /**
   * ==========================================================
   * TEST 6 — LOW CONFIDENCE
   * ==========================================================
   */

  const lowConfidence =
    aiSafetyService.evaluate({

      decisionId:
        "test-confidence-review",

      strategy:
        "RETRY_PAYMENT",

      confidence:
        0.60,

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


  printResult(
    "TEST 6 — LOW CONFIDENCE",
    lowConfidence,
  );


  if (
    lowConfidence.decision !==
    "REQUIRE_HUMAN_REVIEW"
  ) {

    throw new Error(
      "TEST 6 FAILED: Expected REQUIRE_HUMAN_REVIEW",
    );
  }


  /**
   * ==========================================================
   * TEST 7 — BLOCKED STRATEGY
   * ==========================================================
   */

  const strategyBlocked =
    aiSafetyService.evaluate({

      decisionId:
        "test-strategy-block",

      strategy:
        "REFUND",

      confidence:
        0.95,

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


  printResult(
    "TEST 7 — BLOCKED STRATEGY",
    strategyBlocked,
  );


  if (
    strategyBlocked.decision !==
    "BLOCK"
  ) {

    throw new Error(
      "TEST 7 FAILED: Expected BLOCK",
    );
  }


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
    "M6.13 AI SAFETY TEST PASSED",
  );

  console.log(
    "============================================================",
  );
}


main().catch(
  (error) => {

    console.error("");

    console.error(
      "M6.13 AI SAFETY TEST FAILED",
    );

    console.error(
      error,
    );

    process.exit(
      1,
    );
  },
);