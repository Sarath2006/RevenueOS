/**
 * ============================================================
 * M8.4 — RECOVERY AGENT STOPPING SERVICE
 * ============================================================
 *
 * Centralized, authoritative stopping rules preventing uncontrolled
 * infinite loops in the autonomous recovery agent.
 * ============================================================
 */

import {
  StoppingPolicyLimits,
  StoppingEvaluationContext,
  StoppingEvaluationResult,
} from "./stopping.types";

export const DEFAULT_STOPPING_LIMITS: StoppingPolicyLimits = {
  maxAgentIterations: 5,
  maxPaymentRetries: 3,
  maxConsecutiveFailures: 3,
  minConfidenceThreshold: 0.65,
  maxCaseAgeHours: 720, // 30 days
  decisionTtlMs: 24 * 60 * 60 * 1000,
};

export class StoppingService {
  private limits: StoppingPolicyLimits;

  constructor(customLimits?: Partial<StoppingPolicyLimits>) {
    this.limits = {
      ...DEFAULT_STOPPING_LIMITS,
      ...customLimits,
    };
  }

  /**
   * Update limits dynamically if needed.
   */
  public updateLimits(newLimits: Partial<StoppingPolicyLimits>): void {
    this.limits = {
      ...this.limits,
      ...newLimits,
    };
  }

  /**
   * Evaluate whether the autonomous recovery agent must stop.
   */
  public evaluate(context: StoppingEvaluationContext): StoppingEvaluationResult {
    const now = Date.now();
    const evaluatedAt = new Date(now);

    // 1. Check if Case is Already Recovered
    if (context.caseStatus === "RECOVERED" || context.recoveredAmount >= context.amountAtRisk) {
      return {
        shouldStop: true,
        stopReason: "CASE_RECOVERED",
        requiresHumanReview: false,
        reason: "Recovery case is already fully recovered.",
        evaluatedAt,
      };
    }

    // 2. Check if Case is Explicitly Stopped or Cancelled
    if (context.caseStatus === "STOPPED") {
      return {
        shouldStop: true,
        stopReason: "CASE_STOPPED",
        requiresHumanReview: false,
        reason: "Recovery case was explicitly stopped by user or merchant.",
        evaluatedAt,
      };
    }

    if (context.caseStatus === "CANCELLED") {
      return {
        shouldStop: true,
        stopReason: "CASE_CANCELLED",
        requiresHumanReview: false,
        reason: "Recovery case was cancelled.",
        evaluatedAt,
      };
    }

    if (context.caseStatus === "EXPIRED") {
      return {
        shouldStop: true,
        stopReason: "CASE_EXPIRED",
        requiresHumanReview: false,
        reason: "Recovery case has expired.",
        evaluatedAt,
      };
    }

    // 3. Check Case Maximum Age Lifespan
    const caseAgeMs = now - new Date(context.caseOpenedAt).getTime();
    if (caseAgeMs > this.limits.maxCaseAgeHours * 3600 * 1000) {
      return {
        shouldStop: true,
        stopReason: "TIME_LIMIT_EXCEEDED",
        requiresHumanReview: false,
        reason: `Case lifespan exceeded maximum limit of ${this.limits.maxCaseAgeHours} hours.`,
        evaluatedAt,
      };
    }

    // 4. Check Maximum Agent Iterations
    const maxIters = context.maxIterations || this.limits.maxAgentIterations;
    if (context.iteration > maxIters) {
      return {
        shouldStop: true,
        stopReason: "MAX_AGENT_ITERATIONS",
        requiresHumanReview: true,
        reason: `Maximum autonomous agent loop iterations (${maxIters}) reached.`,
        evaluatedAt,
      };
    }

    // 5. Check AI Safety Boundary Decision
    if (context.decision) {
      if (context.decision.safetyDecision === "BLOCK" || context.decision.safetyAllowed === false) {
        return {
          shouldStop: true,
          stopReason: "SAFETY_BLOCK",
          requiresHumanReview: false,
          reason: "Blocked by AI Safety Policy boundary.",
          evaluatedAt,
        };
      }

      if (context.decision.safetyDecision === "REQUIRE_HUMAN_REVIEW") {
        return {
          shouldStop: true,
          stopReason: "HUMAN_REVIEW_REQUIRED",
          requiresHumanReview: true,
          reason: "AI Safety requires human supervisor review.",
          evaluatedAt,
        };
      }

      // 6. Check Decision Confidence Threshold
      if (context.decision.confidence < this.limits.minConfidenceThreshold) {
        return {
          shouldStop: true,
          stopReason: "LOW_CONFIDENCE",
          requiresHumanReview: true,
          reason: `Decision confidence (${context.decision.confidence}) is below threshold (${this.limits.minConfidenceThreshold}).`,
          evaluatedAt,
        };
      }

      // 7. Check Decision Freshness (TTL)
      const decisionAgeMs = now - new Date(context.decision.createdAt).getTime();
      if (decisionAgeMs > this.limits.decisionTtlMs) {
        return {
          shouldStop: true,
          stopReason: "DECISION_EXPIRED",
          requiresHumanReview: false,
          reason: `AI decision expired (${Math.round(decisionAgeMs / 3600000)}h old).`,
          evaluatedAt,
        };
      }
    }

    // 8. Check Payment Retries Limit
    const retryCount = context.actions.filter(
      (a) => a.type === "RETRY_PAYMENT" || a.type === "OFFER_ALTERNATIVE_PAYMENT",
    ).length;

    if (retryCount >= this.limits.maxPaymentRetries) {
      return {
        shouldStop: true,
        stopReason: "MAX_PAYMENT_RETRIES",
        requiresHumanReview: true,
        reason: `Payment retry limit reached (${retryCount}/${this.limits.maxPaymentRetries} retries used).`,
        evaluatedAt,
      };
    }

    // 9. Check NO_PROGRESS Detection (consecutive failures without state improvement)
    if (context.failureStreak >= this.limits.maxConsecutiveFailures) {
      return {
        shouldStop: true,
        stopReason: "NO_PROGRESS",
        requiresHumanReview: true,
        reason: `No progress detected after ${context.failureStreak} consecutive failed recovery actions.`,
        evaluatedAt,
      };
    }

    // Agent can continue
    return {
      shouldStop: false,
      requiresHumanReview: false,
      reason: "All stopping rules passed; autonomous agent loop may proceed.",
      evaluatedAt,
    };
  }
}

export const stoppingService = new StoppingService();

