/**
 * ============================================================
 * M6.8 — RECOVERY STRATEGY SERVICE
 * ============================================================
 */

import {
  recommendRecoveryStrategy,
} from "./strategy.engine";


import {
  StrategyContext,
  StrategyRecommendation,
} from "./strategy.types";


export class RecoveryStrategyService {

  recommend(
    context: StrategyContext,
  ): StrategyRecommendation {

    return recommendRecoveryStrategy(
      context,
    );
  }
}


export const recoveryStrategyService =
  new RecoveryStrategyService();