/**
 * ============================================================
 * M6.12 — AI AUDIT CONFIGURATION
 * ============================================================
 *
 * Configuration only.
 *
 * The audit trail is intentionally append-only.
 * ============================================================
 */

export const AI_AUDIT_MODEL = {

  version:
    "ai-audit-trail-v1",

  retention:

    "PERMANENT",

  stages: {

    pipeline:
      "PIPELINE",

    probability:
      "PROBABILITY",

    priority:
      "PRIORITY",

    strategy:
      "STRATEGY",

    confidence:
      "CONFIDENCE",

    fallback:
      "FALLBACK",

    decision:
      "DECISION",

    outcome:
      "OUTCOME",

  },

} as const;