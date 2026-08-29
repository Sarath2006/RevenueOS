/**
 * ============================================================
 * RevenueOS — AI Queue Types
 * ============================================================
 */

import { RecoveryProbabilityFeatures } from "../modules/ai/probability/probability.types";

export type AIDecisionFeatures = RecoveryProbabilityFeatures;

export interface AIDecisionJobData {
  customerId: string;
  merchantId: string;
  recoveryCaseId?: string | null;
  currency: string;
  features: AIDecisionFeatures;
  source: "API" | "SYSTEM" | "WEBHOOK" | "RETRY";
}