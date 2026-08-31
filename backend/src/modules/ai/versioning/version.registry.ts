/**
 * ============================================================
 * RevenueOS — M6.14 MODEL VERSION REGISTRY
 * ============================================================
 *
 * Central source of truth for registered AI model versions.
 *
 * Responsibilities:
 *
 * - Register versions
 * - Resolve versions
 * - Find active versions
 * - Validate versions
 * - Manage lifecycle state
 * - Prevent duplicate versions
 *
 * It does NOT:
 *
 * - execute models
 * - calculate probability
 * - calculate priority
 * - recommend strategy
 * - execute recovery actions
 * ============================================================
 */

import {
  AI_MODEL_VERSIONS,
} from "./version.config";

import type {
  AIModelVersion,
  AIModelStatus,
  RegisterModelVersionInput,
  ModelVersionResolutionOptions,
} from "./version.types";


function cloneModel(
  model: AIModelVersion,
): AIModelVersion {

  return {
    ...model,

    metadata: {
      ...model.metadata,
    },
  };
}


function normalizeModel(
  input: RegisterModelVersionInput,
): AIModelVersion {

  return {
    modelId:
      input.modelId,

    name:
      input.name,

    type:
      input.type,

    version:
      input.version,

    status:
      input.status ?? "ACTIVE",

    description:
      input.description,

    release:
      input.release,

    inputVersion:
      input.inputVersion,

    outputVersion:
      input.outputVersion,

    fingerprint:
      input.fingerprint,

    effectiveFrom:
      input.effectiveFrom ??
      new Date(),

    deprecatedAt:
      input.deprecatedAt ??
      null,

    retiredAt:
      input.retiredAt ??
      null,

    metadata:
      input.metadata ??
      {},
  };
}


export class AIModelVersionRegistry {

  private readonly models =
    new Map<
      string,
      AIModelVersion
    >();


  constructor() {

    for (
      const model
      of AI_MODEL_VERSIONS
    ) {

      this.register(
        model,
      );
    }
  }


  /**
   * ==========================================================
   * REGISTER
   * ==========================================================
   */

  register(
    input: RegisterModelVersionInput,
  ): AIModelVersion {

    const key =
      this.buildKey(
        input.modelId,
        input.version,
      );

    if (
      this.models.has(key)
    ) {

      throw new Error(
        `AI model version already registered: ${key}`,
      );
    }


    const model =
      normalizeModel(
        input,
      );


    /**
     * Only one ACTIVE version is allowed
     * for a model.
     */

    if (
      model.status === "ACTIVE" &&
      this.hasActiveVersion(
        model.modelId,
      )
    ) {

      throw new Error(
        `Active version already exists for model: ${model.modelId}`,
      );
    }


    this.models.set(
      key,
      model,
    );


    return cloneModel(
      model,
    );
  }


  /**
   * ==========================================================
   * GET
   * ==========================================================
   */

  get(
    modelId: string,
    version: string,
  ): AIModelVersion | null {

    const model =
      this.models.get(
        this.buildKey(
          modelId,
          version,
        ),
      );


    if (!model) {
      return null;
    }


    return cloneModel(
      model,
    );
  }


  /**
   * ==========================================================
   * ACTIVE VERSION
   * ==========================================================
   */

  getActive(
    modelId: string,
  ): AIModelVersion {

    const matches =
      Array.from(
        this.models.values(),
      ).filter(
        (model) =>
          model.modelId === modelId &&
          model.status === "ACTIVE",
      );


    if (
      matches.length === 0
    ) {

      throw new Error(
        `No active AI model version found for: ${modelId}`,
      );
    }


    if (
      matches.length > 1
    ) {

      throw new Error(
        `Multiple active AI model versions found for: ${modelId}`,
      );
    }


    return cloneModel(
      matches[0],
    );
  }


  /**
   * ==========================================================
   * RESOLVE
   * ==========================================================
   */

  resolve(
    modelId: string,
    version?: string,
    options:
      ModelVersionResolutionOptions = {},
  ): AIModelVersion {

    const {
      useActive = true,
      allowDeprecated = true,
      allowRetired = true,
    } = options;


    /**
     * Explicit version requested.
     */

    if (version) {

      const model =
        this.get(
          modelId,
          version,
        );


      if (!model) {

        throw new Error(
          `Unknown AI model version: ${modelId}:${version}`,
        );
      }


      if (
        model.status === "DEPRECATED" &&
        !allowDeprecated
      ) {

        throw new Error(
          `Deprecated AI model version is not allowed: ${modelId}:${version}`,
        );
      }


      if (
        model.status === "RETIRED" &&
        !allowRetired
      ) {

        throw new Error(
          `Retired AI model version is not allowed: ${modelId}:${version}`,
        );
      }


      return model;
    }


    /**
     * No explicit version.
     */

    if (!useActive) {

      throw new Error(
        `No model version supplied for ${modelId}`,
      );
    }


    return this.getActive(
      modelId,
    );
  }


  /**
   * ==========================================================
   * LIST
   * ==========================================================
   */

  list(
    modelId?: string,
  ): AIModelVersion[] {

    return Array.from(
      this.models.values(),
    )
      .filter(
        (model) =>
          !modelId ||
          model.modelId === modelId,
      )
      .map(
        cloneModel,
      );
  }


  /**
   * ==========================================================
   * STATUS
   * ==========================================================
   */

  setStatus(
    modelId: string,
    version: string,
    status: AIModelStatus,
  ): AIModelVersion {

    const key =
      this.buildKey(
        modelId,
        version,
      );


    const model =
      this.models.get(
        key,
      );


    if (!model) {

      throw new Error(
        `Cannot update unknown AI model version: ${key}`,
      );
    }


    if (
      status === "ACTIVE" &&
      model.status !== "ACTIVE" &&
      this.hasActiveVersion(
        modelId,
      )
    ) {

      throw new Error(
        `Cannot activate ${key}; another active version exists.`,
      );
    }


    model.status =
      status;


    if (
      status === "DEPRECATED" &&
      !model.deprecatedAt
    ) {

      model.deprecatedAt =
        new Date();
    }


    if (
      status === "RETIRED" &&
      !model.retiredAt
    ) {

      model.retiredAt =
        new Date();
    }


    return cloneModel(
      model,
    );
  }


  /**
 * ==========================================================
 * PROMOTE VERSION
 * ==========================================================
 *
 * Atomically promotes a model version to ACTIVE.
 *
 * The currently active version is automatically
 * deprecated before the new version becomes active.
 *
 * This guarantees that a model never has two ACTIVE
 * versions after a successful promotion.
 *
 * Example:
 *
 * v1 ACTIVE
 *   ↓
 * promote(v2)
 *   ↓
 * v1 DEPRECATED
 * v2 ACTIVE
 *
 * Historical versions are preserved.
 */
promote(
  modelId: string,
  version: string,
): AIModelVersion {

  const targetKey =
    this.buildKey(
      modelId,
      version,
    );

  const target =
    this.models.get(
      targetKey,
    );

  if (!target) {

    throw new Error(
      `Cannot promote unknown AI model version: ${targetKey}`,
    );
  }

  if (
    target.status === "RETIRED"
  ) {

    throw new Error(
      `Cannot promote retired AI model version: ${targetKey}`,
    );
  }

  /**
   * Already active.
   *
   * Nothing needs to change.
   */
  if (
    target.status === "ACTIVE"
  ) {

    return cloneModel(
      target,
    );
  }

  /**
   * Find the current active version.
   */
  const currentActive =
    Array.from(
      this.models.values(),
    ).find(
      (model) =>
        model.modelId === modelId &&
        model.status === "ACTIVE",
    );

  /**
   * Deprecate the current active version.
   */
  if (
    currentActive
  ) {

    currentActive.status =
      "DEPRECATED";

    if (
      !currentActive.deprecatedAt
    ) {

      currentActive.deprecatedAt =
        new Date();
    }
  }

  /**
   * Activate the target version.
   */
  target.status =
    "ACTIVE";

  target.deprecatedAt =
    null;

  target.effectiveFrom =
    new Date();

  return cloneModel(
    target,
  );
}

  /**
   * ==========================================================
   * VALIDATION
   * ==========================================================
   */

  validate(
    modelId: string,
    version: string,
  ): boolean {

    return this.models.has(
      this.buildKey(
        modelId,
        version,
      ),
    );
  }


  /**
   * ==========================================================
   * HELPERS
   * ==========================================================
   */

  private hasActiveVersion(
    modelId: string,
  ): boolean {

    return Array.from(
      this.models.values(),
    ).some(
      (model) =>
        model.modelId === modelId &&
        model.status === "ACTIVE",
    );
  }


  private buildKey(
    modelId: string,
    version: string,
  ): string {

    return `${modelId}:${version}`;
  }
}



export const aiModelVersionRegistry =
  new AIModelVersionRegistry();