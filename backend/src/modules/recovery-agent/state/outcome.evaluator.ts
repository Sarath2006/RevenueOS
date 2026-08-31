/**
 * ============================================================
 * M8.2 — RECOVERY OUTCOME EVALUATOR
 * ============================================================
 *
 * Normalizes execution outputs and real-time webhook events
 * into clean state transitions for the recovery agent loop.
 * ============================================================
 */

import {
  OutcomeEvaluationInput,
  OutcomeEvaluationResult,
} from "./state.types";

export class OutcomeEvaluatorService {
  /**
   * Evaluate the outcome of an action or external webhook event.
   */
  public evaluateOutcome(input: OutcomeEvaluationInput): OutcomeEvaluationResult {
    const observedAt = new Date();

    // 1. Check if Case is already recovered
    if (input.caseStatus === "RECOVERED" || input.recoveredAmount >= input.amountAtRisk) {
      return {
        nextState: "RECOVERED",
        isTerminal: true,
        isRecovered: true,
        recoveredAmount: input.recoveredAmount,
        requiresWait: false,
        reason: "Recovery case fully recovered.",
        observedAt,
      };
    }

    // 2. Evaluate Webhook Event (if triggered by external webhook)
    if (input.webhookEvent) {
      const eventType = input.webhookEvent.eventType.toLowerCase();
      const pStatus = (input.webhookEvent.paymentStatus || "").toUpperCase();

      if (
        eventType.includes("payment.captured") ||
        eventType.includes("payment.authorized") ||
        pStatus === "CAPTURED"
      ) {
        return {
          nextState: "RECOVERED",
          isTerminal: true,
          isRecovered: true,
          recoveredAmount: input.webhookEvent.amount ?? input.amountAtRisk,
          requiresWait: false,
          reason: "Payment captured via real-time webhook event.",
          observedAt,
        };
      }

      if (eventType.includes("payment.failed") || pStatus === "FAILED") {
        return {
          nextState: "EVALUATING",
          isTerminal: false,
          isRecovered: false,
          recoveredAmount: input.recoveredAmount,
          requiresWait: false,
          reason: "Payment failure webhook received; re-evaluating recovery strategy.",
          observedAt,
        };
      }
    }

    // 3. Evaluate Action Outcome (from M7 Execution)
    if (input.actionOutcome) {
      const actionResult = input.actionOutcome.actionResult;
      const actionType = (input.actionOutcome.actionType || "").toUpperCase();

      // Successful payment retry
      if (input.actionOutcome.success && actionResult?.recoveredAmount && actionResult.recoveredAmount > 0) {
        return {
          nextState: "RECOVERED",
          isTerminal: true,
          isRecovered: true,
          recoveredAmount: actionResult.recoveredAmount,
          requiresWait: false,
          reason: `Payment successfully recovered for ${actionResult.recoveredAmount}.`,
          observedAt,
        };
      }

      // Customer reminder or Payment Link dispatched (requires waiting for customer response)
      if (
        input.actionOutcome.success &&
        (actionType.includes("REMINDER") ||
          actionType.includes("LINK") ||
          actionType === "SEND_PAYMENT_LINK" ||
          actionType === "SEND_WHATSAPP" ||
          actionType === "SEND_SMS" ||
          actionType === "SEND_EMAIL")
      ) {
        return {
          nextState: "WAITING",
          isTerminal: false,
          isRecovered: false,
          recoveredAmount: input.recoveredAmount,
          requiresWait: true,
          reason: "Action successfully dispatched; waiting for customer payment or response.",
          observedAt,
        };
      }

      // Action failed
      if (!input.actionOutcome.success || input.actionOutcome.status === "FAILED") {
        return {
          nextState: "EVALUATING",
          isTerminal: false,
          isRecovered: false,
          recoveredAmount: input.recoveredAmount,
          requiresWait: false,
          reason: actionResult?.errorMessage || "Recovery action failed; evaluating next iteration.",
          observedAt,
        };
      }

      // Action blocked or requiring review
      if (input.actionOutcome.status === "BLOCKED") {
        return {
          nextState: "STOPPED",
          isTerminal: true,
          isRecovered: false,
          recoveredAmount: input.recoveredAmount,
          requiresWait: false,
          reason: "Action execution was blocked by policy.",
          observedAt,
        };
      }

      if (input.actionOutcome.status === "REQUIRES_HUMAN_REVIEW") {
        return {
          nextState: "HUMAN_REVIEW",
          isTerminal: true,
          isRecovered: false,
          recoveredAmount: input.recoveredAmount,
          requiresWait: false,
          reason: "Action requires human supervisor approval.",
          observedAt,
        };
      }
    }

    // Default fallback
    return {
      nextState: "EVALUATING",
      isTerminal: false,
      isRecovered: false,
      recoveredAmount: input.recoveredAmount,
      requiresWait: false,
      reason: "Evaluating next recovery loop cycle.",
      observedAt,
    };
  }
}

export const outcomeEvaluatorService = new OutcomeEvaluatorService();

