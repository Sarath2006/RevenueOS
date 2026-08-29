/**
 * ============================================================
 * M6.7 — RECOVERY PRIORITY SERVICE
 * ============================================================
 */

import {
  calculateRecoveryPriority,
} from "./priority.engine";

import {
  RecoveryPriorityFeatures,
  RecoveryPriorityResult,
} from "./priority.types";


export class RecoveryPriorityService {

  calculate(
    features: RecoveryPriorityFeatures
  ): RecoveryPriorityResult {

    return calculateRecoveryPriority(
      features
    );

  }

}


export const recoveryPriorityService =
  new RecoveryPriorityService();