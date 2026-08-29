/**
 * ============================================================
 * M6.6 — RECOVERY PROBABILITY CONTROLLER
 * ============================================================
 */

import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  recoveryProbabilitySchema,
} from "./probability.schema";

import {
  recoveryProbabilityService,
} from "./probability.service";

export async function calculateRecoveryProbabilityController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed =
      recoveryProbabilitySchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,

        error: {
          code: "VALIDATION_ERROR",

          message:
            "Invalid recovery probability request",

          details:
            parsed.error.flatten(),
        },
      });
    }

    const {
      customer_id,
      merchant_id,
      currency,
      features,
    } = parsed.data;

    const result =
      recoveryProbabilityService.calculate(
        features
      );

    return res.status(200).json({
      success: true,

      customer_id,

      merchant_id,

      currency,

      ...result,
    });
  } catch (error) {
    return next(error);
  }
}