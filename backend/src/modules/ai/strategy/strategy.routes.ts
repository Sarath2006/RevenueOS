/**
 * ============================================================
 * M6.8 — RECOVERY STRATEGY ROUTES
 * ============================================================
 */

import {
  Router,
} from "express";

import {
  recommendRecoveryStrategyController,
} from "./strategy.controller";


const router =
  Router();


router.post(
  "/recovery-strategy",
  recommendRecoveryStrategyController
);


export default router;