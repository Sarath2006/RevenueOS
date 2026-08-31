/**
 * ============================================================
 * RevenueOS — M6.13 AI SAFETY VALIDATOR
 * ============================================================
 *
 * Final safety boundary before orchestration.
 *
 * This function DOES NOT execute anything.
 *
 * It only returns:
 *
 * ALLOW
 * BLOCK
 * REQUIRE_HUMAN_REVIEW
 * ============================================================
 */

import {
  evaluateSafetyRules,
} from "./safety.policy";

import {
  AI_SAFETY_POLICY,
} from "./safety.config";

import type {
  AISafetyContext,
  AISafetyResult,
  AISafetyRuleResult,
} from "./safety.types";


function calculateRiskLevel(
  rules: AISafetyRuleResult[],
): AISafetyResult["riskLevel"] {

  if (
    rules.some(
      (rule) =>
        rule.riskLevel === "CRITICAL",
    )
  ) {
    return "CRITICAL";
  }

  if (
    rules.some(
      (rule) =>
        rule.riskLevel === "HIGH",
    )
  ) {
    return "HIGH";
  }

  if (
    rules.some(
      (rule) =>
        rule.riskLevel === "MEDIUM",
    )
  ) {
    return "MEDIUM";
  }

  return "LOW";
}


export function validateAISafety(
  context: AISafetyContext,
): AISafetyResult {

  const rules =
    evaluateSafetyRules(
      context,
    );

  const blockingRules =
    rules.filter(
      (rule) =>
        !rule.passed &&
        (
          rule.riskLevel === "CRITICAL" ||
          rule.riskLevel === "HIGH"
        ),
    );

  const warnings =
    rules.filter(
      (rule) =>
        !rule.passed &&
        rule.riskLevel === "MEDIUM",
    );

  let decision:
    AISafetyResult["decision"];

  if (
    blockingRules.length > 0
  ) {

    decision = "BLOCK";

  } else if (
    warnings.length > 0 ||
    context.confidence <
      AI_SAFETY_POLICY.minimumConfidence
  ) {

    decision =
      "REQUIRE_HUMAN_REVIEW";

  } else {

    decision = "ALLOW";
  }


  const riskLevel =
    calculateRiskLevel(
      rules,
    );


  let reason =
    "AI decision passed all safety policy checks.";

  if (
    decision === "BLOCK"
  ) {

    reason =
      blockingRules[0]?.message ??
      "AI decision blocked by safety policy.";

  } else if (
    decision ===
    "REQUIRE_HUMAN_REVIEW"
  ) {

    reason =
      warnings[0]?.message ??
      "AI decision requires human review.";
  }


  return {

    decision,

    allowed:
      decision === "ALLOW",

    riskLevel,

    reason,

    rules,

    blockingRules,

    warnings,

    strategy:
      context.strategy,

    confidence:
      context.confidence,

    modelVersion:
      AI_SAFETY_POLICY.version,

    generatedAt:
      new Date(),
  };
}