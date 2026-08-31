/**
 * ============================================================
 * RevenueOS — M6.15 AI EVALUATION SERVICE
 * ============================================================
 *
 * The service coordinates the pure metrics from
 * evaluation.metrics.ts.
 *
 * It does NOT modify decisions.
 *
 * It does NOT execute actions.
 *
 * It only evaluates historical AI behavior.
 * ============================================================
 */

import type {
  AIDecisionRecord,
} from "../decision/decision.types";

import type {
  AIAuditLogRecord,
} from "../audit/audit.types";

import {
  evaluateDecision,
  calculateProbabilityMetrics,
  calculateConfidenceMetrics,
  calculateSafetyMetrics,
  calculateStrategyMetrics,
  calculateModelVersionMetrics,
  calculateAuditObservability,
  calculatePipelineMetrics,
} from "./evaluation.metrics";

import type {
  DecisionEvaluation,
  AIEvaluationSnapshot,
} from "./evaluation.types";


export class AIEvaluationService {

  /**
   * ==========================================================
   * EVALUATE ONE DECISION
   * ==========================================================
   */

  evaluate(
    decision: AIDecisionRecord,
  ): DecisionEvaluation {

    return evaluateDecision(
      decision,
    );
  }


  /**
   * ==========================================================
   * EVALUATE MANY DECISIONS
   * ==========================================================
   */

  evaluateMany(
    decisions: AIDecisionRecord[],
  ): DecisionEvaluation[] {

    return decisions.map(
      (decision) =>
        this.evaluate(
          decision,
        ),
    );
  }


  /**
   * ==========================================================
   * CREATE OBSERVABILITY SNAPSHOT
   * ==========================================================
   *
   * auditLogs are optional because pure decision evaluation
   * remains useful even when audit data is unavailable.
   *
   * In production, M6.16+ should provide the actual M6.12
   * audit records.
   */

  snapshot(
    decisions: AIDecisionRecord[],
    auditLogs: AIAuditLogRecord[] = [],
  ): AIEvaluationSnapshot {

    const evaluations =
      this.evaluateMany(
        decisions,
      );


    const probability =
      calculateProbabilityMetrics(
        evaluations,
      );


    const confidence =
      calculateConfidenceMetrics(
        evaluations,
      );


    const safety =
      calculateSafetyMetrics(
        evaluations,
      );


    const strategies =
      calculateStrategyMetrics(
        evaluations,
      );


    const modelVersions =
      calculateModelVersionMetrics(
        evaluations,
      );


    const audit =
      calculateAuditObservability(
        auditLogs,
      );


    const pipeline =
      calculatePipelineMetrics(
        evaluations,
        audit,
      );


    return {

      generatedAt:
        new Date(),

      decisionCount:
        decisions.length,

      probability,

      confidence,

      safety,

      strategies,

      modelVersions,

      audit,

      pipeline,
    };
  }


  /**
   * ==========================================================
   * MODEL COMPARISON
   * ==========================================================
   *
   * Useful for:
   *
   * v1 vs v2
   *
   * especially after M6.14 promote().
   */

  compareModelVersions(
    decisions: AIDecisionRecord[],
  ) {

    const evaluations =
      this.evaluateMany(
        decisions,
      );

    return calculateModelVersionMetrics(
      evaluations,
    );
  }


  /**
   * ==========================================================
   * AUDIT OBSERVABILITY
   * ==========================================================
   */

  getAuditObservability(
    auditLogs: AIAuditLogRecord[],
  ) {

    return calculateAuditObservability(
      auditLogs,
    );
  }


  /**
   * ==========================================================
   * SAFETY OBSERVABILITY
   * ==========================================================
   */

  getSafetyObservability(
    decisions: AIDecisionRecord[],
  ) {

    const evaluations =
      this.evaluateMany(
        decisions,
      );

    return calculateSafetyMetrics(
      evaluations,
    );
  }


  /**
   * ==========================================================
   * PIPELINE HEALTH
   * ==========================================================
   */

  getPipelineHealth(
    decisions: AIDecisionRecord[],
    auditLogs: AIAuditLogRecord[] = [],
  ) {

    const evaluations =
      this.evaluateMany(
        decisions,
      );


    const audit =
      calculateAuditObservability(
        auditLogs,
      );


    return calculatePipelineMetrics(
      evaluations,
      audit,
    );
  }
}


export const aiEvaluationService =
  new AIEvaluationService();