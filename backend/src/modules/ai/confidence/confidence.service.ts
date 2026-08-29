/**
 * ============================================================
 * M6.11 — CONFIDENCE + FALLBACK SERVICE
 * ============================================================
 */

import {
  evaluateConfidenceAndFallback,
} from "./confidence.engine";

import {
  ConfidenceInput,
  ConfidenceResult,
} from "./confidence.types";


export class ConfidenceFallbackService {

  evaluate(
    input: ConfidenceInput,
  ): ConfidenceResult {

    return evaluateConfidenceAndFallback(
      input,
    );
  }
}


export const confidenceFallbackService =
  new ConfidenceFallbackService();