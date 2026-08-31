/**
 * ============================================================
 * RevenueOS — M6.14 MODEL VERSION CONFIGURATION
 * ============================================================
 *
 * Central registry configuration.
 *
 * IMPORTANT:
 *
 * Existing AI engines already expose these versions:
 *
 * recovery-probability-v1
 * recovery-priority-v1
 * recovery-strategy-v1
 * confidence-fallback-v1
 * ai-safety-policy-v1
 *
 * M6.14 centralizes them.
 * ============================================================
 */

import type {
  RegisterModelVersionInput,
} from "./version.types";


export const AI_MODEL_VERSIONS:
  readonly RegisterModelVersionInput[] = [

  /**
   * ==========================================================
   * PROBABILITY
   * ==========================================================
   */

  {
    modelId:
      "recovery-probability",

    name:
      "Recovery Probability Engine",

    type:
      "PROBABILITY",

    version:
      "recovery-probability-v1",

    description:
      "Deterministic recovery probability model based on customer payment and recovery signals.",

    release:
      "1.0.0",

    inputVersion:
      "recovery-features-v1",

    outputVersion:
      "probability-result-v1",

    fingerprint:
      "recovery-probability-v1-config",

    status:
      "ACTIVE",

    metadata: {
      deterministic: true,
      productionReady: true,
      introducedIn: "M6.6",
    },
  },


  /**
   * ==========================================================
   * PRIORITY
   * ==========================================================
   */

  {
    modelId:
      "recovery-priority",

    name:
      "Recovery Priority Engine",

    type:
      "PRIORITY",

    version:
      "recovery-priority-v1",

    description:
      "Recovery opportunity prioritization based on probability, urgency, risk and financial exposure.",

    release:
      "1.0.0",

    inputVersion:
      "recovery-priority-features-v1",

    outputVersion:
      "priority-result-v1",

    fingerprint:
      "recovery-priority-v1-config",

    status:
      "ACTIVE",

    metadata: {
      deterministic: true,
      productionReady: true,
      introducedIn: "M6.7",
    },
  },


  /**
   * ==========================================================
   * STRATEGY
   * ==========================================================
   */

  {
    modelId:
      "recovery-strategy",

    name:
      "Recovery Strategy Engine",

    type:
      "STRATEGY",

    version:
      "recovery-strategy-v1",

    description:
      "Recovery strategy recommendation engine selecting the most appropriate recovery approach.",

    release:
      "1.0.0",

    inputVersion:
      "recovery-strategy-features-v1",

    outputVersion:
      "strategy-result-v1",

    fingerprint:
      "recovery-strategy-v1-config",

    status:
      "ACTIVE",

    metadata: {
      deterministic: true,
      productionReady: true,
      introducedIn: "M6.8",
    },
  },


  /**
   * ==========================================================
   * CONFIDENCE
   * ==========================================================
   */

  {
    modelId:
      "confidence-fallback",

    name:
      "Confidence and Fallback Engine",

    type:
      "CONFIDENCE",

    version:
      "confidence-fallback-v1",

    description:
      "Evaluates overall AI decision confidence and determines whether fallback is required.",

    release:
      "1.0.0",

    inputVersion:
      "ai-decision-components-v1",

    outputVersion:
      "confidence-result-v1",

    fingerprint:
      "confidence-fallback-v1-config",

    status:
      "ACTIVE",

    metadata: {
      deterministic: true,
      productionReady: true,
      introducedIn: "M6.11",
    },
  },


  /**
   * ==========================================================
   * SAFETY
   * ==========================================================
   */

  {
    modelId:
      "ai-safety-policy",

    name:
      "AI Safety Policy",

    type:
      "SAFETY",

    version:
      "ai-safety-policy-v1",

    description:
      "Safety and policy boundary preventing unsafe or unauthorized automatic recovery decisions.",

    release:
      "1.0.0",

    inputVersion:
      "ai-safety-context-v1",

    outputVersion:
      "ai-safety-result-v1",

    fingerprint:
      "ai-safety-policy-v1-config",

    status:
      "ACTIVE",

    metadata: {
      deterministic: true,
      enforcement: "blocking-boundary",
      productionReady: true,
      introducedIn: "M6.13",
    },
  },


  /**
   * ==========================================================
   * FEATURE ENGINEERING
   * ==========================================================
   */

  {
    modelId:
      "recovery-features",

    name:
      "Recovery Feature Engineering",

    type:
      "FEATURE_ENGINEERING",

    version:
      "recovery-features-v1",

    description:
      "Normalized customer and recovery features consumed by the AI decision engines.",

    release:
      "1.0.0",

    inputVersion:
      "customer-recovery-data-v1",

    outputVersion:
      "recovery-features-v1",

    fingerprint:
      "recovery-features-v1-config",

    status:
      "ACTIVE",

    metadata: {
      deterministic: true,
      productionReady: true,
      introducedIn: "M6.5",
    },
  },

] as const;