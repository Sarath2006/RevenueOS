/**
 * ============================================================
 * M6.6 — RECOVERY PROBABILITY SERVICE
 * ============================================================
 *
 * Application service layer.
 *
 * Controller
 *     ↓
 * Service
 *     ↓
 * Engine
 *
 * Keeps HTTP concerns separate from business calculation.
 */

import {
  calculateRecoveryProbability,
} from "./probability.engine";

import {
  RecoveryProbabilityFeatures,
  RecoveryProbabilityResult,
} from "./probability.types";

export class RecoveryProbabilityService {
  calculate(
    features: RecoveryProbabilityFeatures
  ): RecoveryProbabilityResult {
    return calculateRecoveryProbability(
      features
    );
  }
}

export const recoveryProbabilityService =
  new RecoveryProbabilityService();