/**
 * ============================================================
 * RevenueOS — M6.15 AI EVALUATION / OBSERVABILITY TYPES
 * ============================================================
 *
 * M6.15 provides:
 *
 * - Decision evaluation
 * - Probability quality
 * - Strategy performance
 * - Confidence monitoring
 * - Safety observability
 * - Audit-driven pipeline health
 * - Fallback observability
 * - Model-version comparison
 *
 * M6.15 DOES NOT:
 *
 * - execute recovery actions
 * - modify AI decisions
 * - calculate probability
 * - calculate priority
 * - recommend strategies
 *
 * It only evaluates what already happened.
 * ============================================================
 */

import type {
  AIDecisionRecord,
} from "../decision/decision.types";

import type {
  AIAuditLogRecord,
} from "../audit/audit.types";


/**
 * ============================================================
 * DECISION EVALUATION
 * ============================================================
 */

export type EvaluationStatus =
  | "EVALUATED"
  | "PENDING_OUTCOME"
  | "INVALID";

export type EvaluationQuality =
  | "GOOD"
  | "ACCEPTABLE"
  | "POOR"
  | "UNKNOWN";


export interface DecisionEvaluation {

  decisionId: string;

  status: EvaluationStatus;

  quality: EvaluationQuality;

  recovered: boolean | null;

  recoveredAmount: number | null;

  predictedProbability: number | null;

  actualOutcome: number | null;

  predictionError: number | null;

  strategy: string;

  confidence: number;

  safetyDecision:
    | "ALLOW"
    | "BLOCK"
    | "REQUIRE_HUMAN_REVIEW"
    | null;

  safetyRiskLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL"
    | null;

  modelVersions:
    Record<string, string>;

  evaluatedAt: Date;
}


/**
 * ============================================================
 * PROBABILITY METRICS
 * ============================================================
 */

export interface ProbabilityEvaluationMetrics {

  totalPredictions: number;

  evaluatedPredictions: number;

  pendingPredictions: number;

  recoveredCount: number;

  notRecoveredCount: number;

  meanAbsoluteError: number | null;

  brierScore: number | null;

  averagePredictedProbability: number | null;

  actualRecoveryRate: number | null;
}


/**
 * ============================================================
 * CONFIDENCE METRICS
 * ============================================================
 */

export interface ConfidenceEvaluationMetrics {

  totalDecisions: number;

  averageConfidence: number | null;

  highConfidenceDecisions: number;

  mediumConfidenceDecisions: number;

  lowConfidenceDecisions: number;

  highConfidenceRecoveryRate: number | null;

  mediumConfidenceRecoveryRate: number | null;

  lowConfidenceRecoveryRate: number | null;
}


/**
 * ============================================================
 * SAFETY METRICS
 * ============================================================
 */

export interface SafetyEvaluationMetrics {

  totalEvaluated: number;

  allowed: number;

  blocked: number;

  humanReviewRequired: number;

  safetyBlockRate: number;

  humanReviewRate: number;

  criticalRiskCount: number;

  highRiskCount: number;

  mediumRiskCount: number;

  lowRiskCount: number;
}


/**
 * ============================================================
 * STRATEGY METRICS
 * ============================================================
 */

export interface StrategyEvaluationMetric {

  strategy: string;

  totalDecisions: number;

  evaluatedDecisions: number;

  recoveredCount: number;

  recoveryRate: number | null;

  averageConfidence: number | null;

  averageProbability: number | null;
}


/**
 * ============================================================
 * MODEL VERSION METRICS
 * ============================================================
 *
 * This is the important M6.14 + M6.15 connection.
 *
 * Example:
 *
 * recovery-probability-v1
 *     decisions
 *     recovery rate
 *     MAE
 *     Brier
 *
 * recovery-probability-v2
 *     decisions
 *     recovery rate
 *     MAE
 *     Brier
 */

export interface ModelVersionEvaluationMetric {

  modelId: string;

  version: string;

  decisions: number;

  evaluatedDecisions: number;

  recoveredCount: number;

  recoveryRate: number | null;

  averageProbability: number | null;

  averageConfidence: number | null;

  meanAbsoluteError: number | null;

  brierScore: number | null;
}


/**
 * ============================================================
 * AUDIT OBSERVABILITY
 * ============================================================
 */

export interface AuditObservabilityMetrics {

  totalEvents: number;

  successfulEvents: number;

  failedEvents: number;

  skippedEvents: number;

  failedStages: Record<string, number>;

  fallbackEvents: number;

  fallbackRequiredEvents: number;

  fallbackRate: number;

  decisionStartedEvents: number;

  decisionCompletedEvents: number;

  decisionFailedEvents: number;

  pipelineRuns: number;

  successfulPipelineRuns: number;

  failedPipelineRuns: number;

  pipelineSuccessRate: number;

  pipelineFailureRate: number;

  lastUpdatedAt: Date;
}


/**
 * ============================================================
 * PIPELINE HEALTH
 * ============================================================
 */

export type PipelineHealth =
  | "HEALTHY"
  | "DEGRADED"
  | "UNHEALTHY"
  | "UNKNOWN";


export interface PipelineEvaluationMetrics {

  totalRuns: number;

  successfulRuns: number;

  failedRuns: number;

  safetyBlockedRuns: number;

  humanReviewRuns: number;

  fallbackRuns: number;

  successRate: number;

  failureRate: number;

  safetyBlockRate: number;

  humanReviewRate: number;

  fallbackRate: number;

  health: PipelineHealth;

  lastUpdatedAt: Date;
}


/**
 * ============================================================
 * COMPLETE SNAPSHOT
 * ============================================================
 */

export interface AIEvaluationSnapshot {

  generatedAt: Date;

  decisionCount: number;

  probability: ProbabilityEvaluationMetrics;

  confidence: ConfidenceEvaluationMetrics;

  safety: SafetyEvaluationMetrics;

  strategies: StrategyEvaluationMetric[];

  modelVersions: ModelVersionEvaluationMetric[];

  audit: AuditObservabilityMetrics;

  pipeline: PipelineEvaluationMetrics;
}


/**
 * ============================================================
 * EVALUATION INPUT
 * ============================================================
 */

export interface AIEvaluationInput {

  decision: AIDecisionRecord;

  /**
   * Optional M6.12 audit records.
   *
   * When supplied, pipeline observability is derived
   * from these events.
   */
  auditLogs?: AIAuditLogRecord[];
}


/**
 * ============================================================
 * SNAPSHOT INPUT
 * ============================================================
 */

export interface AIEvaluationSnapshotInput {

  decisions: AIDecisionRecord[];

  auditLogs?: AIAuditLogRecord[];
}