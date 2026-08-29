/**
 * ============================================================
 * M6.7 — RECOVERY PRIORITY ROUTES
 * ============================================================
 */

import {
  Router,
} from "express";

import {
  calculateRecoveryPriorityController,
} from "./priority.controller";


const router =
  Router();


router.post(
  "/recovery-priority",
  calculateRecoveryPriorityController
);


export default router;