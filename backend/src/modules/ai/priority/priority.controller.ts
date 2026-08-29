/**
 * ============================================================
 * M6.7 — RECOVERY PRIORITY CONTROLLER
 * ============================================================
 */

import {
  Request,
  Response,
} from "express";

import {
  recoveryPrioritySchema,
} from "./priority.schema";

import {
  recoveryPriorityService,
} from "./priority.service";


export async function calculateRecoveryPriorityController(
  req: Request,
  res: Response
) {

  const parsed =
    recoveryPrioritySchema.safeParse(
      req.body
    );


  if (!parsed.success) {

    return res.status(400).json({

      success: false,

      error:
        "VALIDATION_ERROR",

      details:
        parsed.error.flatten(),

    });

  }


  const {
    customer_id,
    merchant_id,
    currency,
    features,
  } =
    parsed.data;


  try {

    const result =
      recoveryPriorityService.calculate(
        features
      );


    return res.status(200).json({

      success: true,

      customer_id,

      merchant_id,

      currency,

      ...result,

    });

  } catch (error: any) {

    return res.status(500).json({

      success: false,

      error:
        error?.message ??
        "Recovery priority calculation failed",

    });

  }

}