/**
 * ============================================================
 * RevenueOS — M6.13 AI SAFETY POLICY
 * ============================================================
 */

import {
  AI_SAFETY_POLICY,
} from "./safety.config";

import type {
  AISafetyContext,
  AISafetyRuleResult,
} from "./safety.types";


function checkAmountLimit(
  context: AISafetyContext,
): AISafetyRuleResult {

  const amount =
    Math.max(
      context.currentFailedAmount,
      context.outstandingRecoveryAmount,
    );

  if (
    amount <=
    AI_SAFETY_POLICY
      .maximumAutomaticRecoveryAmount
  ) {

    return {
      code: "AMOUNT_LIMIT",
      passed: true,
      riskLevel: "LOW",
      message:
        "Recovery amount is within the automatic recovery limit.",
    };
  }

  return {
    code: "AMOUNT_LIMIT",
    passed: false,
    riskLevel: "HIGH",
    message:
      "Recovery amount exceeds the automatic recovery limit.",
  };
}


function checkAttemptLimit(
  context: AISafetyContext,
): AISafetyRuleResult {

  if (
    context.recoveryAttemptCount <
    AI_SAFETY_POLICY.maximumRecoveryAttempts
  ) {

    return {
      code: "ATTEMPT_LIMIT",
      passed: true,
      riskLevel: "LOW",
      message:
        "Recovery attempt count is within the allowed limit.",
    };
  }

  return {
    code: "ATTEMPT_LIMIT",
    passed: false,
    riskLevel: "HIGH",
    message:
      "Maximum automatic recovery attempts have been reached.",
  };
}


function checkCustomerOptOut(
  context: AISafetyContext,
): AISafetyRuleResult {

  if (
    !context.customerOptedOut
  ) {

    return {
      code: "CUSTOMER_OPT_OUT",
      passed: true,
      riskLevel: "LOW",
      message:
        "Customer has not opted out of recovery.",
    };
  }

  return {
    code: "CUSTOMER_OPT_OUT",
    passed: false,
    riskLevel: "CRITICAL",
    message:
      "Customer has opted out of recovery.",
  };
}


function checkAlreadyPaid(
  context: AISafetyContext,
): AISafetyRuleResult {

  if (
    !context.alreadyPaid
  ) {

    return {
      code: "ALREADY_PAID",
      passed: true,
      riskLevel: "LOW",
      message:
        "Payment has not already been completed.",
    };
  }

  return {
    code: "ALREADY_PAID",
    passed: false,
    riskLevel: "CRITICAL",
    message:
      "Customer has already paid the outstanding amount.",
  };
}


function checkRefund(
  context: AISafetyContext,
): AISafetyRuleResult {

  if (
    !context.refundDetected
  ) {

    return {
      code: "REFUND_DETECTED",
      passed: true,
      riskLevel: "LOW",
      message:
        "No refund condition has been detected.",
    };
  }

  return {
    code: "REFUND_DETECTED",
    passed: false,
    riskLevel: "CRITICAL",
    message:
      "Refund activity has been detected.",
  };
}


function checkCaseStopped(
  context: AISafetyContext,
): AISafetyRuleResult {

  if (
    !context.caseStopped
  ) {

    return {
      code: "CASE_STOPPED",
      passed: true,
      riskLevel: "LOW",
      message:
        "Recovery case is active.",
    };
  }

  return {
    code: "CASE_STOPPED",
    passed: false,
    riskLevel: "CRITICAL",
    message:
      "Recovery case has been stopped.",
  };
}


function checkConfidence(
  context: AISafetyContext,
): AISafetyRuleResult {

  if (
    context.confidence >=
    AI_SAFETY_POLICY.minimumConfidence
  ) {

    return {
      code: "LOW_CONFIDENCE",
      passed: true,
      riskLevel: "LOW",
      message:
        "AI decision confidence is sufficient for automatic recovery.",
    };
  }

  if (
    context.confidence >=
    AI_SAFETY_POLICY.humanReviewConfidence
  ) {

    return {
      code: "LOW_CONFIDENCE",
      passed: false,
      riskLevel: "MEDIUM",
      message:
        "AI decision confidence requires human review.",
    };
  }

  return {
    code: "LOW_CONFIDENCE",
    passed: false,
    riskLevel: "HIGH",
    message:
      "AI decision confidence is too low for recovery.",
  };
}


function checkActionAllowed(
  context: AISafetyContext,
): AISafetyRuleResult {

  if (
    !context.strategy
  ) {

    return {
      code: "ACTION_NOT_ALLOWED",
      passed: false,
      riskLevel: "CRITICAL",
      message:
        "No recovery strategy was provided.",
    };
  }

  if (
    AI_SAFETY_POLICY
      .blockedStrategies
      .includes(
        context.strategy as never,
      )
  ) {

    return {
      code: "ACTION_NOT_ALLOWED",
      passed: false,
      riskLevel: "CRITICAL",
      message:
        `Strategy ${context.strategy} is blocked by safety policy.`,
    };
  }

  if (
    !context.actionAllowed
  ) {

    return {
      code: "ACTION_NOT_ALLOWED",
      passed: false,
      riskLevel: "HIGH",
      message:
        `Strategy ${context.strategy} is not currently allowed.`,
    };
  }

  if (
    AI_SAFETY_POLICY
      .allowedStrategies
      .includes(
        context.strategy as never,
      )
  ) {

    return {
      code: "ACTION_NOT_ALLOWED",
      passed: true,
      riskLevel: "LOW",
      message:
        `Strategy ${context.strategy} is allowed by safety policy.`,
    };
  }

  return {
    code: "ACTION_NOT_ALLOWED",
    passed: false,
    riskLevel: "HIGH",
    message:
      `Strategy ${context.strategy} is not recognized by safety policy.`,
  };
}


export function evaluateSafetyRules(
  context: AISafetyContext,
): AISafetyRuleResult[] {

  return [
    checkAmountLimit(context),
    checkAttemptLimit(context),
    checkCustomerOptOut(context),
    checkAlreadyPaid(context),
    checkRefund(context),
    checkCaseStopped(context),
    checkConfidence(context),
    checkActionAllowed(context),
  ];
}