/**
 * ============================================================
 * M6.12 — AI AUDIT TRAIL TYPES
 * ============================================================
 *
 * AI Audit Trail records the lifecycle of an AI decision.
 *
 * M6.9:
 *   Decision Snapshot
 *
 * M6.11:
 *   Confidence + Fallback
 *
 * M6.12:
 *   Complete AI Decision Lifecycle
 *
 * The audit trail does NOT change the AI decision.
 * It records what happened.
 * ============================================================
 */

export type AIAuditStage =
  | "PIPELINE"
  | "PROBABILITY"
  | "PRIORITY"
  | "STRATEGY"
  | "CONFIDENCE"
  | "FALLBACK"
  | "SAFETY"
  | "DECISION"
  | "OUTCOME";


export type AIAuditEventType =
  | "AI_DECISION_STARTED"
  | "FEATURES_NORMALIZED"
  | "PROBABILITY_CALCULATED"
  | "PRIORITY_CALCULATED"
  | "STRATEGY_RECOMMENDED"
  | "CONFIDENCE_EVALUATED"
  | "FALLBACK_EVALUATED"
  | "SAFETY_EVALUATED"
  | "AI_DECISION_COMPLETED"
  | "AI_DECISION_FAILED"
  | "DECISION_OUTCOME_RECORDED";


export type AIAuditStatus =
  | "STARTED"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED";




export interface AIAuditModelVersions {
  probability?: string;
  priority?: string;
  strategy?: string;
  confidence?: string;
  [key: string]: string | undefined;
}


export interface CreateAIAuditLogInput {

  decisionId: string;

  merchantId: string;

  customerId?: string | null;

  recoveryCaseId?: string | null;

  eventType: AIAuditEventType;

  stage: AIAuditStage;

  status?: AIAuditStatus | null;

  strategy?: string | null;

  confidence?: number | null;

  fallbackRequired?: boolean | null;

  fallbackAction?: string | null;

  fallbackReason?: string | null;

  modelVersions?: AIAuditModelVersions | null;

  metadata?: Record<string, unknown> | null;


    safetyDecision?:
    | "ALLOW"
    | "BLOCK"
    | "REQUIRE_HUMAN_REVIEW"
    | null;

  safetyAllowed?: boolean | null;

  safetyRiskLevel?:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL"
    | null;

  safetyReason?: string | null;

  safetyBlockingRules?: string[] | null;

  safetyWarnings?: string[] | null;

  safetyModelVersion?: string | null;
}


export interface AIAuditLogRecord {

  id: string;

  decisionId: string;

  merchantId: string;

  customerId: string | null;

  recoveryCaseId: string | null;

  eventType: AIAuditEventType;

  stage: AIAuditStage;

  status: AIAuditStatus | null;

  strategy: string | null;

  confidence: number | null;

  fallbackRequired: boolean | null;

  fallbackAction: string | null;

  fallbackReason: string | null;

  modelVersions:
    AIAuditModelVersions | null;

  metadata:
    Record<string, unknown> | null;

  createdAt: Date;
}