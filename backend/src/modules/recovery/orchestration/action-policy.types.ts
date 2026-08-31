/**
 * ============================================================
 * M7.2 — ACTION POLICY + BOUNDS TYPES
 * ============================================================
 *
 * Defines the authoritative policy boundaries for recovery
 * actions. The AI engine can recommend an action, but only
 * the Action Policy decides whether and when it can execute.
 * ============================================================
 */

import type { DecisionType, Channel, RecoveryCaseStatus } from "../../../generated/prisma/client";

export interface ActionPolicyLimits {
  /** Maximum number of payment retry attempts per recovery case */
  maxRetryAttempts: number;

  /** Maximum number of customer reminder attempts per recovery case */
  maxReminderAttempts: number;

  /** Maximum number of payment link generation attempts */
  maxPaymentLinkAttempts: number;

  /** Total maximum actions allowed across all types for a case */
  maxTotalActions: number;

  /** Minimum cooldown delay in milliseconds between retry attempts */
  minRetryIntervalMs: number;

  /** Minimum cooldown delay in milliseconds between customer reminders */
  minReminderIntervalMs: number;

  /** Maximum total lifespan of a recovery case in hours before auto-expiry */
  maxRecoveryDurationHours: number;

  /** Decision expiration time-to-live in milliseconds (default: 24h) */
  decisionTtlMs: number;

  /** Minimum confidence score required to auto-execute without human review */
  humanReviewConfidenceThreshold: number;

  /** Allowed strategies for automated execution */
  allowedStrategies: string[];

  /** Allowed communication channels */
  allowedChannels: Channel[];

  /** Allowed currencies for auto-recovery */
  allowedCurrencies: string[];

  /** Case statuses where actions are allowed to execute */
  allowedCaseStatuses: RecoveryCaseStatus[];
}

export interface ActionPolicyContext {
  decisionId: string;
  merchantId: string;
  customerId: string;
  recoveryCaseId: string;
  currency: string;
  strategy: string;
  channel?: string | null;
  timing?: string | null;
  confidence: number;
  safetyDecision?: string | null;
  safetyAllowed?: boolean | null;
  safetyRiskLevel?: string | null;
  decisionCreatedAt: Date;
  caseStatus: RecoveryCaseStatus;
  caseOpenedAt: Date;
  caseAmountAtRisk: number;
  caseRecoveredAmount: number;
  existingActions: {
    id: string;
    type: DecisionType;
    channel: Channel | null;
    status: string;
    attemptNumber: number;
    completedAt: Date | null;
    createdAt: Date;
  }[];
}

export type ActionPolicyDecision =
  | "ALLOW"
  | "BLOCK"
  | "SKIP"
  | "REQUIRE_HUMAN_REVIEW"
  | "DELAY";

export interface ActionPolicyResult {
  decision: ActionPolicyDecision;
  allowed: boolean;
  code: string;
  reason: string;
  recommendedDelayMs?: number;
  requiresHumanReview: boolean;
  blockingRule?: string;
  evaluatedAt: Date;
}

