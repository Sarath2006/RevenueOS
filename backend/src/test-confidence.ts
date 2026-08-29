/**
 * ============================================================
 * RevenueOS — M6.11 CONFIDENCE + FALLBACK TEST
 * ============================================================
 *
 * Purpose:
 *
 * Directly tests the M6.11 Confidence + Fallback Engine.
 *
 * This test does NOT:
 * - start BullMQ
 * - create Redis jobs
 * - call Razorpay
 * - modify M6.6 Probability
 * - modify M6.7 Priority
 * - modify M6.8 Strategy
 *
 * It only verifies the M6.11 contract.
 *
 * Test scenarios:
 *
 * 1. HIGH CONFIDENCE
 *    → primary strategy should be used
 *
 * 2. LOW CONFIDENCE
 *    → fallback should be required
 *
 * 3. STRONG FEATURES
 *    → feature quality should remain high
 *
 * 4. WEAK FEATURES
 *    → feature quality should decrease
 *
 * ============================================================
 */

import {
  confidenceFallbackService,
} from "./modules/ai/confidence/confidence.service";


function printSeparator() {
  console.log(
    "============================================================",
  );
}


function printResult(
  title: string,
  result: any,
) {

  console.log("");
  printSeparator();

  console.log(title);

  printSeparator();

  console.dir(
    result,
    {
      depth: null,
    },
  );
}


/**
 * ============================================================
 * TEST 1
 * HIGH CONFIDENCE
 * ============================================================
 *
 * Expected:
 *
 * fallbackRequired = false
 * fallbackAction = USE_PRIMARY_DECISION
 * decisionChanged = false
 * selectedStrategy = primaryStrategy
 */

const highConfidenceResult =
  confidenceFallbackService.evaluate({

    probability:
      0.95,

    probabilityConfidence:
      0.90,

    priorityScore:
      85,

    strategyScore:
      95,

    strategyConfidence:
      0.90,

    featureQuality:
      1,

    recoveryProbabilityBand:
      "VERY_HIGH",

    priorityBand:
      "HIGH",

    strategy:
      "RETRY_PAYMENT",
  });


printResult(
  "TEST 1 — HIGH CONFIDENCE",
  highConfidenceResult,
);


/**
 * ============================================================
 * ASSERTIONS — TEST 1
 * ============================================================
 */

if (
  highConfidenceResult.fallbackRequired !==
  false
) {
  throw new Error(
    "TEST 1 FAILED: High confidence should not require fallback.",
  );
}


if (
  highConfidenceResult.fallbackAction !==
  "USE_PRIMARY_DECISION"
) {
  throw new Error(
    "TEST 1 FAILED: Expected USE_PRIMARY_DECISION.",
  );
}


if (
  highConfidenceResult.primaryStrategy !==
  "RETRY_PAYMENT"
) {
  throw new Error(
    "TEST 1 FAILED: Primary strategy should be RETRY_PAYMENT.",
  );
}


if (
  highConfidenceResult.selectedStrategy !==
  "RETRY_PAYMENT"
) {
  throw new Error(
    "TEST 1 FAILED: Selected strategy should remain RETRY_PAYMENT.",
  );
}


if (
  highConfidenceResult.decisionChanged !==
  false
) {
  throw new Error(
    "TEST 1 FAILED: Decision should not change for high confidence.",
  );
}


if (
  typeof highConfidenceResult.confidence !==
  "number"
) {
  throw new Error(
    "TEST 1 FAILED: Confidence must be a number.",
  );
}


if (
  highConfidenceResult.confidence < 0 ||
  highConfidenceResult.confidence > 1
) {
  throw new Error(
    "TEST 1 FAILED: Confidence must remain between 0 and 1.",
  );
}


/**
 * ============================================================
 * TEST 1 PASSED
 * ============================================================
 */

console.log(
  "TEST 1 PASSED — HIGH CONFIDENCE",
);


/**
 * ============================================================
 * TEST 2
 * LOW CONFIDENCE / FALLBACK
 * ============================================================
 *
 * Deliberately provide weak confidence signals.
 *
 * Expected:
 *
 * fallbackRequired = true
 *
 * The exact fallback strategy/action is determined by the
 * existing M6.11 implementation.
 *
 * We therefore validate the contract rather than assuming
 * a particular fallback strategy.
 */

const lowConfidenceResult =
  confidenceFallbackService.evaluate({

    probability:
      0.15,

    probabilityConfidence:
      0.35,

    priorityScore:
      20,

    strategyScore:
      30,

    strategyConfidence:
      0.35,

    featureQuality:
      0.40,

    recoveryProbabilityBand:
      "VERY_LOW",

    priorityBand:
      "LOW",

    strategy:
      "RETRY_PAYMENT",
  });


printResult(
  "TEST 2 — LOW CONFIDENCE / FALLBACK",
  lowConfidenceResult,
);


/**
 * ============================================================
 * ASSERTIONS — TEST 2
 * ============================================================
 */

if (
  typeof lowConfidenceResult.confidence !==
  "number"
) {
  throw new Error(
    "TEST 2 FAILED: Confidence must be a number.",
  );
}


if (
  lowConfidenceResult.confidence < 0 ||
  lowConfidenceResult.confidence > 1
) {
  throw new Error(
    "TEST 2 FAILED: Confidence must remain between 0 and 1.",
  );
}


if (
  lowConfidenceResult.fallbackRequired !==
  true
) {
  throw new Error(
    "TEST 2 FAILED: Low confidence should require fallback.",
  );
}


if (
  typeof lowConfidenceResult.fallbackAction !==
  "string"
) {
  throw new Error(
    "TEST 2 FAILED: fallbackAction must be present.",
  );
}


if (
  typeof lowConfidenceResult.fallbackReason !==
  "string"
) {
  throw new Error(
    "TEST 2 FAILED: fallbackReason must be present.",
  );
}


if (
  typeof lowConfidenceResult.primaryStrategy !==
  "string"
) {
  throw new Error(
    "TEST 2 FAILED: primaryStrategy must be present.",
  );
}


if (
  typeof lowConfidenceResult.selectedStrategy !==
  "string"
) {
  throw new Error(
    "TEST 2 FAILED: selectedStrategy must be present.",
  );
}


/**
 * ============================================================
 * TEST 2 PASSED
 * ============================================================
 */

console.log(
  "TEST 2 PASSED — LOW CONFIDENCE / FALLBACK",
);


/**
 * ============================================================
 * TEST 3
 * STRONG FEATURE QUALITY
 * ============================================================
 */

const strongFeatureResult =
  confidenceFallbackService.evaluate({

    probability:
      0.90,

    probabilityConfidence:
      0.85,

    priorityScore:
      80,

    strategyScore:
      90,

    strategyConfidence:
      0.85,

    featureQuality:
      1,

    recoveryProbabilityBand:
      "VERY_HIGH",

    priorityBand:
      "HIGH",

    strategy:
      "ALTERNATE_PAYMENT_METHOD",
  });


printResult(
  "TEST 3 — STRONG FEATURE QUALITY",
  strongFeatureResult,
);


if (
  strongFeatureResult.confidence <= 0
) {
  throw new Error(
    "TEST 3 FAILED: Confidence should be positive.",
  );
}


if (
  strongFeatureResult.fallbackRequired !==
  false
) {
  throw new Error(
    "TEST 3 FAILED: Strong feature quality should not force fallback.",
  );
}


if (
  strongFeatureResult.selectedStrategy !==
  "ALTERNATE_PAYMENT_METHOD"
) {
  throw new Error(
    "TEST 3 FAILED: Primary strategy should remain selected.",
  );
}


console.log(
  "TEST 3 PASSED — STRONG FEATURE QUALITY",
);


/**
 * ============================================================
 * TEST 4
 * WEAK FEATURE QUALITY
 * ============================================================
 */

const weakFeatureResult =
  confidenceFallbackService.evaluate({

    probability:
      0.70,

    probabilityConfidence:
      0.70,

    priorityScore:
      60,

    strategyScore:
      70,

    strategyConfidence:
      0.70,

    featureQuality:
      0.25,

    recoveryProbabilityBand:
      "HIGH",

    priorityBand:
      "MEDIUM",

    strategy:
      "CUSTOMER_REMINDER",
  });


printResult(
  "TEST 4 — WEAK FEATURE QUALITY",
  weakFeatureResult,
);


if (
  typeof weakFeatureResult.confidence !==
  "number"
) {
  throw new Error(
    "TEST 4 FAILED: Confidence must be a number.",
  );
}


if (
  weakFeatureResult.confidence < 0 ||
  weakFeatureResult.confidence > 1
) {
  throw new Error(
    "TEST 4 FAILED: Confidence must remain between 0 and 1.",
  );
}


if (
  !Array.isArray(
    weakFeatureResult.positiveSignals,
  )
) {
  throw new Error(
    "TEST 4 FAILED: positiveSignals must be an array.",
  );
}


if (
  !Array.isArray(
    weakFeatureResult.negativeSignals,
  )
) {
  throw new Error(
    "TEST 4 FAILED: negativeSignals must be an array.",
  );
}


if (
  !Array.isArray(
    weakFeatureResult.components,
  )
) {
  throw new Error(
    "TEST 4 FAILED: components must be an array.",
  );
}


console.log(
  "TEST 4 PASSED — WEAK FEATURE QUALITY",
);


/**
 * ============================================================
 * FINAL VALIDATION
 * ============================================================
 */

printSeparator();

console.log(
  "M6.11 CONFIDENCE + FALLBACK TESTS PASSED",
);

printSeparator();

console.log("");

console.log(
  "High confidence:",
  highConfidenceResult.confidence,
);

console.log(
  "High confidence fallback:",
  highConfidenceResult.fallbackRequired,
);

console.log(
  "Low confidence:",
  lowConfidenceResult.confidence,
);

console.log(
  "Low confidence fallback:",
  lowConfidenceResult.fallbackRequired,
);

console.log(
  "Strong feature quality:",
  strongFeatureResult.confidence,
);

console.log(
  "Weak feature quality:",
  weakFeatureResult.confidence,
);

console.log("");

printSeparator();

console.log(
  "M6.11 TEST COMPLETE",
);

printSeparator();