/**
 * ============================================================
 * RevenueOS — M6.14 MODEL VERSION SERVICE
 * ============================================================
 *
 * Public service for AI model version management.
 *
 * Other AI modules should communicate with the registry
 * through this service rather than accessing registry internals.
 * ============================================================
 */

import {
  aiModelVersionRegistry,
} from "./version.registry";

import type {
  AIModelVersion,
  AIModelVersionSet,
  ModelVersionValidationResult,
} from "./version.types";


export class AIModelVersionService {


  /**
   * ==========================================================
   * GET ACTIVE VERSION
   * ==========================================================
   */

  getActive(
    modelId: string,
  ): AIModelVersion {

    return aiModelVersionRegistry
      .getActive(
        modelId,
      );
  }


  /**
   * ==========================================================
   * RESOLVE VERSION
   * ==========================================================
   */

  resolve(
    modelId: string,
    version?: string,
  ): AIModelVersion {

    return aiModelVersionRegistry
      .resolve(
        modelId,
        version,
      );
  }


  /**
   * ==========================================================
   * GET VERSION
   * ==========================================================
   */

  get(
    modelId: string,
    version: string,
  ): AIModelVersion | null {

    return aiModelVersionRegistry
      .get(
        modelId,
        version,
      );
  }


  /**
   * ==========================================================
   * LIST VERSIONS
   * ==========================================================
   */

  list(
    modelId?: string,
  ): AIModelVersion[] {

    return aiModelVersionRegistry
      .list(
        modelId,
      );
  }


  /**
   * ==========================================================
   * VALIDATE DECISION VERSION SET
   * ==========================================================
   *
   * This is especially important before persisting
   * an AIDecision.
   *
   * It guarantees that every recorded model version
   * is known to RevenueOS.
   */

  validateDecisionVersionSet(
    versions: AIModelVersionSet,
  ): ModelVersionValidationResult {

    const errors: string[] = [];

    const warnings: string[] = [];

    const resolved:
      Record<string, AIModelVersion> = {};


    const requiredModels:
      Array<
        keyof AIModelVersionSet
      > = [

      "probability",

      "priority",

      "strategy",

      "confidence",

      "safety",

    ];


    for (
      const key
      of requiredModels
    ) {

      const version =
        versions[key];


      if (!version) {

        errors.push(
          `Missing model version: ${key}`,
        );

        continue;
      }


      const model =
        this.findByVersion(
          version,
        );


      if (!model) {

        errors.push(
          `Unknown model version for ${key}: ${version}`,
        );

        continue;
      }


      resolved[key] =
        model;


      if (
        model.status === "DEPRECATED"
      ) {

        warnings.push(
          `Model version ${version} is deprecated.`,
        );
      }


      if (
        model.status === "RETIRED"
      ) {

        warnings.push(
          `Model version ${version} is retired.`,
        );
      }
    }


    /**
     * Optional feature engineering version.
     */

    if (
      versions.featureEngineering
    ) {

      const featureModel =
        this.findByVersion(
          versions.featureEngineering,
        );


      if (!featureModel) {

        errors.push(
          `Unknown feature engineering version: ${versions.featureEngineering}`,
        );

      } else {

        resolved.featureEngineering =
          featureModel;
      }
    }


    return {

      valid:
        errors.length === 0,

      errors,

      warnings,

      resolved,

    };
  }


  /**
   * ==========================================================
   * CREATE CURRENT VERSION SET
   * ==========================================================
   *
   * This gives M6.16 one canonical way to capture
   * the versions used for a decision.
   */

  getCurrentVersionSet():
    AIModelVersionSet {

    return {

      probability:
        this.getActive(
          "recovery-probability",
        ).version,

      priority:
        this.getActive(
          "recovery-priority",
        ).version,

      strategy:
        this.getActive(
          "recovery-strategy",
        ).version,

      confidence:
        this.getActive(
          "confidence-fallback",
        ).version,

      safety:
        this.getActive(
          "ai-safety-policy",
        ).version,

      featureEngineering:
        this.getActive(
          "recovery-features",
        ).version,

    };
  }


  /**
   * ==========================================================
   * CHECK EXACT VERSION
   * ==========================================================
   */

  isKnownVersion(
    version: string,
  ): boolean {

    return this.list()
      .some(
        (model) =>
          model.version === version,
      );
  }


  /**
   * ==========================================================
   * PRIVATE LOOKUP
   * ==========================================================
   */

  private findByVersion(
    version: string,
  ): AIModelVersion | null {

    const models =
      this.list();


    return (
      models.find(
        (model) =>
          model.version === version,
      ) ??
      null
    );
  }
}


export const aiModelVersionService =
  new AIModelVersionService();