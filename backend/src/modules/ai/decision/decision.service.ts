/**
 * ============================================================
 * M6.9 — AI DECISION SERVICE
 * ============================================================
 *
 * Responsible for:
 *
 * - validating decision consistency
 * - generating decision ID
 * - creating immutable decision snapshots
 * - retrieving historical decisions
 * - recording outcomes
 *
 * It does NOT calculate probability, priority or strategy.
 * Those responsibilities belong to M6.6, M6.7 and M6.8.
 * ============================================================
 */

import crypto from "crypto";

import {
  aiDecisionRepository,
} from "./decision.repository";

import {
  DecisionInput,
} from "./decision.types";

export class AIDecisionService {
  /**
   * Generate a collision-resistant public decision ID.
   *
   * Example:
   *
   * aid_01J...
   */
  private generateDecisionId(): string {
    return `aid_${crypto.randomUUID()}`;
  }

  /**
   * Round floating-point values consistently.
   */
  private round(
    value: number,
    decimals = 4
  ): number {
    const multiplier =
      Math.pow(10, decimals);

    return (
      Math.round(
        value * multiplier
      ) / multiplier
    );
  }

  /**
   * Validate internal consistency before persistence.
   */
  private validateConsistency(
    input: DecisionInput
  ): void {
    const expectedProbabilityPercent =
      this.round(
        input.probability * 100,
        2
      );

    if (
      Math.abs(
        expectedProbabilityPercent -
          input.probabilityPercent
      ) > 0.01
    ) {
      throw new Error(
        "Probability and probabilityPercent are inconsistent"
      );
    }

    if (
      input.probabilityConfidence < 0 ||
      input.probabilityConfidence > 1
    ) {
      throw new Error(
        "Probability confidence must be between 0 and 1"
      );
    }

    if (
      input.decisionConfidence < 0 ||
      input.decisionConfidence > 1
    ) {
      throw new Error(
        "Decision confidence must be between 0 and 1"
      );
    }

    if (
      input.priorityScore < 0 ||
      input.priorityScore > 100
    ) {
      throw new Error(
        "Priority score must be between 0 and 100"
      );
    }

    if (
      input.strategyScore < 0 ||
      input.strategyScore > 100
    ) {
      throw new Error(
        "Strategy score must be between 0 and 100"
      );
    }

    if (!input.strategy.trim()) {
      throw new Error(
        "Strategy cannot be empty"
      );
    }

    if (!input.currency.match(/^[A-Z]{3}$/)) {
      throw new Error(
        "Currency must be a valid 3-letter uppercase code"
      );
    }
  }

  /**
   * Create an AI decision record.
   */
  async createDecision(
    input: DecisionInput
  ) {
    this.validateConsistency(input);

    const decisionId =
      this.generateDecisionId();

    return aiDecisionRepository.create(
      decisionId,
      {
        ...input,

        probability:
          this.round(
            input.probability,
            6
          ),

        probabilityPercent:
          this.round(
            input.probabilityPercent,
            2
          ),

        probabilityConfidence:
          this.round(
            input.probabilityConfidence,
            6
          ),

        priorityScore:
          this.round(
            input.priorityScore,
            4
          ),

        urgencyScore:
          this.round(
            input.urgencyScore,
            4
          ),

        opportunityScore:
          this.round(
            input.opportunityScore,
            4
          ),

        riskScore:
          this.round(
            input.riskScore,
            4
          ),

        amountScore:
          this.round(
            input.amountScore,
            4
          ),

        strategyScore:
          this.round(
            input.strategyScore,
            4
          ),

        decisionConfidence:
          this.round(
            input.decisionConfidence,
            6
          ),
      }
    );
  }

  /**
   * Get a single decision.
   */
  async getDecision(
    decisionId: string
  ) {
    return aiDecisionRepository.findByDecisionId(
      decisionId
    );
  }

  /**
   * Get customer's recent decisions.
   */
  async getCustomerDecisions(
    customerId: string,
    limit = 20
  ) {
    const safeLimit =
      Math.min(
        Math.max(limit, 1),
        100
      );

    return aiDecisionRepository.findByCustomer(
      customerId,
      safeLimit
    );
  }

  /**
   * Get merchant's recent decisions.
   */
  async getMerchantDecisions(
    merchantId: string,
    limit = 50
  ) {
    const safeLimit =
      Math.min(
        Math.max(limit, 1),
        100
      );

    return aiDecisionRepository.findByMerchant(
      merchantId,
      safeLimit
    );
  }

  /**
   * Record actual recovery outcome.
   */
  async recordOutcome(
    decisionId: string,
    outcome: string,
    outcomeAmount?: number | null
  ) {
    const existing =
      await this.getDecision(
        decisionId
      );

    if (!existing) {
      throw new Error(
        "AI decision not found"
      );
    }

    if (
      existing.outcome !== null
    ) {
      throw new Error(
        "Decision outcome has already been recorded"
      );
    }

    return aiDecisionRepository.updateOutcome(
      decisionId,
      outcome,
      outcomeAmount
    );
  }
}

export const aiDecisionService =
  new AIDecisionService();