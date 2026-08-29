import {
  Request,
  Response,
} from "express";

import {
  createAIDecisionSchema,
  decisionIdSchema,
  updateDecisionOutcomeSchema,
} from "./decision.schema";

import {
  aiDecisionService,
} from "./decision.service";

/**
 * ============================================================
 * M6.9 — CREATE AI DECISION
 * ============================================================
 */
export async function createAIDecisionController(
  req: Request,
  res: Response
) {
  const parsed =
    createAIDecisionSchema.safeParse(
      req.body
    );

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      details:
        parsed.error.flatten(),
    });
  }

  try {
    const data =
      parsed.data;

    const decision =
      await aiDecisionService.createDecision({
        customerId:
          data.customer_id,

        merchantId:
          data.merchant_id,

        recoveryCaseId:
          data.recovery_case_id ?? null,

        currency:
          data.currency,

        probability:
          data.probability,

        probabilityPercent:
          data.probabilityPercent,

        probabilityBand:
          data.probabilityBand,

        probabilityConfidence:
          data.probabilityConfidence,

        priorityScore:
          data.priorityScore,

        priorityBand:
          data.priorityBand,

        urgencyScore:
          data.urgencyScore,

        opportunityScore:
          data.opportunityScore,

        riskScore:
          data.riskScore,

        amountScore:
          data.amountScore,

        strategy:
          data.strategy,

        channel:
          data.channel,

        timing:
          data.timing,

        strategyScore:
          data.strategyScore,

        decisionConfidence:
          data.decisionConfidence,

        decisionReason:
          data.decisionReason,

        modelVersions:
          data.modelVersions,

        inputFeatures:
          data.inputFeatures,

        positiveSignals:
          data.positiveSignals,

        negativeSignals:
          data.negativeSignals,

        alternatives:
          data.alternatives,
      });

    return res.status(201).json({
      success: true,

      decision: {
        decision_id:
          decision.decisionId,

        customer_id:
          decision.customerId,

        merchant_id:
          decision.merchantId,

        recovery_case_id:
          decision.recoveryCaseId,

        currency:
          decision.currency,

        probability:
          decision.probability,

        probabilityPercent:
          decision.probabilityPercent,

        probabilityBand:
          decision.probabilityBand,

        probabilityConfidence:
          decision.probabilityConfidence,

        priorityScore:
          decision.priorityScore,

        priorityBand:
          decision.priorityBand,

        urgencyScore:
          decision.urgencyScore,

        opportunityScore:
          decision.opportunityScore,

        riskScore:
          decision.riskScore,

        amountScore:
          decision.amountScore,

        strategy:
          decision.strategy,

        channel:
          decision.channel,

        timing:
          decision.timing,

        strategyScore:
          decision.strategyScore,

        decisionConfidence:
          decision.decisionConfidence,

        decisionStatus:
          decision.decisionStatus,

        decisionReason:
          decision.decisionReason,

        modelVersions:
          decision.modelVersions,

        inputFeatures:
          decision.inputFeatures,

        positiveSignals:
          decision.positiveSignals,

        negativeSignals:
          decision.negativeSignals,

        alternatives:
          decision.alternatives,

        createdAt:
          decision.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,

      error:
        error?.message ??
        "Failed to create AI decision record",
    });
  }
}

/**
 * ============================================================
 * GET AI DECISION
 * ============================================================
 */
export async function getAIDecisionController(
  req: Request,
  res: Response
) {
  const parsed =
    decisionIdSchema.safeParse(
      req.params
    );

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      details:
        parsed.error.flatten(),
    });
  }

  try {
    const decision =
      await aiDecisionService.getDecision(
        parsed.data.decision_id
      );

    if (!decision) {
      return res.status(404).json({
        success: false,
        error: "DECISION_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      decision,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error:
        error?.message ??
        "Failed to retrieve AI decision",
    });
  }
}

/**
 * ============================================================
 * GET CUSTOMER DECISIONS
 * ============================================================
 */
export async function getCustomerAIDecisionsController(
  req: Request,
  res: Response
) {
  const customerId =
    String(req.params.customer_id);

  if (!customerId) {
    return res.status(400).json({
      success: false,
      error: "CUSTOMER_ID_REQUIRED",
    });
  }

  const rawLimit =
    Number(req.query.limit ?? 20);

  try {
    const decisions =
      await aiDecisionService.getCustomerDecisions(
        customerId,
        Number.isFinite(rawLimit)
          ? rawLimit
          : 20
      );

    return res.status(200).json({
      success: true,

      customer_id:
        customerId,

      count:
        decisions.length,

      decisions,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error:
        error?.message ??
        "Failed to retrieve customer AI decisions",
    });
  }
}

/**
 * ============================================================
 * RECORD OUTCOME
 * ============================================================
 */
export async function recordAIDecisionOutcomeController(
  req: Request,
  res: Response
) {
  const idParsed =
    decisionIdSchema.safeParse(
      req.params
    );

  if (!idParsed.success) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      details:
        idParsed.error.flatten(),
    });
  }

  const bodyParsed =
    updateDecisionOutcomeSchema.safeParse(
      req.body
    );

  if (!bodyParsed.success) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      details:
        bodyParsed.error.flatten(),
    });
  }

  try {
    const decision =
      await aiDecisionService.recordOutcome(
        idParsed.data.decision_id,

        bodyParsed.data.outcome,

        bodyParsed.data
          .outcome_amount
      );

    return res.status(200).json({
      success: true,

      decision,
    });
  } catch (error: any) {
    if (
      error?.message ===
      "AI decision not found"
    ) {
      return res.status(404).json({
        success: false,
        error:
          "DECISION_NOT_FOUND",
      });
    }

    if (
      error?.message ===
      "Decision outcome has already been recorded"
    ) {
      return res.status(409).json({
        success: false,
        error:
          "OUTCOME_ALREADY_RECORDED",
      });
    }

    return res.status(500).json({
      success: false,
      error:
        error?.message ??
        "Failed to record decision outcome",
    });
  }
}