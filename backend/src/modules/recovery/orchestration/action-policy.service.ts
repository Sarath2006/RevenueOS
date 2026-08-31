/**
 * ============================================================
 * M7.2 — ACTION POLICY + BOUNDS SERVICE
 * ============================================================
 *
 * Authoritative boundary evaluator for RevenueOS recovery actions.
 *
 * Critical Rule:
 * The AI engine can recommend an action, but only ActionPolicyService
 * decides whether and when it is legally/operationally allowed to execute.
 * ============================================================
 */

import {
  ActionPolicyLimits,
  ActionPolicyContext,
  ActionPolicyResult,
} from "./action-policy.types";

export const DEFAULT_ACTION_POLICY_LIMITS: ActionPolicyLimits = {
  maxRetryAttempts: 3,
  maxReminderAttempts: 3,
  maxPaymentLinkAttempts: 3,
  maxTotalActions: 9,
  minRetryIntervalMs: 15 * 60 * 1000, // 15 minutes default cooldown
  minReminderIntervalMs: 60 * 60 * 1000, // 1 hour default cooldown
  maxRecoveryDurationHours: 720, // 30 days
  decisionTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  humanReviewConfidenceThreshold: 0.65,
  allowedStrategies: [
    "RETRY_PAYMENT",
    "CUSTOMER_REMINDER",
    "PAYMENT_LINK",
    "SEND_PAYMENT_LINK",
    "SEND_EMAIL",
    "SEND_SMS",
    "SEND_WHATSAPP",
    "ALTERNATE_PAYMENT_METHOD",
    "NO_ACTION",
    "WAIT",
    "STOP",
  ],
  allowedChannels: [
    "WHATSAPP",
    "SMS",
    "EMAIL",
    "VOICE",
    "HINGLISH_VOICE",
    "DASHBOARD",
  ],
  allowedCurrencies: [
    "INR",
    "USD",
    "EUR",
    "GBP",
    "SGD",
    "AED",
  ],
  allowedCaseStatuses: [
    "OPEN",
    "ANALYZING",
    "ACTION_PENDING",
    "IN_PROGRESS",
  ],
};

export class ActionPolicyService {
  private limits: ActionPolicyLimits;

  constructor(customLimits?: Partial<ActionPolicyLimits>) {
    this.limits = {
      ...DEFAULT_ACTION_POLICY_LIMITS,
      ...customLimits,
    };
  }

  /**
   * Update operational limits dynamically if needed.
   */
  public updateLimits(newLimits: Partial<ActionPolicyLimits>): void {
    this.limits = {
      ...this.limits,
      ...newLimits,
    };
  }

  /**
   * Get current active limits.
   */
  public getLimits(): ActionPolicyLimits {
    return { ...this.limits };
  }

  /**
   * Evaluate whether an action recommendation can safely be executed.
   */
  public evaluate(context: ActionPolicyContext): ActionPolicyResult {
    const now = Date.now();
    const evaluatedAt = new Date(now);

    // 1. Check AI Safety Policy outcome
    if (context.safetyDecision === "BLOCK" || context.safetyAllowed === false) {
      return {
        decision: "BLOCK",
        allowed: false,
        code: "SAFETY_POLICY_BLOCKED",
        reason: "Blocked by AI Safety boundary check.",
        requiresHumanReview: false,
        blockingRule: "AI_SAFETY_POLICY",
        evaluatedAt,
      };
    }

    if (context.safetyDecision === "REQUIRE_HUMAN_REVIEW") {
      return {
        decision: "REQUIRE_HUMAN_REVIEW",
        allowed: false,
        code: "SAFETY_HUMAN_REVIEW_REQUIRED",
        reason: "AI Safety requires human supervisor review before action.",
        requiresHumanReview: true,
        blockingRule: "SAFETY_HUMAN_REVIEW",
        evaluatedAt,
      };
    }

    // 2. Check Confidence Score Threshold
    if (context.confidence < this.limits.humanReviewConfidenceThreshold) {
      return {
        decision: "REQUIRE_HUMAN_REVIEW",
        allowed: false,
        code: "LOW_CONFIDENCE_HUMAN_REVIEW",
        reason: `Confidence score (${context.confidence}) is below threshold (${this.limits.humanReviewConfidenceThreshold}).`,
        requiresHumanReview: true,
        blockingRule: "CONFIDENCE_THRESHOLD",
        evaluatedAt,
      };
    }

    // 3. Check Decision Freshness (TTL)
    const decisionAgeMs = now - new Date(context.decisionCreatedAt).getTime();
    if (decisionAgeMs > this.limits.decisionTtlMs) {
      return {
        decision: "SKIP",
        allowed: false,
        code: "DECISION_EXPIRED",
        reason: `AI decision expired (${Math.round(decisionAgeMs / 3600000)}h old, TTL is ${this.limits.decisionTtlMs / 3600000}h).`,
        requiresHumanReview: false,
        blockingRule: "DECISION_TTL",
        evaluatedAt,
      };
    }

    // 4. Check Recovery Case Lifecycle Status
    if (context.caseStatus === "RECOVERED" || context.caseRecoveredAmount >= context.caseAmountAtRisk) {
      return {
        decision: "SKIP",
        allowed: false,
        code: "CASE_ALREADY_RECOVERED",
        reason: "Recovery case has already been successfully recovered.",
        requiresHumanReview: false,
        blockingRule: "ALREADY_RECOVERED",
        evaluatedAt,
      };
    }

    if (context.caseStatus === "STOPPED") {
      return {
        decision: "SKIP",
        allowed: false,
        code: "CASE_STOPPED",
        reason: "Recovery case was explicitly stopped.",
        requiresHumanReview: false,
        blockingRule: "CASE_TERMINATED",
        evaluatedAt,
      };
    }

    if (context.caseStatus === "EXPIRED") {
      return {
        decision: "SKIP",
        allowed: false,
        code: "CASE_EXPIRED",
        reason: "Recovery case has expired.",
        requiresHumanReview: false,
        blockingRule: "CASE_EXPIRED",
        evaluatedAt,
      };
    }

    if (!this.limits.allowedCaseStatuses.includes(context.caseStatus)) {
      return {
        decision: "SKIP",
        allowed: false,
        code: "CASE_STATUS_NOT_ACTIONABLE",
        reason: `Recovery case status '${context.caseStatus}' is not in actionable statuses.`,
        requiresHumanReview: false,
        blockingRule: "CASE_STATUS",
        evaluatedAt,
      };
    }

    // 5. Check Case Maximum Duration
    const caseAgeMs = now - new Date(context.caseOpenedAt).getTime();
    const maxDurationMs = this.limits.maxRecoveryDurationHours * 3600 * 1000;
    if (caseAgeMs > maxDurationMs) {
      return {
        decision: "SKIP",
        allowed: false,
        code: "CASE_DURATION_EXCEEDED",
        reason: `Case lifespan exceeded maximum allowed recovery duration of ${this.limits.maxRecoveryDurationHours} hours.`,
        requiresHumanReview: false,
        blockingRule: "MAX_DURATION",
        evaluatedAt,
      };
    }

    // 6. Check Allowed Currencies
    if (context.currency && !this.limits.allowedCurrencies.includes(context.currency.toUpperCase())) {
      return {
        decision: "BLOCK",
        allowed: false,
        code: "UNSUPPORTED_CURRENCY",
        reason: `Currency '${context.currency}' is not supported for automated recovery.`,
        requiresHumanReview: false,
        blockingRule: "CURRENCY_UNSUPPORTED",
        evaluatedAt,
      };
    }

    // 7. Check Strategy Support
    const strategyUpper = (context.strategy || "").toUpperCase();

    // No-action is safe and always allowed
    if (strategyUpper === "NO_ACTION" || strategyUpper === "WAIT" || strategyUpper === "STOP") {
      return {
        decision: "ALLOW",
        allowed: true,
        code: "NO_ACTION_PERMITTED",
        reason: `Strategy '${strategyUpper}' requires no external recovery dispatch.`,
        requiresHumanReview: false,
        evaluatedAt,
      };
    }

    if (!this.limits.allowedStrategies.includes(strategyUpper)) {
      return {
        decision: "BLOCK",
        allowed: false,
        code: "UNSUPPORTED_STRATEGY",
        reason: `Strategy '${context.strategy}' is not allowed by action policy.`,
        requiresHumanReview: false,
        blockingRule: "STRATEGY_UNSUPPORTED",
        evaluatedAt,
      };
    }

    // 8. Check Total Actions Cap on Case
    if (context.existingActions.length >= this.limits.maxTotalActions) {
      return {
        decision: "BLOCK",
        allowed: false,
        code: "MAX_TOTAL_ACTIONS_EXCEEDED",
        reason: `Maximum total actions (${this.limits.maxTotalActions}) exceeded for recovery case.`,
        requiresHumanReview: true,
        blockingRule: "MAX_TOTAL_ACTIONS",
        evaluatedAt,
      };
    }

    // 9. Evaluate Specific Action Boundaries
    if (strategyUpper === "RETRY_PAYMENT" || strategyUpper === "ALTERNATE_PAYMENT_METHOD") {
      return this.evaluatePaymentRetry(context, now, evaluatedAt);
    }

    if (
      strategyUpper === "CUSTOMER_REMINDER" ||
      strategyUpper === "SEND_WHATSAPP" ||
      strategyUpper === "SEND_SMS" ||
      strategyUpper === "SEND_EMAIL"
    ) {
      return this.evaluateCustomerReminder(context, now, evaluatedAt);
    }

    if (strategyUpper === "PAYMENT_LINK" || strategyUpper === "SEND_PAYMENT_LINK") {
      return this.evaluatePaymentLink(context, now, evaluatedAt);
    }

    // Fallback default allowed
    return {
      decision: "ALLOW",
      allowed: true,
      code: "ACTION_PERMITTED",
      reason: "Action passed all policy boundary checks.",
      requiresHumanReview: false,
      evaluatedAt,
    };
  }

  private evaluatePaymentRetry(
    context: ActionPolicyContext,
    now: number,
    evaluatedAt: Date,
  ): ActionPolicyResult {
    const retryActions = context.existingActions.filter(
      (a) => a.type === "RETRY_PAYMENT" || a.type === "OFFER_ALTERNATIVE_PAYMENT",
    );

    if (retryActions.length >= this.limits.maxRetryAttempts) {
      return {
        decision: "BLOCK",
        allowed: false,
        code: "MAX_RETRY_ATTEMPTS_EXCEEDED",
        reason: `Payment retry limit reached (${retryActions.length}/${this.limits.maxRetryAttempts} attempts used).`,
        requiresHumanReview: true,
        blockingRule: "MAX_RETRIES",
        evaluatedAt,
      };
    }

    // Cooldown check between retries (unless timing is explicitly IMMEDIATE)
    const isImmediate = (context.timing || "").toUpperCase() === "IMMEDIATE";
    if (!isImmediate && retryActions.length > 0) {
      const lastRetry = retryActions[retryActions.length - 1];
      const lastTime = lastRetry.completedAt
        ? new Date(lastRetry.completedAt).getTime()
        : new Date(lastRetry.createdAt).getTime();

      const timeSinceLastRetry = now - lastTime;
      if (timeSinceLastRetry < this.limits.minRetryIntervalMs) {
        const remainingMs = this.limits.minRetryIntervalMs - timeSinceLastRetry;
        return {
          decision: "DELAY",
          allowed: false,
          code: "RETRY_COOLDOWN_ACTIVE",
          reason: `Retry cooldown active. Must wait ${Math.ceil(remainingMs / 60000)} more minutes.`,
          recommendedDelayMs: remainingMs,
          requiresHumanReview: false,
          blockingRule: "RETRY_COOLDOWN",
          evaluatedAt,
        };
      }
    }

    return {
      decision: "ALLOW",
      allowed: true,
      code: "PAYMENT_RETRY_PERMITTED",
      reason: `Payment retry attempt #${retryActions.length + 1} is permitted.`,
      requiresHumanReview: false,
      evaluatedAt,
    };
  }

  private evaluateCustomerReminder(
    context: ActionPolicyContext,
    now: number,
    evaluatedAt: Date,
  ): ActionPolicyResult {
    const reminderActions = context.existingActions.filter(
      (a) =>
        a.type === "SEND_EMAIL" ||
        a.type === "SEND_SMS" ||
        a.type === "SEND_WHATSAPP" ||
        a.type === "VOICE_CALL" ||
        a.type === "HINGLISH_VOICE",
    );

    if (reminderActions.length >= this.limits.maxReminderAttempts) {
      return {
        decision: "BLOCK",
        allowed: false,
        code: "MAX_REMINDER_ATTEMPTS_EXCEEDED",
        reason: `Customer reminder limit reached (${reminderActions.length}/${this.limits.maxReminderAttempts} attempts used).`,
        requiresHumanReview: true,
        blockingRule: "MAX_REMINDERS",
        evaluatedAt,
      };
    }

    const isImmediate = (context.timing || "").toUpperCase() === "IMMEDIATE";
    if (!isImmediate && reminderActions.length > 0) {
      const lastReminder = reminderActions[reminderActions.length - 1];
      const lastTime = lastReminder.completedAt
        ? new Date(lastReminder.completedAt).getTime()
        : new Date(lastReminder.createdAt).getTime();

      const timeSinceLastReminder = now - lastTime;
      if (timeSinceLastReminder < this.limits.minReminderIntervalMs) {
        const remainingMs = this.limits.minReminderIntervalMs - timeSinceLastReminder;
        return {
          decision: "DELAY",
          allowed: false,
          code: "REMINDER_COOLDOWN_ACTIVE",
          reason: `Customer reminder cooldown active. Must wait ${Math.ceil(remainingMs / 60000)} more minutes.`,
          recommendedDelayMs: remainingMs,
          requiresHumanReview: false,
          blockingRule: "REMINDER_COOLDOWN",
          evaluatedAt,
        };
      }
    }

    return {
      decision: "ALLOW",
      allowed: true,
      code: "CUSTOMER_REMINDER_PERMITTED",
      reason: `Customer reminder attempt #${reminderActions.length + 1} is permitted.`,
      requiresHumanReview: false,
      evaluatedAt,
    };
  }

  private evaluatePaymentLink(
    context: ActionPolicyContext,
    _now: number,
    evaluatedAt: Date,
  ): ActionPolicyResult {
    const linkActions = context.existingActions.filter(
      (a) => a.type === "SEND_PAYMENT_LINK",
    );

    if (linkActions.length >= this.limits.maxPaymentLinkAttempts) {
      return {
        decision: "BLOCK",
        allowed: false,
        code: "MAX_PAYMENT_LINK_ATTEMPTS_EXCEEDED",
        reason: `Payment link creation limit reached (${linkActions.length}/${this.limits.maxPaymentLinkAttempts} attempts used).`,
        requiresHumanReview: true,
        blockingRule: "MAX_PAYMENT_LINKS",
        evaluatedAt,
      };
    }

    return {
      decision: "ALLOW",
      allowed: true,
      code: "PAYMENT_LINK_PERMITTED",
      reason: `Payment link creation attempt #${linkActions.length + 1} is permitted.`,
      requiresHumanReview: false,
      evaluatedAt,
    };
  }
}

export const actionPolicyService = new ActionPolicyService();
