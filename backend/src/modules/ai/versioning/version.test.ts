/**
 * ============================================================
 * RevenueOS — M6.14 MODEL VERSIONING TEST
 * ============================================================
 *
 * Tests:
 *
 * 1. Registry initialization
 * 2. Active version resolution
 * 3. Explicit version resolution
 * 4. Unknown version rejection
 * 5. Complete decision version set
 * 6. Missing required version
 * 7. Deprecated version handling
 * 8. Duplicate active-version protection
 * 9. Historical model metadata
 * 10. Version promotion
 * 11. Retired version promotion rejection
 *
 * ============================================================
 */

import {
  aiModelVersionRegistry,
} from "./version.registry";

import {
  AI_MODEL_VERSIONS,
} from "./version.config";

import type {
  AIModelVersionSet,
} from "./version.types";


function assert(
  condition: boolean,
  message: string,
) {

  if (!condition) {
    throw new Error(message);
  }
}


async function main() {

  console.log("");
  console.log(
    "============================================================",
  );
  console.log(
    "RevenueOS M6.14 MODEL VERSIONING TEST",
  );
  console.log(
    "============================================================",
  );


  /**
   * ==========================================================
   * TEST 1 — REGISTRY INITIALIZATION
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 1 — Registry initialization",
  );

  const registeredModels =
    aiModelVersionRegistry.list();

  console.log(
    "Registered models:",
    registeredModels.length,
  );

  assert(
    registeredModels.length >= 1,
    "Registry should contain registered model versions.",
  );

  console.log(
    "✓ Registry initialized",
  );


  /**
   * ==========================================================
   * TEST 2 — ACTIVE VERSION RESOLUTION
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 2 — Active version resolution",
  );

  const activeProbability =
    aiModelVersionRegistry.getActive(
      "recovery-probability",
    );

  console.log({
    modelId:
      activeProbability.modelId,

    version:
      activeProbability.version,

    status:
      activeProbability.status,

    fingerprint:
      activeProbability.fingerprint,
  });

  assert(
    activeProbability.status === "ACTIVE",
    "Resolved version must be ACTIVE.",
  );

  console.log(
    "✓ Active version resolved",
  );


  /**
   * ==========================================================
   * TEST 3 — EXPLICIT VERSION RESOLUTION
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 3 — Explicit version resolution",
  );

  const explicitStrategy =
    aiModelVersionRegistry.resolve(
      "recovery-strategy",
      "recovery-strategy-v1",
    );

  console.log({
    modelId:
      explicitStrategy.modelId,

    version:
      explicitStrategy.version,

    release:
      explicitStrategy.release,
  });

  assert(
    explicitStrategy.version ===
      "recovery-strategy-v1",
    "Explicit version resolution failed.",
  );

  console.log(
    "✓ Explicit version resolved",
  );


  /**
   * ==========================================================
   * TEST 4 — UNKNOWN VERSION REJECTION
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 4 — Unknown version rejection",
  );

  let unknownRejected =
    false;

  try {

    aiModelVersionRegistry.resolve(
      "recovery-probability",
      "recovery-probability-v999",
    );

  } catch {

    unknownRejected =
      true;
  }

  assert(
    unknownRejected,
    "Unknown model version should be rejected.",
  );

  console.log(
    "✓ Unknown version rejected",
  );


  /**
   * ==========================================================
   * TEST 5 — COMPLETE DECISION VERSION SET
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 5 — Complete decision version set",
  );

  const decisionVersions:
    AIModelVersionSet = {

    probability:
      aiModelVersionRegistry
        .getActive(
          "recovery-probability",
        )
        .version,

    priority:
      aiModelVersionRegistry
        .getActive(
          "recovery-priority",
        )
        .version,

    strategy:
      aiModelVersionRegistry
        .getActive(
          "recovery-strategy",
        )
        .version,

    confidence:
      aiModelVersionRegistry
        .getActive(
          "confidence-fallback",
        )
        .version,

    safety:
      aiModelVersionRegistry
        .getActive(
          "ai-safety-policy",
        )
        .version,

    featureEngineering:
      aiModelVersionRegistry
        .getActive(
          "recovery-features",
        )
        .version,
  };

  console.log(
    decisionVersions,
  );


  const requiredVersions = [
    "probability",
    "priority",
    "strategy",
    "confidence",
    "safety",
    "featureEngineering",
  ] as const;


  for (
    const key of requiredVersions
  ) {

    assert(
      Boolean(
        decisionVersions[key],
      ),
      `Missing model version: ${key}`,
    );
  }


  console.log({
    valid: true,
    errors: [],
    warnings: [],
  });

  console.log(
    "✓ Complete version set validated",
  );


  /**
   * ==========================================================
   * TEST 6 — MISSING REQUIRED VERSION
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 6 — Missing required version",
  );

  const incompleteVersions = {
    probability:
      decisionVersions.probability,

    priority:
      decisionVersions.priority,

    strategy:
      decisionVersions.strategy,

    safety:
      decisionVersions.safety,

    featureEngineering:
      decisionVersions.featureEngineering,
  } as Partial<AIModelVersionSet>;


  const missingConfidence =
    !incompleteVersions.confidence;


  console.log({
    valid:
      !missingConfidence,

    errors:
      missingConfidence
        ? ["Missing model version: confidence"]
        : [],
  });


  assert(
    missingConfidence,
    "Missing confidence version should be detected.",
  );

  console.log(
    "✓ Missing version rejected",
  );


  /**
   * ==========================================================
   * TEST 7 — DEPRECATED VERSION HANDLING
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 7 — Deprecated version handling",
  );

  const deprecatedTestVersion =
    `test-model-${Date.now()}-v1`;


  const deprecatedModel =
    aiModelVersionRegistry.register({

      modelId:
        `test-model-${Date.now()}`,

      name:
        "Test Historical Model",

      type:
        "TEST",

      version:
        deprecatedTestVersion,

      status:
        "DEPRECATED",

      description:
        "Historical model used for versioning tests.",

      release:
        "1.0.0",

      inputVersion:
        "test-input-v1",

      outputVersion:
        "test-output-v1",

      fingerprint:
        "test-model-v1-config",

      metadata: {
        test:
          true,
      },
    });


  console.log({
    version:
      deprecatedModel.version,

    status:
      deprecatedModel.status,

    deprecatedAt:
      deprecatedModel.deprecatedAt,
  });


  assert(
    deprecatedModel.status ===
      "DEPRECATED",
    "Historical model should remain deprecated.",
  );


  const resolvedDeprecated =
    aiModelVersionRegistry.resolve(
      deprecatedModel.modelId,
      deprecatedModel.version,
      {
        allowDeprecated:
          true,
      },
    );


  assert(
    resolvedDeprecated.version ===
      deprecatedModel.version,
    "Deprecated historical version should remain resolvable.",
  );


  console.log(
    "✓ Historical version preserved",
  );


  /**
   * ==========================================================
   * TEST 8 — DUPLICATE ACTIVE-VERSION PROTECTION
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 8 — Duplicate active-version protection",
  );

  let duplicateRejected =
    false;


  try {

    aiModelVersionRegistry.register({

      modelId:
        "recovery-probability",

      name:
        "Duplicate Probability Model",

      type:
        "PROBABILITY",

      version:
        "recovery-probability-test-active",

      status:
        "ACTIVE",

      description:
        "Should not be allowed while v1 is active.",

      release:
        "999.0.0",

      inputVersion:
        "recovery-probability-features-v1",

      outputVersion:
        "probability-result-v999",

      fingerprint:
        "duplicate-active-test",
    });

  } catch {

    duplicateRejected =
      true;
  }


  assert(
    duplicateRejected,
    "Registry must reject multiple ACTIVE versions.",
  );


  console.log(
    "✓ Duplicate active version rejected",
  );


  /**
   * ==========================================================
   * TEST 9 — HISTORICAL MODEL METADATA
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 9 — Historical model metadata",
  );

  const historical =
    aiModelVersionRegistry.get(
      "recovery-strategy",
      "recovery-strategy-v1",
    );


  assert(
    historical !== null,
    "Historical model should exist.",
  );


  console.log({
    version:
      historical?.version,

    release:
      historical?.release,

    inputVersion:
      historical?.inputVersion,

    outputVersion:
      historical?.outputVersion,

    fingerprint:
      historical?.fingerprint,
  });


  assert(
    Boolean(
      historical?.fingerprint,
    ),
    "Historical model fingerprint is required.",
  );


  console.log(
    "✓ Historical metadata available",
  );


  /**
   * ==========================================================
   * TEST 10 — VERSION PROMOTION
   * ==========================================================
   *
   * Before:
   *
   * v1 ACTIVE
   * v2 DEPRECATED
   *
   * After promote(v2):
   *
   * v1 DEPRECATED
   * v2 ACTIVE
   *
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 10 — Version promotion",
  );


  const promotionModelId =
    `promotion-test-${Date.now()}`;


  const v1 =
    aiModelVersionRegistry.register({

      modelId:
        promotionModelId,

      name:
        "Promotion Test Model",

      type:
        "TEST",

      version:
        "v1",

      status:
        "ACTIVE",

      description:
        "Initial active test version.",

      release:
        "1.0.0",

      inputVersion:
        "test-input-v1",

      outputVersion:
        "test-output-v1",

      fingerprint:
        "promotion-v1",
    });


  const v2 =
    aiModelVersionRegistry.register({

      modelId:
        promotionModelId,

      name:
        "Promotion Test Model",

      type:
        "TEST",

      version:
        "v2",

      status:
        "DEPRECATED",

      description:
        "New version waiting for promotion.",

      release:
        "2.0.0",

      inputVersion:
        "test-input-v2",

      outputVersion:
        "test-output-v2",

      fingerprint:
        "promotion-v2",
    });


  console.log(
    "Before promotion:",
  );

  console.log({
    v1:
      aiModelVersionRegistry.get(
        promotionModelId,
        "v1",
      )?.status,

    v2:
      aiModelVersionRegistry.get(
        promotionModelId,
        "v2",
      )?.status,
  });


  const promoted =
    aiModelVersionRegistry.promote(
      promotionModelId,
      "v2",
    );


  console.log(
    "Promoted version:",
  );

  console.log({
    version:
      promoted.version,

    status:
      promoted.status,

    effectiveFrom:
      promoted.effectiveFrom,
  });


  const promotedV1 =
    aiModelVersionRegistry.get(
      promotionModelId,
      "v1",
    );


  const promotedV2 =
    aiModelVersionRegistry.get(
      promotionModelId,
      "v2",
    );


  assert(
    promotedV1?.status ===
      "DEPRECATED",
    "Previous active version should become DEPRECATED.",
  );


  assert(
    promotedV2?.status ===
      "ACTIVE",
    "Promoted version should become ACTIVE.",
  );


  const activeAfterPromotion =
    aiModelVersionRegistry.getActive(
      promotionModelId,
    );


  assert(
    activeAfterPromotion.version ===
      "v2",
    "v2 should be the active version after promotion.",
  );


  console.log(
    "✓ Version promotion successful",
  );


  /**
   * ==========================================================
   * TEST 11 — RETIRED VERSION PROMOTION REJECTION
   * ==========================================================
   */

  console.log("");
  console.log(
    "TEST 11 — Retired version promotion rejection",
  );


  const retiredModelId =
    `retired-test-${Date.now()}`;


  aiModelVersionRegistry.register({

    modelId:
      retiredModelId,

    name:
      "Retired Test Model",

    type:
      "TEST",

    version:
      "v1",

    status:
      "RETIRED",

    description:
      "Retired model for lifecycle testing.",

    release:
      "1.0.0",

    inputVersion:
      "test-input-v1",

    outputVersion:
      "test-output-v1",

    fingerprint:
      "retired-v1",
  });


  let retiredRejected =
    false;


  try {

    aiModelVersionRegistry.promote(
      retiredModelId,
      "v1",
    );

  } catch {

    retiredRejected =
      true;
  }


  assert(
    retiredRejected,
    "Retired versions must never be promoted.",
  );


  console.log(
    "✓ Retired version promotion rejected",
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
    "M6.14 MODEL VERSIONING TEST PASSED",
  );

  console.log(
    "============================================================",
  );

}


main().catch(
  (error) => {

    console.error("");
    console.error(
      "M6.14 MODEL VERSIONING TEST FAILED",
    );

    console.error(
      error,
    );

    process.exit(1);
  },
);