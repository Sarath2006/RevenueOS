/**
 * ============================================================
 * M8.3 — NEXT-ACTION DECISION ENGINE SERVICE
 * ============================================================
 *
 * Evaluates execution history, retry counts, failure streaks,
 * and time elapsed to decide whether to continue, change strategy,
 * wait, or stop.
 * ============================================================
 */

import { logger } from "../../../config/logger";
import {
  NextActionContext,
  NextActionEvaluationResult,
} from "./next-action.types";

export class NextActionService {
  /**
   * Determine the next action choice given current run history.
   */
  public evaluateNextAction(context: NextActionContext): NextActionEvaluationResult {
    const evaluatedAt = new Date();

    logger.info(
      {
        agentRunId: context.agentRunId,
        recoveryCaseId: context.recoveryCaseId,
        iteration: context.iteration,
        failureStreak: context.failureStreak,
        previousActionsCount: context.previousActions.length,
      },
      "NextActionService evaluating next step in recovery loop",
    );

    // 1. Check for Excessive Failures -> Escalate to Human Review
    if (context.failureStreak >= 3) {
      return {
        choice: "HUMAN_REVIEW",
        reason: `Repeated failures (${context.failureStreak} consecutive failed actions) require human review.`,
        evaluatedAt,
      };
    }

    // 2. Fresh run / First iteration
    if (context.previousActions.length === 0) {
      return {
        choice: "CONTINUE",
        strategyToExecute: context.currentDecision.strategy,
        channelToExecute: context.currentDecision.channel,
        reason: `Starting initial recommended strategy: ${context.currentDecision.strategy}.`,
        evaluatedAt,
      };
    }

    const lastAction = context.previousActions[context.previousActions.length - 1];
    const retryCount = context.previousActions.filter(
      (a) => a.type === "RETRY_PAYMENT" || a.type === "OFFER_ALTERNATIVE_PAYMENT",
    ).length;

    // 3. Last action was a Payment Retry that failed
    if (lastAction.type === "RETRY_PAYMENT" && lastAction.status === "FAILED") {
      // If retry limit reached or repeated retry failure -> Switch strategy to Payment Link
      if (retryCount >= 2) {
        return {
          choice: "CHANGE_STRATEGY",
          strategyToExecute: "SEND_PAYMENT_LINK",
          channelToExecute: "PAYMENT_LINK",
          reason: `Payment retry failed twice (${retryCount} retries); switching strategy to Payment Link.`,
          evaluatedAt,
        };
      }

      // Allow retry
      return {
        choice: "CONTINUE",
        strategyToExecute: "RETRY_PAYMENT",
        channelToExecute: "PAYMENT_RETRY",
        reason: `Retrying payment (attempt #${retryCount + 1}).`,
        evaluatedAt,
      };
    }

    // 4. Last action was a Payment Link or Reminder dispatched and pending
    if (
      lastAction.type === "SEND_PAYMENT_LINK" ||
      lastAction.type === "SEND_WHATSAPP" ||
      lastAction.type === "SEND_SMS" ||
      lastAction.type === "SEND_EMAIL"
    ) {
      if (lastAction.status === "COMPLETED" || lastAction.status === "SENT") {
        return {
          choice: "WAIT",
          reason: `Customer communication (${lastAction.type}) dispatched; waiting for customer action.`,
          evaluatedAt,
        };
      }
    }

    // 5. Default fallback -> continue with recommended strategy
    return {
      choice: "CONTINUE",
      strategyToExecute: context.currentDecision.strategy,
      channelToExecute: context.currentDecision.channel,
      reason: `Proceeding with recommended strategy: ${context.currentDecision.strategy}.`,
      evaluatedAt,
    };
  }
}

export const nextActionService = new NextActionService();

