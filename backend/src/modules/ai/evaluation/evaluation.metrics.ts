/**
 * ============================================================
 * RevenueOS — M6.15 AI EVALUATION METRICS
 * ============================================================
 *
 * Pure metric calculations.
 *
 * This file contains NO database calls.
 *
 * Responsibilities:
 *
 * - Evaluate individual decisions
 * - Calculate probability metrics
 * - Calculate confidence metrics
 * - Calculate strategy metrics
 * - Calculate safety metrics
 * - Calculate audit observability
 * - Calculate model-version comparison
 * - Calculate pipeline health
 *
 * M6.15 OBSERVABILITY PRINCIPLES
 * ------------------------------
 *
 * 1. M6.12 audit logs are the source of truth for pipeline
 *    lifecycle observability.
 *
 * 2. M6.13 safety snapshots are the source of truth for
 *    safety decision and risk-level observability.
 *
 * 3. Decision outcomes must NOT be used to pretend that
 *    a pipeline run succeeded or failed when audit information
 *    is available.
 *
 * 4. Model versions are preserved exactly as recorded by the
 *    decision snapshot so historical v1/v2 comparison remains
 *    possible after M6.14 promotion.
 *
 * 5. This module never modifies a decision and never executes
 *    a recovery action.
 *
 * 6. A pipeline execution is correlated using decisionId when
 *    audit lifecycle events expose it.
 *
 * 7. A single pipeline execution cannot simultaneously count as
 *    both successful and failed.
 *
 * ============================================================
 */

import type {
  AIDecisionRecord,
} from "../decision/decision.types";

import type {
  AIAuditLogRecord,
} from "../audit/audit.types";

import type {
  DecisionEvaluation,
  ProbabilityEvaluationMetrics,
  ConfidenceEvaluationMetrics,
  SafetyEvaluationMetrics,
  StrategyEvaluationMetric,
  ModelVersionEvaluationMetric,
  AuditObservabilityMetrics,
  PipelineEvaluationMetrics,
  PipelineHealth,
} from "./evaluation.types";


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const HIGH_CONFIDENCE_THRESHOLD = 0.80;

const MEDIUM_CONFIDENCE_THRESHOLD = 0.60;

const GOOD_ERROR_THRESHOLD = 0.25;

const ACCEPTABLE_ERROR_THRESHOLD = 0.50;


/**
 * ============================================================
 * ROUNDING
 * ============================================================
 */

export function round(
  value: number,
  decimals = 4,
): number {

  const multiplier =
    Math.pow(
      10,
      decimals,
    );

  return (
    Math.round(
      value * multiplier,
    ) / multiplier
  );
}


/**
 * ============================================================
 * SAFE NUMBER
 * ============================================================
 */

function finiteOrNull(
  value: unknown,
): number | null {

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {

    return null;
  }

  return value;
}


/**
 * ============================================================
 * SAFETY SNAPSHOT
 * ============================================================
 */

interface SafetySnapshot {

  decision:
    | "ALLOW"
    | "BLOCK"
    | "REQUIRE_HUMAN_REVIEW"
    | null;

  allowed:
    | boolean
    | null;

  riskLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL"
    | null;
}


/**
 * ============================================================
 * EXTRACT SAFETY
 * ============================================================
 */

function extractSafety(
  decision: AIDecisionRecord,
): SafetySnapshot {

  const features =
    decision.inputFeatures;


  if (
    !features ||
    typeof features !== "object"
  ) {

    return {
      decision: null,
      allowed: null,
      riskLevel: null,
    };
  }


  const featureRecord =
    features as Record<
      string,
      unknown
    >;


  /**
   * Preferred M6.13 location.
   */
  const safety =
    featureRecord.safety;


  if (
    safety &&
    typeof safety === "object"
  ) {

    return parseSafetyObject(
      safety as Record<
        string,
        unknown
      >,
    );
  }


  /**
   * Historical compatibility.
   */
  const policySafety =
    featureRecord.policySafety;


  if (
    policySafety &&
    typeof policySafety === "object"
  ) {

    return parseSafetyObject(
      policySafety as Record<
        string,
        unknown
      >,
    );
  }


  return {
    decision: null,
    allowed: null,
    riskLevel: null,
  };
}


/**
 * ============================================================
 * PARSE SAFETY OBJECT
 * ============================================================
 */

function parseSafetyObject(
  source: Record<string, unknown>,
): SafetySnapshot {

  const decision =
    source.decision;

  const allowed =
    source.allowed;

  const riskLevel =
    source.riskLevel;


  return {

    decision:
      decision === "ALLOW" ||
      decision === "BLOCK" ||
      decision === "REQUIRE_HUMAN_REVIEW"
        ? decision
        : null,

    allowed:
      typeof allowed === "boolean"
        ? allowed
        : null,

    riskLevel:
      riskLevel === "LOW" ||
      riskLevel === "MEDIUM" ||
      riskLevel === "HIGH" ||
      riskLevel === "CRITICAL"
        ? riskLevel
        : null,
  };
}


/**
 * ============================================================
 * EVALUATE ONE DECISION
 * ============================================================
 */

export function evaluateDecision(
  decision: AIDecisionRecord,
): DecisionEvaluation {

  const predictedProbability =
    finiteOrNull(
      decision.probability,
    );


  const confidence =
    finiteOrNull(
      decision.decisionConfidence,
    );


  const safety =
    extractSafety(
      decision,
    );


  /**
   * ----------------------------------------------------------
   * INVALID PREDICTION
   * ----------------------------------------------------------
   */

  if (
    predictedProbability === null ||
    predictedProbability < 0 ||
    predictedProbability > 1
  ) {

    return {

      decisionId:
        decision.decisionId,

      status:
        "INVALID",

      quality:
        "UNKNOWN",

      recovered:
        null,

      recoveredAmount:
        decision.outcomeAmount ?? null,

      predictedProbability:
        predictedProbability,

      actualOutcome:
        null,

      predictionError:
        null,

      strategy:
        decision.strategy,

      confidence:
        confidence ?? 0,

      safetyDecision:
        safety.decision,

      safetyRiskLevel:
        safety.riskLevel,

      modelVersions:
        {
          ...decision.modelVersions,
        },

      evaluatedAt:
        new Date(),
    };
  }


  /**
   * ----------------------------------------------------------
   * PENDING OUTCOME
   * ----------------------------------------------------------
   */

  if (
    decision.outcome === null ||
    decision.outcome === "PENDING"
  ) {

    return {

      decisionId:
        decision.decisionId,

      status:
        "PENDING_OUTCOME",

      quality:
        "UNKNOWN",

      recovered:
        null,

      recoveredAmount:
        null,

      predictedProbability,

      actualOutcome:
        null,

      predictionError:
        null,

      strategy:
        decision.strategy,

      confidence:
        confidence ?? 0,

      safetyDecision:
        safety.decision,

      safetyRiskLevel:
        safety.riskLevel,

      modelVersions:
        {
          ...decision.modelVersions,
        },

      evaluatedAt:
        new Date(),
    };
  }


  /**
   * ----------------------------------------------------------
   * RECOVERY OUTCOME
   * ----------------------------------------------------------
   *
   * RECOVERED and PARTIALLY_RECOVERED are treated as
   * positive recovery outcomes.
   */

  const recovered =
    decision.outcome === "RECOVERED" ||
    decision.outcome === "PARTIALLY_RECOVERED";


  const actualOutcome =
    recovered
      ? 1
      : 0;


  const predictionError =
    Math.abs(
      predictedProbability -
      actualOutcome,
    );


  let quality:
    | "GOOD"
    | "ACCEPTABLE"
    | "POOR";


  if (
    predictionError <=
    GOOD_ERROR_THRESHOLD
  ) {

    quality =
      "GOOD";

  } else if (
    predictionError <=
    ACCEPTABLE_ERROR_THRESHOLD
  ) {

    quality =
      "ACCEPTABLE";

  } else {

    quality =
      "POOR";
  }


  return {

    decisionId:
      decision.decisionId,

    status:
      "EVALUATED",

    quality,

    recovered,

    recoveredAmount:
      decision.outcomeAmount ?? 0,

    predictedProbability,

    actualOutcome,

    predictionError,

    strategy:
      decision.strategy,

    confidence:
      confidence ?? 0,

    safetyDecision:
      safety.decision,

    safetyRiskLevel:
      safety.riskLevel,

    modelVersions:
      {
        ...decision.modelVersions,
      },

    evaluatedAt:
      new Date(),
  };
}


/**
 * ============================================================
 * PROBABILITY METRICS
 * ============================================================
 */

export function calculateProbabilityMetrics(
  evaluations: DecisionEvaluation[],
): ProbabilityEvaluationMetrics {

  const evaluated =
    evaluations.filter(
      (item) =>
        item.status ===
        "EVALUATED",
    );


  const pending =
    evaluations.filter(
      (item) =>
        item.status ===
        "PENDING_OUTCOME",
    );


  const recoveredCount =
    evaluated.filter(
      (item) =>
        item.recovered === true,
    ).length;


  const notRecoveredCount =
    evaluated.filter(
      (item) =>
        item.recovered === false,
    ).length;


  const probabilities =
    evaluated
      .map(
        (item) =>
          item.predictedProbability,
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null &&
          Number.isFinite(
            value,
          ),
      );


  const errors =
    evaluated
      .map(
        (item) =>
          item.predictionError,
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null &&
          Number.isFinite(
            value,
          ),
      );


  const brierValues =
    evaluated
      .filter(
        (item) =>
          item.actualOutcome !== null &&
          item.predictedProbability !== null &&
          Number.isFinite(
            item.predictedProbability,
          ),
      )
      .map(
        (item) =>
          Math.pow(
            item.predictedProbability! -
            (item.actualOutcome ?? 0),
            2,
          ),
      );


  const averagePredictedProbability =
    probabilities.length > 0
      ? round(
          probabilities.reduce(
            (
              sum,
              value,
            ) =>
              sum + value,
            0,
          ) /
          probabilities.length,
        )
      : null;


  const meanAbsoluteError =
    errors.length > 0
      ? round(
          errors.reduce(
            (
              sum,
              value,
            ) =>
              sum + value,
            0,
          ) /
          errors.length,
        )
      : null;


  const brierScore =
    brierValues.length > 0
      ? round(
          brierValues.reduce(
            (
              sum,
              value,
            ) =>
              sum + value,
            0,
          ) /
          brierValues.length,
        )
      : null;


  const actualRecoveryRate =
    evaluated.length > 0
      ? round(
          recoveredCount /
          evaluated.length,
        )
      : null;


  return {

    totalPredictions:
      evaluations.length,

    evaluatedPredictions:
      evaluated.length,

    pendingPredictions:
      pending.length,

    recoveredCount,

    notRecoveredCount,

    meanAbsoluteError,

    brierScore,

    averagePredictedProbability,

    actualRecoveryRate,
  };
}


/**
 * ============================================================
 * CONFIDENCE METRICS
 * ============================================================
 */

export function calculateConfidenceMetrics(
  evaluations: DecisionEvaluation[],
): ConfidenceEvaluationMetrics {

  const valid =
    evaluations.filter(
      (item) =>
        item.status !==
        "INVALID",
    );


  const averageConfidence =
    valid.length > 0
      ? round(
          valid.reduce(
            (
              sum,
              item,
            ) =>
              sum + item.confidence,
            0,
          ) /
          valid.length,
        )
      : null;


  const high =
    valid.filter(
      (item) =>
        item.confidence >=
        HIGH_CONFIDENCE_THRESHOLD,
    );


  const medium =
    valid.filter(
      (item) =>
        item.confidence >=
        MEDIUM_CONFIDENCE_THRESHOLD &&
        item.confidence <
        HIGH_CONFIDENCE_THRESHOLD,
    );


  const low =
    valid.filter(
      (item) =>
        item.confidence <
        MEDIUM_CONFIDENCE_THRESHOLD,
    );


  const recoveryRate =
    (
      items: DecisionEvaluation[],
    ): number | null => {

      const evaluated =
        items.filter(
          (item) =>
            item.status ===
            "EVALUATED",
        );


      if (
        evaluated.length === 0
      ) {

        return null;
      }


      const recovered =
        evaluated.filter(
          (item) =>
            item.recovered === true,
        ).length;


      return round(
        recovered /
        evaluated.length,
      );
    };


  return {

    totalDecisions:
      evaluations.length,

    averageConfidence,

    highConfidenceDecisions:
      high.length,

    mediumConfidenceDecisions:
      medium.length,

    lowConfidenceDecisions:
      low.length,

    highConfidenceRecoveryRate:
      recoveryRate(high),

    mediumConfidenceRecoveryRate:
      recoveryRate(medium),

    lowConfidenceRecoveryRate:
      recoveryRate(low),
  };
}


/**
 * ============================================================
 * SAFETY METRICS
 * ============================================================
 */

export function calculateSafetyMetrics(
  evaluations: DecisionEvaluation[],
): SafetyEvaluationMetrics {

  const safetyEvaluated =
    evaluations.filter(
      (item) =>
        item.safetyDecision !== null ||
        item.safetyRiskLevel !== null,
    );


  const allowed =
    safetyEvaluated.filter(
      (item) =>
        item.safetyDecision ===
        "ALLOW",
    ).length;


  const blocked =
    safetyEvaluated.filter(
      (item) =>
        item.safetyDecision ===
        "BLOCK",
    ).length;


  const humanReviewRequired =
    safetyEvaluated.filter(
      (item) =>
        item.safetyDecision ===
        "REQUIRE_HUMAN_REVIEW",
    ).length;


  const total =
    safetyEvaluated.length;


  const rate =
    (
      count: number,
    ): number =>
      total > 0
        ? round(
            count /
            total,
          )
        : 0;


  const criticalRiskCount =
    safetyEvaluated.filter(
      (item) =>
        item.safetyRiskLevel ===
        "CRITICAL",
    ).length;


  const highRiskCount =
    safetyEvaluated.filter(
      (item) =>
        item.safetyRiskLevel ===
        "HIGH",
    ).length;


  const mediumRiskCount =
    safetyEvaluated.filter(
      (item) =>
        item.safetyRiskLevel ===
        "MEDIUM",
    ).length;


  const lowRiskCount =
    safetyEvaluated.filter(
      (item) =>
        item.safetyRiskLevel ===
        "LOW",
    ).length;


  return {

    totalEvaluated:
      total,

    allowed,

    blocked,

    humanReviewRequired,

    safetyBlockRate:
      rate(blocked),

    humanReviewRate:
      rate(humanReviewRequired),

    criticalRiskCount,

    highRiskCount,

    mediumRiskCount,

    lowRiskCount,
  };
}


/**
 * ============================================================
 * STRATEGY METRICS
 * ============================================================
 */

export function calculateStrategyMetrics(
  evaluations: DecisionEvaluation[],
): StrategyEvaluationMetric[] {

  const strategies =
    new Set(
      evaluations.map(
        (item) =>
          item.strategy,
      ),
    );


  return Array.from(
    strategies,
  ).map(
    (strategy) => {

      const items =
        evaluations.filter(
          (item) =>
            item.strategy ===
            strategy,
        );


      const evaluated =
        items.filter(
          (item) =>
            item.status ===
            "EVALUATED",
        );


      const recovered =
        evaluated.filter(
          (item) =>
            item.recovered === true,
        ).length;


      const validProbabilities =
        items
          .map(
            (item) =>
              item.predictedProbability,
          )
          .filter(
            (value): value is number =>
              value !== null &&
              Number.isFinite(
                value,
              ),
          );


      return {

        strategy,

        totalDecisions:
          items.length,

        evaluatedDecisions:
          evaluated.length,

        recoveredCount:
          recovered,

        recoveryRate:
          evaluated.length > 0
            ? round(
                recovered /
                evaluated.length,
              )
            : null,

        averageConfidence:
          items.length > 0
            ? round(
                items.reduce(
                  (
                    sum,
                    item,
                  ) =>
                    sum + item.confidence,
                  0,
                ) /
                items.length,
              )
            : null,

        averageProbability:
          validProbabilities.length > 0
            ? round(
                validProbabilities.reduce(
                  (
                    sum,
                    value,
                  ) =>
                    sum + value,
                  0,
                ) /
                validProbabilities.length,
              )
            : null,
      };
    },
  );
}


/**
 * ============================================================
 * MODEL VERSION METRICS
 * ============================================================
 */

export function calculateModelVersionMetrics(
  evaluations: DecisionEvaluation[],
): ModelVersionEvaluationMetric[] {

  const grouped =
    new Map<
      string,
      {
        modelId: string;
        version: string;
        evaluations: DecisionEvaluation[];
      }
    >();


  /**
   * ----------------------------------------------------------
   * GROUP BY MODEL ID + VERSION
   * ----------------------------------------------------------
   */

  for (
    const evaluation
    of evaluations
  ) {

    for (
      const [
        modelId,
        version,
      ]
      of Object.entries(
        evaluation.modelVersions,
      )
    ) {

      if (
        !version ||
        typeof version !== "string"
      ) {
        continue;
      }


      const key =
        `${modelId}:${version}`;


      const existing =
        grouped.get(
          key,
        );


      if (existing) {

        existing.evaluations.push(
          evaluation,
        );

      } else {

        grouped.set(
          key,
          {
            modelId,
            version,
            evaluations: [
              evaluation,
            ],
          },
        );
      }
    }
  }


  /**
   * ----------------------------------------------------------
   * CALCULATE EACH VERSION
   * ----------------------------------------------------------
   */

  return Array.from(
    grouped.values(),
  ).map(
    ({
      modelId,
      version,
      evaluations,
    }) => {

      const evaluated =
        evaluations.filter(
          (item) =>
            item.status ===
            "EVALUATED",
        );


      const recovered =
        evaluated.filter(
          (item) =>
            item.recovered === true,
        ).length;


      const probabilities =
        evaluations
          .map(
            (item) =>
              item.predictedProbability,
          )
          .filter(
            (value): value is number =>
              value !== null &&
              Number.isFinite(
                value,
              ),
          );


      const confidence =
        evaluations
          .map(
            (item) =>
              item.confidence,
          )
          .filter(
            (value): value is number =>
              value !== null &&
              Number.isFinite(
                value,
              ),
          );


      const errors =
        evaluated
          .map(
            (item) =>
              item.predictionError,
          )
          .filter(
            (
              value,
            ): value is number =>
              value !== null &&
              Number.isFinite(
                value,
              ),
          );


      const brier =
        evaluated
          .filter(
            (item) =>
              item.actualOutcome !== null &&
              item.predictedProbability !== null &&
              Number.isFinite(
                item.predictedProbability,
              ),
          )
          .map(
            (item) =>
              Math.pow(
                item.predictedProbability! -
                (item.actualOutcome ?? 0),
                2,
              ),
          );


      return {

        modelId,

        version,

        decisions:
          evaluations.length,

        evaluatedDecisions:
          evaluated.length,

        recoveredCount:
          recovered,

        recoveryRate:
          evaluated.length > 0
            ? round(
                recovered /
                evaluated.length,
              )
            : null,

        averageProbability:
          probabilities.length > 0
            ? round(
                probabilities.reduce(
                  (
                    sum,
                    value,
                  ) =>
                    sum + value,
                  0,
                ) /
                probabilities.length,
              )
            : null,

        averageConfidence:
          confidence.length > 0
            ? round(
                confidence.reduce(
                  (
                    sum,
                    value,
                  ) =>
                    sum + value,
                  0,
                ) /
                confidence.length,
              )
            : null,

        meanAbsoluteError:
          errors.length > 0
            ? round(
                errors.reduce(
                  (
                    sum,
                    value,
                  ) =>
                    sum + value,
                  0,
                ) /
                errors.length,
              )
            : null,

        brierScore:
          brier.length > 0
            ? round(
                brier.reduce(
                  (
                    sum,
                    value,
                  ) =>
                    sum + value,
                  0,
                ) /
                brier.length,
              )
            : null,
      };
    },
  );
}


/**
 * ============================================================
 * MODEL VERSION COMPARISON
 * ============================================================
 */

export function compareModelVersions(
  evaluations: DecisionEvaluation[],
  modelId: string,
): ModelVersionEvaluationMetric[] {

  return calculateModelVersionMetrics(
    evaluations,
  ).filter(
    (metric) =>
      metric.modelId ===
      modelId,
  );
}


/**
 * ============================================================
 * AUDIT PIPELINE LIFECYCLE HELPERS
 * ============================================================
 *
 * M6.12 audit events are the source of truth for pipeline
 * lifecycle.
 *
 * The important distinction is:
 *
 * EVENT COUNT != PIPELINE RUN COUNT
 *
 * One pipeline run can generate multiple audit events:
 *
 * STARTED
 * PROBABILITY
 * STRATEGY
 * SAFETY
 * COMPLETED
 *
 * Therefore lifecycle metrics must be correlated by the
 * pipeline/decision identifier.
 *
 * RevenueOS currently uses decisionId as the correlation
 * identifier when it is available.
 * ============================================================
 */


/**
 * Extract a stable pipeline correlation ID.
 *
 * `decisionId` is the preferred M6.12 correlation key.
 *
 * The fallback below is intentionally defensive so that this
 * pure metrics module remains compatible with historical audit
 * records that may expose a similarly named identifier.
 */
function getAuditCorrelationId(
  event: AIAuditLogRecord,
): string | null {

  const source =
    event as unknown as Record<
      string,
      unknown
    >;


  const candidates = [
    source.decisionId,
    source.pipelineRunId,
    source.runId,
  ];


  for (
    const candidate
    of candidates
  ) {

    if (
      typeof candidate === "string" &&
      candidate.trim().length > 0
    ) {

      return candidate;
    }
  }


  return null;
}


/**
 * ============================================================
 * AUDIT OBSERVABILITY
 * ============================================================
 */

export function calculateAuditObservability(
  auditLogs: AIAuditLogRecord[],
): AuditObservabilityMetrics {

  /**
   * ----------------------------------------------------------
   * EVENT STATUS COUNTS
   * ----------------------------------------------------------
   */

  const successfulEvents =
    auditLogs.filter(
      (event) =>
        event.status ===
        "SUCCESS",
    ).length;


  const failedEvents =
    auditLogs.filter(
      (event) =>
        event.status ===
        "FAILED",
    ).length;


  const skippedEvents =
    auditLogs.filter(
      (event) =>
        event.status ===
        "SKIPPED",
    ).length;


  /**
   * ----------------------------------------------------------
   * FAILED STAGES
   * ----------------------------------------------------------
   */

  const failedStages:
    Record<string, number> = {};


  for (
    const event
    of auditLogs
  ) {

    if (
      event.status !==
      "FAILED"
    ) {
      continue;
    }


    const stage =
      String(
        event.stage,
      );


    failedStages[stage] =
      (
        failedStages[stage] ??
        0
      ) + 1;
  }


  /**
   * ----------------------------------------------------------
   * FALLBACK OBSERVABILITY
   * ----------------------------------------------------------
   */

  const fallbackEvents =
    auditLogs.filter(
      (event) =>
        event.eventType ===
        "FALLBACK_EVALUATED",
    ).length;


  const fallbackRequiredEvents =
    auditLogs.filter(
      (event) =>
        event.eventType ===
        "FALLBACK_EVALUATED" &&
        event.fallbackRequired ===
        true,
    ).length;


  /**
   * ----------------------------------------------------------
   * DECISION LIFECYCLE EVENT COUNTS
   * ----------------------------------------------------------
   */

  const decisionStartedEvents =
    auditLogs.filter(
      (event) =>
        event.eventType ===
        "AI_DECISION_STARTED",
    ).length;


  const decisionCompletedEvents =
    auditLogs.filter(
      (event) =>
        event.eventType ===
        "AI_DECISION_COMPLETED",
    ).length;


  const decisionFailedEvents =
    auditLogs.filter(
      (event) =>
        event.eventType ===
        "AI_DECISION_FAILED",
    ).length;


  /**
   * ----------------------------------------------------------
   * PIPELINE LIFECYCLE CORRELATION
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Do NOT simply do:
   *
   * successfulRuns = completedEvents
   * failedRuns     = failedEvents
   *
   * because those are event counts, not execution counts.
   *
   * Instead:
   *
   * 1. Group lifecycle events by decisionId.
   * 2. Treat each decisionId as one pipeline execution.
   * 3. A terminal FAILED state wins over COMPLETED if the
   *    same execution contains both terminal markers.
   *
   * This guarantees:
   *
   * successfulRuns + failedRuns <= totalRuns
   *
   * and prevents a single run from being counted twice.
   * ----------------------------------------------------------
   */

  interface PipelineLifecycleState {

    started: boolean;

    completed: boolean;

    failed: boolean;
  }


  const lifecycleById =
    new Map<
      string,
      PipelineLifecycleState
    >();


  for (
    const event
    of auditLogs
  ) {

    const eventType =
      event.eventType;


    const isLifecycleEvent =
      eventType ===
        "AI_DECISION_STARTED" ||
      eventType ===
        "AI_DECISION_COMPLETED" ||
      eventType ===
        "AI_DECISION_FAILED";


    if (!isLifecycleEvent) {
      continue;
    }


    const correlationId =
      getAuditCorrelationId(
        event,
      );


    /**
     * Without a correlation ID, the event cannot safely be
     * assigned to a specific execution.
     *
     * We therefore do not fabricate correlation between
     * unrelated audit events.
     */
    if (!correlationId) {
      continue;
    }


    const existing =
      lifecycleById.get(
        correlationId,
      );


    const state =
      existing ?? {
        started: false,
        completed: false,
        failed: false,
      };


    if (
      eventType ===
      "AI_DECISION_STARTED"
    ) {

      state.started =
        true;
    }


    if (
      eventType ===
      "AI_DECISION_COMPLETED"
    ) {

      state.completed =
        true;
    }


    if (
      eventType ===
      "AI_DECISION_FAILED"
    ) {

      state.failed =
        true;
    }


    lifecycleById.set(
      correlationId,
      state,
    );
  }


  /**
   * ----------------------------------------------------------
   * PIPELINE RUN COUNTS
   * ----------------------------------------------------------
   *
   * Prefer explicitly started pipeline executions.
   *
   * If historical data has terminal events without STARTED,
   * include those correlated executions as well so they are
   * not silently discarded.
   * ----------------------------------------------------------
   */

  const correlatedPipelineIds =
    new Set(
      lifecycleById.keys(),
    );


  const pipelineRuns =
    correlatedPipelineIds.size;


  /**
   * ----------------------------------------------------------
   * TERMINAL STATE
   * ----------------------------------------------------------
   *
   * FAILED takes precedence over COMPLETED for the same
   * correlation ID.
   *
   * This prevents:
   *
   * STARTED
   * COMPLETED
   * FAILED
   *
   * from becoming:
   *
   * success = 1
   * failure = 1
   *
   * Instead the execution is classified once.
   * ----------------------------------------------------------
   */

  let successfulPipelineRuns =
    0;


  let failedPipelineRuns =
    0;


  for (
    const state
    of lifecycleById.values()
  ) {

    if (state.failed) {

      failedPipelineRuns++;

    } else if (
      state.completed
    ) {

      successfulPipelineRuns++;
    }
  }


  /**
   * ----------------------------------------------------------
   * UNCORRELATED FALLBACK
   * ----------------------------------------------------------
   *
   * Some historical audit fixtures may not contain a
   * decisionId. We intentionally do NOT infer successful and
   * failed runs independently because that recreates the
   * double-counting bug.
   *
   * When there is no correlation data at all, pipelineRuns
   * remains zero and calculatePipelineMetrics() can use its
   * documented pure-evaluation fallback.
   * ----------------------------------------------------------
   */


  /**
   * ----------------------------------------------------------
   * RATES
   * ----------------------------------------------------------
   */

  const fallbackRate =
    pipelineRuns > 0
      ? round(
          fallbackRequiredEvents /
          pipelineRuns,
        )
      : 0;


  const pipelineSuccessRate =
    pipelineRuns > 0
      ? round(
          successfulPipelineRuns /
          pipelineRuns,
        )
      : 0;


  const pipelineFailureRate =
    pipelineRuns > 0
      ? round(
          failedPipelineRuns /
          pipelineRuns,
        )
      : 0;


  /**
   * ----------------------------------------------------------
   * LAST UPDATED
   * ----------------------------------------------------------
   */

  const timestamps =
    auditLogs
      .map(
        (event) =>
          event.createdAt instanceof Date
            ? event.createdAt.getTime()
            : new Date(
                event.createdAt,
              ).getTime(),
      )
      .filter(
        (value) =>
          Number.isFinite(
            value,
          ),
      );


  const lastUpdatedAt =
    timestamps.length > 0
      ? new Date(
          Math.max(
            ...timestamps,
          ),
        )
      : new Date();


  return {

    totalEvents:
      auditLogs.length,

    successfulEvents,

    failedEvents,

    skippedEvents,

    failedStages,

    fallbackEvents,

    fallbackRequiredEvents,

    fallbackRate,

    decisionStartedEvents,

    decisionCompletedEvents,

    decisionFailedEvents,

    pipelineRuns,

    successfulPipelineRuns,

    failedPipelineRuns,

    pipelineSuccessRate,

    pipelineFailureRate,

    lastUpdatedAt,
  };
}


/**
 * ============================================================
 * PIPELINE HEALTH
 * ============================================================
 */

export function calculatePipelineMetrics(
  evaluations: DecisionEvaluation[],
  audit: AuditObservabilityMetrics,
): PipelineEvaluationMetrics {

  const safety =
    calculateSafetyMetrics(
      evaluations,
    );


  /**
   * Safety events are intentionally measured independently
   * from pipeline lifecycle success/failure.
   *
   * A safety BLOCK is not automatically a pipeline failure.
   * It means the safety policy correctly prevented execution.
   */

  const humanReviewRuns =
    safety.humanReviewRequired;


  const safetyBlockedRuns =
    safety.blocked;


  /**
   * ----------------------------------------------------------
   * SOURCE OF TRUTH
   * ----------------------------------------------------------
   *
   * If correlated audit lifecycle information exists, use it.
   *
   * Otherwise preserve the pure-evaluation fallback behavior.
   */

  const hasAuditPipelineData =
    audit.pipelineRuns > 0;


  const totalRuns =
    hasAuditPipelineData
      ? audit.pipelineRuns
      : evaluations.length;


  const successfulRuns =
    hasAuditPipelineData
      ? audit.successfulPipelineRuns
      : evaluations.filter(
          (item) =>
            item.status !==
            "INVALID",
        ).length;


  const failedRuns =
    hasAuditPipelineData
      ? audit.failedPipelineRuns
      : evaluations.filter(
          (item) =>
            item.status ===
            "INVALID",
        ).length;


  /**
   * ----------------------------------------------------------
   * DEFENSIVE INVARIANT
   * ----------------------------------------------------------
   *
   * Never allow:
   *
   * successfulRuns + failedRuns > totalRuns
   *
   * This protects downstream observability consumers even if
   * historical or malformed audit data is encountered.
   * ----------------------------------------------------------
   */

  const terminalRuns =
    successfulRuns +
    failedRuns;


  let normalizedSuccessfulRuns =
    successfulRuns;


  let normalizedFailedRuns =
    failedRuns;


  if (
    terminalRuns >
    totalRuns
  ) {

    /**
     * Failed executions take precedence because a failure is
     * the stronger terminal lifecycle state.
     */
    normalizedFailedRuns =
      Math.min(
        normalizedFailedRuns,
        totalRuns,
      );


    normalizedSuccessfulRuns =
      Math.max(
        0,
        totalRuns -
        normalizedFailedRuns,
      );
  }


  /**
   * ----------------------------------------------------------
   * RATES
   * ----------------------------------------------------------
   */

  const successRate =
    totalRuns > 0
      ? round(
          normalizedSuccessfulRuns /
          totalRuns,
        )
      : 0;


  const failureRate =
    totalRuns > 0
      ? round(
          normalizedFailedRuns /
          totalRuns,
        )
      : 0;


  const safetyBlockRate =
    totalRuns > 0
      ? round(
          safetyBlockedRuns /
          totalRuns,
        )
      : 0;


  const humanReviewRate =
    totalRuns > 0
      ? round(
          humanReviewRuns /
          totalRuns,
        )
      : 0;


  const fallbackRate =
    totalRuns > 0
      ? round(
          audit.fallbackRequiredEvents /
          totalRuns,
        )
      : 0;


  /**
   * ----------------------------------------------------------
   * HEALTH CLASSIFICATION
   * ----------------------------------------------------------
   *
   * HEALTHY:
   *   No significant pipeline failure/block/fallback.
   *
   * DEGRADED:
   *   Some operational risk exists.
   *
   * UNHEALTHY:
   *   High pipeline failure or safety-block rate.
   *
   * UNKNOWN:
   *   No pipeline data.
   * ----------------------------------------------------------
   */

  let health:
    PipelineHealth =
      "UNKNOWN";


  if (
    totalRuns === 0
  ) {

    health =
      "UNKNOWN";

  } else if (
    failureRate >= 0.20 ||
    safetyBlockRate >= 0.25
  ) {

    health =
      "UNHEALTHY";

  } else if (
    failureRate > 0 ||
    safetyBlockRate > 0.10 ||
    humanReviewRate > 0.20 ||
    fallbackRate > 0.20
  ) {

    health =
      "DEGRADED";

  } else {

    health =
      "HEALTHY";
  }


  return {

    totalRuns,

    successfulRuns:
      normalizedSuccessfulRuns,

    failedRuns:
      normalizedFailedRuns,

    safetyBlockedRuns,

    humanReviewRuns,

    fallbackRuns:
      audit.fallbackRequiredEvents,

    successRate,

    failureRate,

    safetyBlockRate,

    humanReviewRate,

    fallbackRate,

    health,

    lastUpdatedAt:
      audit.lastUpdatedAt,
  };
}