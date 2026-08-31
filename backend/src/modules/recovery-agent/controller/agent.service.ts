/**
 * ============================================================
 * M8.1 — RECOVERY AGENT CONTROLLER SERVICE
 * ============================================================
 *
 * Central coordinator managing autonomous recovery agent runs.
 *
 * Invariant:
 * M8 calls M6 for decision, M7 for safe execution,
 * and NEVER directly calls payment gateways or notification APIs.
 * ============================================================
 */

import crypto from "crypto";
import { logger } from "../../../config/logger";
import { prisma } from "../../../config/database";
import { agentRunRepository } from "./agent-run.repository";
import { recoveryAgentStateService } from "../state/state.service";
import { outcomeEvaluatorService } from "../state/outcome.evaluator";
import { nextActionService } from "../decision/next-action.service";
import { stoppingService } from "../stopping/stopping.service";
import { escalationService } from "../stopping/escalation.service";
import { aiDecisionService } from "../../ai/decision/decision.service";
import { recoveryOrchestratorService } from "../../recovery/orchestration/orchestrator.service";
import { idempotencyService } from "../../recovery/orchestration/idempotency.service";

import type {
  StartAgentRunInput,
  AgentRunResult,
  AgentIterationResult,
  AgentRunStatus,
} from "./agent.types";

import type { RecoveryAgentState } from "../state/state.types";
import type { AIDecisionRecord } from "../../ai/decision/decision.types";

export class RecoveryAgentService {
  /**
   * Start and run the autonomous recovery agent loop.
   */
  public async runAgent(input: StartAgentRunInput): Promise<AgentRunResult> {
    const startedAt = new Date();
    const agentRunId = `run_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const maxIterations = input.maxIterations || 5;

    logger.info(
      {
        agentRunId,
        recoveryCaseId: input.recoveryCaseId,
        merchantId: input.merchantId,
        maxIterations,
      },
      "Starting autonomous recovery agent run",
    );

    // 1. Acquire Concurrency Lock on RecoveryCase
    const lockKey = `agent_lock:${input.recoveryCaseId}`;
    const lockAcquired = await idempotencyService.acquireLock(lockKey, 120000);

    if (!lockAcquired) {
      logger.warn(
        { recoveryCaseId: input.recoveryCaseId },
        "Another agent run is currently active for this recovery case",
      );

      return {
        agentRunId,
        recoveryCaseId: input.recoveryCaseId,
        status: "STOPPED",
        finalState: "STOPPED",
        totalIterations: 0,
        recovered: false,
        recoveredAmount: 0,
        stopReason: "DUPLICATE_EVENT",
        iterations: [],
        startedAt,
        completedAt: new Date(),
        message: "Another recovery agent is currently running for this case.",
      };
    }

    try {
      // 2. Persist Initial Agent Run
      await agentRunRepository.create({
        agentRunId,
        merchantId: input.merchantId,
        customerId: input.customerId,
        recoveryCaseId: input.recoveryCaseId,
        status: "RUNNING",
        currentState: "STARTING",
        iteration: 1,
        maxIterations,
        currentDecisionId: input.initialDecisionId ?? null,
        metadata: {
          source: input.source ?? "SYSTEM",
          ...input.metadata,
        },
      });

      let currentState: RecoveryAgentState = "STARTING";
      let currentIteration = 1;
      let finalStatus: AgentRunStatus = "RUNNING";
      let stopReason: string | null = null;
      let isRecovered = false;
      let recoveredAmount = 0;
      let currentDecisionId = input.initialDecisionId ?? null;
      let lastActionId: string | null = null;
      const iterations: AgentIterationResult[] = [];

      // 3. Autonomous Loop
      while (currentIteration <= maxIterations) {
        logger.info(
          {
            agentRunId,
            iteration: currentIteration,
            maxIterations,
          },
          `Executing agent iteration ${currentIteration}`,
        );

        // Transition to EVALUATING
        await recoveryAgentStateService.transition(
          agentRunId,
          currentState,
          "EVALUATING",
          `Iteration ${currentIteration}: Evaluating recovery case`,
          { recoveryCaseId: input.recoveryCaseId, iteration: currentIteration },
        );
        currentState = "EVALUATING";

        // Query fresh RecoveryCase state and action history
        const recoveryCase = await prisma.recoveryCase.findUnique({
          where: { id: input.recoveryCaseId },
          include: {
            actions: { orderBy: { createdAt: "asc" } },
            customer: true,
          },
        });

        if (!recoveryCase) {
          throw new Error(`RecoveryCase not found: ${input.recoveryCaseId}`);
        }

        recoveredAmount = Number(recoveryCase.recoveredAmount || 0);
        const amountAtRisk = Number(recoveryCase.amountAtRisk || 0);
        const actions = recoveryCase.actions || [];

        // Count consecutive failures
        let failureStreak = 0;
        for (let i = actions.length - 1; i >= 0; i--) {
          if (actions[i].status === "FAILED") {
            failureStreak++;
          } else {
            break;
          }
        }

        // 4. Obtain / Resolve M6 AI Decision
        let decision: AIDecisionRecord | null = null;
        if (currentDecisionId) {
          const fetched = await aiDecisionService.getDecision(currentDecisionId);
          if (fetched) decision = fetched as unknown as AIDecisionRecord;
        }

        // If no decision exists or new decision needed for this iteration, create one
        if (!decision) {
          const created = await aiDecisionService.createDecision({
            customerId: input.customerId,
            merchantId: input.merchantId,
            recoveryCaseId: input.recoveryCaseId,
            currency: "INR",
            probability: 0.85,
            probabilityPercent: 85,
            probabilityBand: "HIGH",
            probabilityConfidence: 0.88,
            priorityScore: 70,
            priorityBand: "HIGH",
            urgencyScore: 80,
            opportunityScore: 70,
            riskScore: 20,
            amountScore: 60,
            strategy: "RETRY_PAYMENT",
            channel: "PAYMENT_RETRY",
            timing: "IMMEDIATE",
            strategyScore: 90,
            decisionConfidence: 0.88,
            decisionReason: "Autonomous recovery agent recommended payment retry.",
            modelVersions: {
              probability: "recovery-probability-v1",
              priority: "recovery-priority-v1",
              strategy: "recovery-strategy-v1",
              confidence: "confidence-fallback-v1",
              safety: "ai-safety-policy-v1",
            },
            inputFeatures: {},
            positiveSignals: ["AUTO_RECOVERY_AGENT"],
            negativeSignals: [],
            alternatives: [],
          });
          decision = created as unknown as AIDecisionRecord;
          currentDecisionId = decision.decisionId;
        }

        if (!decision) {
          throw new Error(`Unable to resolve or create AI Decision for iteration ${currentIteration}`);
        }

        let activeDecision: AIDecisionRecord = decision;

        // 5. Evaluate Authoritative Stopping Rules (M8.4)
        const safetyInfo = (activeDecision as any).safetyDecision !== undefined
          ? {
              decision: (activeDecision as any).safetyDecision,
              allowed: (activeDecision as any).safetyAllowed,
            }
          : (activeDecision.inputFeatures as any)?.safety;

        const stoppingResult = stoppingService.evaluate({
          agentRunId,
          recoveryCaseId: input.recoveryCaseId,
          iteration: currentIteration,
          maxIterations,
          currentState,
          caseStatus: recoveryCase.status,
          caseOpenedAt: recoveryCase.openedAt,
          amountAtRisk,
          recoveredAmount,
          decision: {
            decisionId: activeDecision.decisionId,
            confidence: activeDecision.decisionConfidence,
            safetyDecision: safetyInfo?.decision ?? "ALLOW",
            safetyAllowed: safetyInfo?.allowed ?? true,
            createdAt: activeDecision.createdAt,
          },
          actions: actions.map((a) => ({
            type: a.type,
            status: a.status,
            attemptNumber: a.attemptNumber,
            completedAt: a.completedAt,
          })),
          failureStreak,
        });

        if (stoppingResult.shouldStop) {
          logger.info(
            {
              agentRunId,
              stopReason: stoppingResult.stopReason,
              reason: stoppingResult.reason,
            },
            "Stopping rule triggered; ending autonomous agent run",
          );

          stopReason = stoppingResult.stopReason ?? "CASE_STOPPED";

          if (stoppingResult.requiresHumanReview) {
            await escalationService.escalate(
              agentRunId,
              input.recoveryCaseId,
              stoppingResult.reason,
              { iteration: currentIteration },
            );
            currentState = "HUMAN_REVIEW";
            finalStatus = "HUMAN_REVIEW";
          } else if (stoppingResult.stopReason === "CASE_RECOVERED") {
            await recoveryAgentStateService.transition(
              agentRunId,
              currentState,
              "RECOVERED",
              stoppingResult.reason,
              { recoveryCaseId: input.recoveryCaseId },
            );
            currentState = "RECOVERED";
            finalStatus = "COMPLETED";
            isRecovered = true;
          } else {
            await recoveryAgentStateService.transition(
              agentRunId,
              currentState,
              "STOPPED",
              stoppingResult.reason,
              { recoveryCaseId: input.recoveryCaseId },
            );
            currentState = "STOPPED";
            finalStatus = "STOPPED";
          }

          iterations.push({
            iteration: currentIteration,
            state: currentState,
            stopReason: stoppingResult.stopReason,
            shouldContinue: false,
            message: stoppingResult.reason,
          });

          break;
        }

        // 6. Next-Action Decision Engine (M8.3)
        const nextActionEvaluation = nextActionService.evaluateNextAction({
          agentRunId,
          recoveryCaseId: input.recoveryCaseId,
          iteration: currentIteration,
          currentDecision: activeDecision,
          previousActions: actions.map((a) => ({
            type: a.type,
            status: a.status,
            attemptNumber: a.attemptNumber,
            completedAt: a.completedAt,
          })),
          caseStatus: recoveryCase.status,
          amountAtRisk,
          recoveredAmount,
          failureStreak,
        });

        logger.info(
          {
            agentRunId,
            choice: nextActionEvaluation.choice,
            strategy: nextActionEvaluation.strategyToExecute,
          },
          "Next-action decision evaluated",
        );

        if (nextActionEvaluation.choice === "HUMAN_REVIEW") {
          await escalationService.escalate(
            agentRunId,
            input.recoveryCaseId,
            nextActionEvaluation.reason,
          );
          currentState = "HUMAN_REVIEW";
          finalStatus = "HUMAN_REVIEW";
          stopReason = "HUMAN_REVIEW_REQUIRED";
          iterations.push({
            iteration: currentIteration,
            state: currentState,
            stopReason: "HUMAN_REVIEW_REQUIRED",
            shouldContinue: false,
            message: nextActionEvaluation.reason,
          });
          break;
        }

        if (nextActionEvaluation.choice === "WAIT") {
          await recoveryAgentStateService.transition(
            agentRunId,
            currentState,
            "WAITING",
            nextActionEvaluation.reason,
            { recoveryCaseId: input.recoveryCaseId },
          );
          currentState = "WAITING";
          finalStatus = "WAITING";
          stopReason = "WAITING_FOR_OUTCOME";
          iterations.push({
            iteration: currentIteration,
            state: currentState,
            shouldContinue: false,
            message: nextActionEvaluation.reason,
          });
          break;
        }

        if (nextActionEvaluation.choice === "STOP") {
          await recoveryAgentStateService.transition(
            agentRunId,
            currentState,
            "STOPPED",
            nextActionEvaluation.reason,
            { recoveryCaseId: input.recoveryCaseId },
          );
          currentState = "STOPPED";
          finalStatus = "STOPPED";
          stopReason = "POLICY_STOP";
          iterations.push({
            iteration: currentIteration,
            state: currentState,
            shouldContinue: false,
            message: nextActionEvaluation.reason,
          });
          break;
        }

        // Apply strategy modification if next-action engine shifted strategy
        if (nextActionEvaluation.choice === "CHANGE_STRATEGY" && nextActionEvaluation.strategyToExecute) {
          activeDecision = {
            ...activeDecision,
            strategy: nextActionEvaluation.strategyToExecute,
            channel: nextActionEvaluation.channelToExecute ?? activeDecision.channel,
          };
        }

        // 7. Transition to ACTION_READY -> EXECUTING
        await recoveryAgentStateService.transition(
          agentRunId,
          currentState,
          "ACTION_READY",
          "Action ready for execution",
          { recoveryCaseId: input.recoveryCaseId },
        );
        currentState = "ACTION_READY";

        await recoveryAgentStateService.transition(
          agentRunId,
          currentState,
          "EXECUTING",
          `Dispatching action '${activeDecision.strategy}' via M7 Orchestrator`,
          { recoveryCaseId: input.recoveryCaseId },
        );
        currentState = "EXECUTING";

        // 8. Execute Bounded Action via M7 Orchestrator
        const orchestrationOutcome = await recoveryOrchestratorService.orchestrate({
          decision: activeDecision,
          recoveryCaseId: input.recoveryCaseId,
          merchantId: input.merchantId,
          customerId: input.customerId,
        });

        lastActionId = orchestrationOutcome.actionId ?? null;

        // Transition to OBSERVING
        await recoveryAgentStateService.transition(
          agentRunId,
          currentState,
          "OBSERVING",
          "Observing action execution result",
          { actionId: lastActionId },
        );
        currentState = "OBSERVING";

        // 9. Outcome Evaluator (M8.2)
        const outcomeResult = outcomeEvaluatorService.evaluateOutcome({
          agentRunId,
          recoveryCaseId: input.recoveryCaseId,
          iteration: currentIteration,
          actionOutcome: orchestrationOutcome,
          caseStatus: orchestrationOutcome.caseStatusAfterOrchestration ?? recoveryCase.status,
          amountAtRisk,
          recoveredAmount: orchestrationOutcome.actionResult?.recoveredAmount ?? recoveredAmount,
        });

        logger.info(
          {
            agentRunId,
            nextState: outcomeResult.nextState,
            isRecovered: outcomeResult.isRecovered,
            isTerminal: outcomeResult.isTerminal,
          },
          "Action outcome evaluated by M8.2",
        );

        if (outcomeResult.nextState === "RECOVERED") {
          await recoveryAgentStateService.transition(
            agentRunId,
            currentState,
            "RECOVERED",
            outcomeResult.reason,
          );
          currentState = "RECOVERED";
          finalStatus = "COMPLETED";
          isRecovered = true;
          recoveredAmount = outcomeResult.recoveredAmount;
          stopReason = "CASE_RECOVERED";

          iterations.push({
            iteration: currentIteration,
            state: currentState,
            actionId: lastActionId,
            decisionId: activeDecision.decisionId,
            actionOutcome: orchestrationOutcome,
            stopReason: "CASE_RECOVERED",
            shouldContinue: false,
            message: outcomeResult.reason,
          });
          break;
        }

        if (outcomeResult.nextState === "WAITING") {
          await recoveryAgentStateService.transition(
            agentRunId,
            currentState,
            "WAITING",
            outcomeResult.reason,
          );
          currentState = "WAITING";
          finalStatus = "WAITING";
          stopReason = "WAITING_FOR_OUTCOME";

          iterations.push({
            iteration: currentIteration,
            state: currentState,
            actionId: lastActionId,
            decisionId: activeDecision.decisionId,
            actionOutcome: orchestrationOutcome,
            shouldContinue: false,
            message: outcomeResult.reason,
          });
          break;
        }

        if (outcomeResult.nextState === "HUMAN_REVIEW") {
          await escalationService.escalate(
            agentRunId,
            input.recoveryCaseId,
            outcomeResult.reason,
          );
          currentState = "HUMAN_REVIEW";
          finalStatus = "HUMAN_REVIEW";
          stopReason = "HUMAN_REVIEW_REQUIRED";

          iterations.push({
            iteration: currentIteration,
            state: currentState,
            actionId: lastActionId,
            decisionId: activeDecision.decisionId,
            actionOutcome: orchestrationOutcome,
            stopReason: "HUMAN_REVIEW_REQUIRED",
            shouldContinue: false,
            message: outcomeResult.reason,
          });
          break;
        }

        if (outcomeResult.nextState === "STOPPED") {
          await recoveryAgentStateService.transition(
            agentRunId,
            currentState,
            "STOPPED",
            outcomeResult.reason,
          );
          currentState = "STOPPED";
          finalStatus = "STOPPED";
          stopReason = "POLICY_STOP";

          iterations.push({
            iteration: currentIteration,
            state: currentState,
            actionId: lastActionId,
            decisionId: activeDecision.decisionId,
            actionOutcome: orchestrationOutcome,
            stopReason: "POLICY_STOP",
            shouldContinue: false,
            message: outcomeResult.reason,
          });
          break;
        }

        // Action failed, advance to next iteration
        iterations.push({
          iteration: currentIteration,
          state: currentState,
          actionId: lastActionId,
          decisionId: activeDecision.decisionId,
          actionOutcome: orchestrationOutcome,
          shouldContinue: true,
          message: outcomeResult.reason,
        });

        // Reset current decision so next iteration generates fresh recommendation
        currentDecisionId = null;
        currentIteration++;
      }

      // 10. Check if Loop Terminated due to Max Iterations
      if (currentIteration > maxIterations && finalStatus === "RUNNING") {
        await recoveryAgentStateService.transition(
          agentRunId,
          currentState,
          "STOPPED",
          `Maximum iterations (${maxIterations}) reached.`,
        );
        currentState = "STOPPED";
        finalStatus = "STOPPED";
        stopReason = "MAX_AGENT_ITERATIONS";
      }

      const completedAt = new Date();

      // 11. Final Update on Agent Run Record
      await agentRunRepository.update(agentRunId, {
        status: finalStatus,
        currentState,
        iteration: Math.min(currentIteration, maxIterations),
        lastActionId,
        currentDecisionId,
        completedAt,
        stopReason,
      });

      return {
        agentRunId,
        recoveryCaseId: input.recoveryCaseId,
        status: finalStatus,
        finalState: currentState,
        totalIterations: iterations.length,
        recovered: isRecovered,
        recoveredAmount,
        stopReason,
        lastActionId,
        currentDecisionId,
        iterations,
        startedAt,
        completedAt,
        message: `Recovery agent completed with state '${currentState}'. Reason: ${stopReason || "NONE"}.`,
      };
    } finally {
      await idempotencyService.releaseLock(lockKey);
    }
  }

  /**
   * Handle an incoming real-time webhook event for an active recovery case.
   */
  public async handleWebhookEvent(input: {
    eventType: string;
    recoveryCaseId: string;
    merchantId: string;
    paymentStatus?: string;
    amount?: number;
  }): Promise<{ handled: boolean; message: string }> {
    logger.info(
      {
        eventType: input.eventType,
        recoveryCaseId: input.recoveryCaseId,
      },
      "Recovery agent handling incoming real-time webhook event",
    );

    const eventType = input.eventType.toLowerCase();

    if (eventType.includes("payment.captured") || eventType.includes("payment.authorized")) {
      // Payment captured -> update case to RECOVERED and close active agent runs
      const activeRun = await agentRunRepository.findActiveByRecoveryCaseId(input.recoveryCaseId);

      await prisma.recoveryCase.update({
        where: { id: input.recoveryCaseId },
        data: {
          status: "RECOVERED",
          recoveredAmount: input.amount ?? undefined,
          recoveredAt: new Date(),
          lastActionAt: new Date(),
        },
      });

      if (activeRun) {
        await recoveryAgentStateService.transition(
          activeRun.agentRunId,
          activeRun.currentState as RecoveryAgentState,
          "RECOVERED",
          "Payment captured via real-time webhook event.",
        );
      }

      return {
        handled: true,
        message: "Payment captured webhook processed; recovery case marked RECOVERED.",
      };
    }

    return {
      handled: true,
      message: `Webhook event '${input.eventType}' processed.`,
    };
  }
}

export const recoveryAgentService = new RecoveryAgentService();
