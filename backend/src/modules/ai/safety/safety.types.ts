/**
 * ============================================================
 * RevenueOS — M6.13 AI SAFETY TYPES
 * ============================================================
 *
 * Domain types for the AI Safety / Policy Boundary.
 *
 * This module does NOT execute actions.
 *
 * It only determines whether a proposed AI decision
 * is safe and allowed to proceed to orchestration.
 * ============================================================
 */

export type AISafetyDecision =
  | "ALLOW"
  | "BLOCK"
  | "REQUIRE_HUMAN_REVIEW";

export type AISafetyRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type AISafetyRuleCode =
  | "AMOUNT_LIMIT"
  | "ATTEMPT_LIMIT"
  | "CUSTOMER_OPT_OUT"
  | "ALREADY_PAID"
  | "REFUND_DETECTED"
  | "CASE_STOPPED"
  | "LOW_CONFIDENCE"
  | "ACTION_NOT_ALLOWED"
  | "MISSING_CONTEXT"
  | "VALIDATION_ERROR";

export interface AISafetyContext {
  /**
   * AI decision information
   */
  decisionId?: string | null;

  strategy: string;

  confidence: number;

  /**
   * Financial context
   */
  currentFailedAmount: number;

  outstandingRecoveryAmount: number;

  /**
   * Recovery attempt context
   */
  recoveryAttemptCount: number;

  /**
   * Customer state
   */
  customerOptedOut: boolean;

  /**
   * Payment state
   */
  alreadyPaid: boolean;

  refundDetected: boolean;

  /**
   * Recovery case state
   */
  caseStopped: boolean;

  /**
   * Whether the proposed strategy is explicitly
   * permitted by the policy.
   */
  actionAllowed: boolean;
}

export interface AISafetyRuleResult {
  code: AISafetyRuleCode;

  passed: boolean;

  riskLevel: AISafetyRiskLevel;

  message: string;
}

export interface AISafetyResult {
  decision: AISafetyDecision;

  allowed: boolean;

  riskLevel: AISafetyRiskLevel;

  reason: string;

  rules: AISafetyRuleResult[];

  blockingRules: AISafetyRuleResult[];

  warnings: AISafetyRuleResult[];

  strategy: string;

  confidence: number;

  modelVersion: string;

  generatedAt: Date;
}