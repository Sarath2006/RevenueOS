/**
 * ============================================================
 * M7.1 — RECOVERY ORCHESTRATOR SERVICE
 * ============================================================
 *
 * Central coordinator responsible for turning AI decisions into
 * safe, validated, bounded, and idempotent recovery actions.
 *
 * Orchestration Pipeline:
 * M6 AI Decision
 *       ↓
 * 1. Validate Decision & RecoveryCase
 *       ↓
 * 2. Idempotency Check & In-Flight Lock
 *       ↓
 * 3. Evaluate Action Policy & Bounds (M7.2)
 *       ↓
 * 4. Persist RecoveryAction State (M7.4)
 *       ↓
 * 5. Execute Action via Adapters (M7.3)
 *       ↓
 * 6. Update Recovery Outcome & Case State
 * ============================================================
 */

import { logger } from "../../../config/logger";
import { aiDecisionService } from "../../ai/decision/decision.service";
import { actionRepository } from "./action.repository";
import { actionPolicyService } from "./action-policy.service";
import { actionExecutorService } from "./action-executor.service";
import { actionStateService } from "./action-state.service";
import { idempotencyService } from "./idempotency.service";

import type {
  OrchestrateRecoveryInput,
  OrchestrationOutcome,
} from "./orchestrator.types";

import type {
  DecisionType,
  Channel,
} from "../../../generated/prisma/client";

import type { AIDecisionRecord } from "../../ai/decision/decision.types";

export class RecoveryOrchestratorService {
  /**
   * Helper to map strategy string to Prisma DecisionType enum.
   */
  private mapStrategyToDecisionType(strategy: string, channel?: string | null): DecisionType {
    const s = (strategy || "").toUpperCase();
    const c = (channel || "").toUpperCase();

    if (s.includes("RETRY") || s === "RETRY_PAYMENT") {
      return "RETRY_PAYMENT";
    }
    if (s.includes("LINK") || s === "PAYMENT_LINK" || s === "SEND_PAYMENT_LINK") {
      return "SEND_PAYMENT_LINK";
    }
    if (s.includes("REMINDER") || s === "CUSTOMER_REMINDER") {
      if (c === "SMS") return "SEND_SMS";
      if (c === "EMAIL") return "SEND_EMAIL";
      if (c === "VOICE") return "VOICE_CALL";
      return "SEND_WHATSAPP";
    }
    if (s === "ALTERNATE_PAYMENT_METHOD") {
      return "OFFER_ALTERNATIVE_PAYMENT";
    }
    if (s === "WAIT") {
      return "WAIT";
    }
    if (s === "STOP") {
      return "STOP";
    }
    if (s === "ESCALATE") {
      return "ESCALATE";
    }
    return "NO_ACTION";
  }

  /**
   * Helper to map channel string to Prisma Channel enum.
   */
  private mapChannel(channel?: string | null): Channel | null {
    if (!channel) return null;
    const c = channel.toUpperCase();
    if (c === "WHATSAPP") return "WHATSAPP";
    if (c === "SMS") return "SMS";
    if (c === "EMAIL") return "EMAIL";
    if (c === "VOICE") return "VOICE";
    if (c === "HINGLISH_VOICE") return "HINGLISH_VOICE";
    if (c === "DASHBOARD") return "DASHBOARD";
    return null;
  }

  /**
   * Orchestrate execution of an AI recovery decision.
   */
  public async orchestrate(input: OrchestrateRecoveryInput): Promise<OrchestrationOutcome> {
    const orchestratedAt = new Date();

    logger.info(
      {
        decisionId: input.decisionId,
        recoveryCaseId: input.recoveryCaseId,
        merchantId: input.merchantId,
      },
      "Recovery Orchestrator starting evaluation",
    );

    // 1. Resolve Decision
    let decision: AIDecisionRecord | null = input.decision ?? null;
    if (!decision && input.decisionId) {
      const fetched = await aiDecisionService.getDecision(input.decisionId);
      if (fetched) {
        decision = fetched as unknown as AIDecisionRecord;
      }
    }

    if (!decision) {
      throw new Error(`AI Decision not found or invalid: ${input.decisionId}`);
    }

    // 2. Resolve RecoveryCase
    const recoveryCase = await actionRepository.getRecoveryCase(input.recoveryCaseId);
    if (!recoveryCase) {
      throw new Error(`Recovery case not found: ${input.recoveryCaseId}`);
    }

    // 3. Determine DecisionType & Channel
    const actionType = this.mapStrategyToDecisionType(decision.strategy, decision.channel);
    const channel = this.mapChannel(decision.channel);

    // 4. Calculate Attempt Number & Idempotency Key
    const existingActions = recoveryCase.actions || [];
    const sameTypeActions = existingActions.filter((a) => a.type === actionType);
    const attemptNumber = sameTypeActions.length + 1;

    const idempotencyKey = idempotencyService.generateKey({
      merchantId: input.merchantId,
      recoveryCaseId: input.recoveryCaseId,
      decisionId: decision.decisionId,
      actionType,
    });

    // Check Idempotency Cache for duplicate dispatch suppression
    const cachedOutcome = await idempotencyService.getCachedResult<OrchestrationOutcome>(idempotencyKey);
    if (cachedOutcome) {
      logger.info(
        {
          idempotencyKey,
          actionId: cachedOutcome.actionId,
        },
        "Duplicate action detected (cache): returning cached orchestration outcome",
      );
      return cachedOutcome;
    }

    // Check if an action was already persisted for this exact decisionId
    const existingActionForDecision = existingActions.find(
      (a) => (a.metadata as any)?.decisionId === decision?.decisionId,
    );

    if (existingActionForDecision) {
      logger.info(
        {
          decisionId: decision.decisionId,
          actionId: existingActionForDecision.id,
        },
        "Duplicate action detected (database): returning existing action outcome",
      );

      const isCompleted = existingActionForDecision.status === "COMPLETED";
      const isFailed = existingActionForDecision.status === "FAILED";
      const outcomeStatus = isCompleted ? "EXECUTED" : isFailed ? "FAILED" : "SKIPPED";

      const outcome: OrchestrationOutcome = {
        success: isCompleted,
        actionId: existingActionForDecision.id,
        decisionId: decision.decisionId,
        recoveryCaseId: input.recoveryCaseId,
        merchantId: input.merchantId,
        customerId: input.customerId,
        status: outcomeStatus,
        actionType,
        channel,
        attemptNumber: existingActionForDecision.attemptNumber,
        idempotencyKey,
        policyResult: {
          decision: "ALLOW",
          allowed: true,
          code: "DUPLICATE_SUPPRESSED",
          reason: "Action for this decision was already executed (idempotency enforced).",
          requiresHumanReview: false,
          evaluatedAt: orchestratedAt,
        },
        recoveryCaseUpdated: false,
        message: existingActionForDecision.message || "Action already executed (idempotency).",
        orchestratedAt,
      };

      await idempotencyService.cacheResult(idempotencyKey, outcome);
      return outcome;
    }

    // Acquire lock to protect concurrent workers
    const lockAcquired = await idempotencyService.acquireLock(idempotencyKey);
    if (!lockAcquired) {
      logger.warn(
        {
          idempotencyKey,
          recoveryCaseId: input.recoveryCaseId,
        },
        "Action is currently in-flight by another worker",
      );
      return {
        success: false,
        decisionId: decision.decisionId,
        recoveryCaseId: input.recoveryCaseId,
        merchantId: input.merchantId,
        customerId: input.customerId,
        status: "DELAYED",
        attemptNumber,
        idempotencyKey,
        policyResult: {
          decision: "DELAY",
          allowed: false,
          code: "ACTION_IN_FLIGHT",
          reason: "An action for this case is currently executing concurrently.",
          requiresHumanReview: false,
          evaluatedAt: orchestratedAt,
        },
        recoveryCaseUpdated: false,
        message: "Action is currently running in another process.",
        orchestratedAt,
      };
    }

    try {
      // 5. Evaluate Action Policy & Bounds (M7.2)
      const policyResult = actionPolicyService.evaluate({
        decisionId: decision.decisionId,
        merchantId: input.merchantId,
        customerId: input.customerId,
        recoveryCaseId: input.recoveryCaseId,
        currency: decision.currency || "INR",
        strategy: decision.strategy,
        channel: decision.channel,
        timing: decision.timing,
        confidence: decision.decisionConfidence ?? 1.0,
        safetyDecision: (decision as any).safetyDecision ?? "ALLOW",
        safetyAllowed: (decision as any).safetyAllowed ?? true,
        safetyRiskLevel: (decision as any).safetyRiskLevel ?? "LOW",
        decisionCreatedAt: decision.createdAt || new Date(),
        caseStatus: recoveryCase.status,
        caseOpenedAt: recoveryCase.openedAt,
        caseAmountAtRisk: Number(recoveryCase.amountAtRisk || 0),
        caseRecoveredAmount: Number(recoveryCase.recoveredAmount || 0),
        existingActions: existingActions.map((a) => ({
          id: a.id,
          type: a.type,
          channel: a.channel,
          status: a.status,
          attemptNumber: a.attemptNumber,
          completedAt: a.completedAt,
          createdAt: a.createdAt,
        })),
      });

      logger.info(
        {
          decisionId: decision.decisionId,
          policyDecision: policyResult.decision,
          policyAllowed: policyResult.allowed,
          code: policyResult.code,
        },
        "Action policy evaluation completed",
      );

      // Handle Policy: BLOCK
      if (policyResult.decision === "BLOCK") {
        const blockedAction = await actionRepository.create({
          merchantId: input.merchantId,
          recoveryCaseId: input.recoveryCaseId,
          type: actionType,
          channel,
          status: "SKIPPED",
          attemptNumber,
          completedAt: orchestratedAt,
          message: policyResult.reason,
          errorCode: policyResult.code,
          metadata: {
            policyResult,
            idempotencyKey,
            decisionId: decision.decisionId,
          },
        });

        const outcome: OrchestrationOutcome = {
          success: false,
          actionId: blockedAction.id,
          decisionId: decision.decisionId,
          recoveryCaseId: input.recoveryCaseId,
          merchantId: input.merchantId,
          customerId: input.customerId,
          status: "BLOCKED",
          actionType,
          channel,
          attemptNumber,
          idempotencyKey,
          policyResult,
          recoveryCaseUpdated: false,
          message: policyResult.reason,
          orchestratedAt,
        };

        await idempotencyService.cacheResult(idempotencyKey, outcome);
        return outcome;
      }

      // Handle Policy: REQUIRE_HUMAN_REVIEW
      if (policyResult.decision === "REQUIRE_HUMAN_REVIEW") {
        const reviewAction = await actionRepository.create({
          merchantId: input.merchantId,
          recoveryCaseId: input.recoveryCaseId,
          type: actionType,
          channel,
          status: "PENDING",
          attemptNumber,
          message: policyResult.reason,
          errorCode: "REQUIRES_HUMAN_REVIEW",
          metadata: {
            policyResult,
            idempotencyKey,
            decisionId: decision.decisionId,
          },
        });

        await actionRepository.updateRecoveryCase(input.recoveryCaseId, {
          status: "ESCALATED",
          lastActionAt: orchestratedAt,
        });

        const outcome: OrchestrationOutcome = {
          success: false,
          actionId: reviewAction.id,
          decisionId: decision.decisionId,
          recoveryCaseId: input.recoveryCaseId,
          merchantId: input.merchantId,
          customerId: input.customerId,
          status: "REQUIRES_HUMAN_REVIEW",
          actionType,
          channel,
          attemptNumber,
          idempotencyKey,
          policyResult,
          recoveryCaseUpdated: true,
          caseStatusAfterOrchestration: "ESCALATED",
          message: policyResult.reason,
          orchestratedAt,
        };

        await idempotencyService.cacheResult(idempotencyKey, outcome);
        return outcome;
      }

      // Handle Policy: SKIP
      if (policyResult.decision === "SKIP") {
        const skippedAction = await actionRepository.create({
          merchantId: input.merchantId,
          recoveryCaseId: input.recoveryCaseId,
          type: actionType,
          channel,
          status: "SKIPPED",
          attemptNumber,
          completedAt: orchestratedAt,
          message: policyResult.reason,
          metadata: {
            policyResult,
            idempotencyKey,
            decisionId: decision.decisionId,
          },
        });

        const outcome: OrchestrationOutcome = {
          success: true,
          actionId: skippedAction.id,
          decisionId: decision.decisionId,
          recoveryCaseId: input.recoveryCaseId,
          merchantId: input.merchantId,
          customerId: input.customerId,
          status: "SKIPPED",
          actionType,
          channel,
          attemptNumber,
          idempotencyKey,
          policyResult,
          recoveryCaseUpdated: false,
          message: policyResult.reason,
          orchestratedAt,
        };

        await idempotencyService.cacheResult(idempotencyKey, outcome);
        return outcome;
      }

      // Handle Policy: DELAY
      if (policyResult.decision === "DELAY") {
        const scheduledAt = new Date(Date.now() + (policyResult.recommendedDelayMs ?? 900000));
        const delayedAction = await actionRepository.create({
          merchantId: input.merchantId,
          recoveryCaseId: input.recoveryCaseId,
          type: actionType,
          channel,
          status: "QUEUED",
          attemptNumber,
          scheduledAt,
          message: policyResult.reason,
          metadata: {
            policyResult,
            idempotencyKey,
            decisionId: decision.decisionId,
          },
        });

        const outcome: OrchestrationOutcome = {
          success: true,
          actionId: delayedAction.id,
          decisionId: decision.decisionId,
          recoveryCaseId: input.recoveryCaseId,
          merchantId: input.merchantId,
          customerId: input.customerId,
          status: "DELAYED",
          actionType,
          channel,
          attemptNumber,
          idempotencyKey,
          policyResult,
          recoveryCaseUpdated: false,
          message: policyResult.reason,
          orchestratedAt,
        };

        await idempotencyService.cacheResult(idempotencyKey, outcome);
        return outcome;
      }

      // 6. Action is ALLOWED: Create Action Record & Execute (M7.3)
      const actionRecord = await actionRepository.create({
        merchantId: input.merchantId,
        recoveryCaseId: input.recoveryCaseId,
        type: actionType,
        channel,
        status: "PENDING",
        attemptNumber,
        startedAt: orchestratedAt,
        metadata: {
          decisionId: decision.decisionId,
          idempotencyKey,
          policyResult,
        },
      });

      await actionStateService.markRunning(actionRecord.id);

      const actionResult = await actionExecutorService.execute({
        actionId: actionRecord.id,
        recoveryCaseId: input.recoveryCaseId,
        decisionId: decision.decisionId,
        merchantId: input.merchantId,
        customerId: input.customerId,
        type: actionType,
        channel,
        amount: Number(recoveryCase.amountAtRisk || 0),
        currency: decision.currency || "INR",
        paymentId: recoveryCase.paymentId,
        subscriptionId: recoveryCase.subscriptionId,
        customerName: recoveryCase.customer?.name,
        customerEmail: recoveryCase.customer?.email,
        customerPhone: recoveryCase.customer?.phone,
        strategyReason: decision.decisionReason,
        idempotencyKey,
        metadata: {
          attemptNumber,
        },
      });

      let updatedStatus = recoveryCase.status;
      let caseUpdated = false;

      // 7. Update States on Completion
      if (actionResult.success) {
        await actionStateService.markCompleted(actionRecord.id, {
          providerMessageId: actionResult.providerReference,
          message: actionResult.message,
          metadata: {
            actionResult,
            completedAt: new Date(),
          },
        });

        // If amount was recovered, update RecoveryCase to RECOVERED
        if (actionResult.recoveredAmount && actionResult.recoveredAmount > 0) {
          const newRecoveredAmount =
            Number(recoveryCase.recoveredAmount || 0) + actionResult.recoveredAmount;
          await actionRepository.updateRecoveryCase(input.recoveryCaseId, {
            status: "RECOVERED",
            recoveredAmount: newRecoveredAmount,
            recoveredAt: new Date(),
            lastActionAt: new Date(),
          });
          updatedStatus = "RECOVERED";
          caseUpdated = true;
        } else {
          await actionRepository.updateRecoveryCase(input.recoveryCaseId, {
            status: "IN_PROGRESS",
            lastActionAt: new Date(),
          });
          updatedStatus = "IN_PROGRESS";
          caseUpdated = true;
        }
      } else {
        await actionStateService.markFailed(actionRecord.id, {
          message: actionResult.errorMessage || "Action execution failed",
          code: actionResult.errorCode,
          metadata: { actionResult },
        });

        await actionRepository.updateRecoveryCase(input.recoveryCaseId, {
          lastActionAt: new Date(),
        });
      }

      const outcome: OrchestrationOutcome = {
        success: actionResult.success,
        actionId: actionRecord.id,
        decisionId: decision.decisionId,
        recoveryCaseId: input.recoveryCaseId,
        merchantId: input.merchantId,
        customerId: input.customerId,
        status: actionResult.success ? "EXECUTED" : "FAILED",
        actionType,
        channel,
        attemptNumber,
        idempotencyKey,
        policyResult,
        actionResult,
        recoveryCaseUpdated: caseUpdated,
        caseStatusAfterOrchestration: updatedStatus,
        message: actionResult.message || actionResult.errorMessage || "Action executed",
        orchestratedAt,
      };

      await idempotencyService.cacheResult(idempotencyKey, outcome);
      return outcome;
    } finally {
      await idempotencyService.releaseLock(idempotencyKey);
    }
  }
}

export const recoveryOrchestratorService = new RecoveryOrchestratorService();
