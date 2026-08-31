/**
 * ============================================================
 * RevenueOS — M6.14 MODEL VERSIONING TYPES
 * ============================================================
 *
 * Model Versioning provides:
 *
 * - Stable model identifiers
 * - Explicit versions
 * - Lifecycle management
 * - Compatibility information
 * - Historical reproducibility
 * - Validation before a model is used
 *
 * M6.14 DOES NOT execute AI decisions.
 *
 * It only manages model/version metadata.
 * ============================================================
 */

export type AIModelType =
  | "PROBABILITY"
  | "PRIORITY"
  | "STRATEGY"
  | "CONFIDENCE"
  | "SAFETY"
  | "FEATURE_ENGINEERING"
  | "TEST";

export type AIModelStatus =
  | "ACTIVE"
  | "DEPRECATED"
  | "RETIRED";

export interface AIModelVersion {

  /**
   * Stable logical model identifier.
   *
   * Example:
   *
   * recovery-probability
   */
  modelId: string;

  /**
   * Human-readable model name.
   */
  name: string;

  /**
   * Functional model category.
   */
  type: AIModelType;

  /**
   * Immutable version identifier.
   *
   * Example:
   *
   * recovery-probability-v1
   */
  version: string;

  /**
   * Lifecycle state.
   */
  status: AIModelStatus;

  /**
   * Human-readable description.
   */
  description: string;

  /**
   * Model implementation release.
   *
   * Example:
   *
   * 1.0.0
   */
  release: string;

  /**
   * Input contract version.
   *
   * Allows us to detect incompatible
   * feature changes later.
   */
  inputVersion: string;

  /**
   * Output contract version.
   */
  outputVersion: string;

  /**
   * Configuration fingerprint.
   *
   * Used to identify the exact configuration
   * associated with this version.
   */
  fingerprint: string;

  /**
   * When this version became active.
   */
  effectiveFrom: Date;

  /**
   * Optional deprecation timestamp.
   */
  deprecatedAt: Date | null;

  /**
   * Optional retirement timestamp.
   */
  retiredAt: Date | null;

  /**
   * Additional metadata.
   */
  metadata: Record<string, unknown>;
}


export interface RegisterModelVersionInput {

  modelId: string;

  name: string;

  type: AIModelType;

  version: string;

  description: string;

  release: string;

  inputVersion: string;

  outputVersion: string;

  fingerprint: string;

  status?: AIModelStatus;

  effectiveFrom?: Date;

  deprecatedAt?: Date | null;

  retiredAt?: Date | null;

  metadata?: Record<string, unknown>;
}


export interface ModelVersionReference {

  modelId: string;

  version: string;

}


export interface AIModelVersionSet {

  probability: string;

  priority: string;

  strategy: string;

  confidence: string;

  safety: string;

  featureEngineering?: string;

  [key: string]: string | undefined;
}


export interface ModelVersionValidationResult {

  valid: boolean;

  errors: string[];

  warnings: string[];

  resolved: Record<string, AIModelVersion>;

}


export interface ModelVersionResolutionOptions {

  /**
   * If true, resolve the currently active
   * version when no explicit version is supplied.
   */
  useActive?: boolean;

  /**
   * If true, deprecated versions can still
   * be resolved for historical replay.
   */
  allowDeprecated?: boolean;

  /**
   * If true, retired versions can be resolved
   * for historical inspection only.
   */
  allowRetired?: boolean;
}