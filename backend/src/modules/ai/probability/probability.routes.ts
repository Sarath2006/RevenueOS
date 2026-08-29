/**
 * ============================================================
 * M6.6 — RECOVERY PROBABILITY ROUTES
 * ============================================================
 */

import {
  Router,
} from "express";

import {
  calculateRecoveryProbabilityController,
} from "./probability.controller";

const router =
  Router();

/**
 * POST /api/ai/recovery-probability
 */
router.post(
  "/recovery-probability",
  calculateRecoveryProbabilityController
);

export default router;