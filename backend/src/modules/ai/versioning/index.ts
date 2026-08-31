/**
 * ============================================================
 * RevenueOS — M6.14 MODEL VERSIONING PUBLIC API
 * ============================================================
 */

export {
  aiModelVersionService,
  AIModelVersionService,
} from "./version.service";


export {
  aiModelVersionRegistry,
  AIModelVersionRegistry,
} from "./version.registry";


export {
  AI_MODEL_VERSIONS,
} from "./version.config";


export type {
  AIModelType,
  AIModelStatus,
  AIModelVersion,
  AIModelVersionSet,
  RegisterModelVersionInput,
  ModelVersionReference,
  ModelVersionValidationResult,
  ModelVersionResolutionOptions,
} from "./version.types";