import {
  Router,
} from "express";

import {
  createAIDecisionController,
  getAIDecisionController,
  getCustomerAIDecisionsController,
  recordAIDecisionOutcomeController,
} from "./decision.controller";

const router =
  Router();

/**
 * Create immutable AI decision.
 *
 * POST /api/ai/decisions
 */
router.post(
  "/decisions",
  createAIDecisionController
);

/**
 * Get one decision.
 *
 * GET /api/ai/decisions/:decision_id
 */
router.get(
  "/decisions/:decision_id",
  getAIDecisionController
);

/**
 * Get customer's recent decisions.
 *
 * GET /api/ai/customers/:customer_id/decisions
 */
router.get(
  "/customers/:customer_id/decisions",
  getCustomerAIDecisionsController
);

/**
 * Record actual outcome.
 *
 * PATCH /api/ai/decisions/:decision_id/outcome
 */
router.patch(
  "/decisions/:decision_id/outcome",
  recordAIDecisionOutcomeController
);

export default router;