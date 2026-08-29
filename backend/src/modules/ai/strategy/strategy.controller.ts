/**
 * ============================================================
 * M6.8 — RECOVERY STRATEGY CONTROLLER
 * ============================================================
 */

import {
  Request,
  Response,
} from "express";

import {
  recoveryStrategySchema,
} from "./strategy.schema";

import {
  recoveryStrategyService,
} from "./strategy.service";


export async function recommendRecoveryStrategyController(
  req: Request,
  res: Response
) {

  const parsed =
    recoveryStrategySchema.safeParse(
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

    recoveryProbability,
    recoveryProbabilityPercent,

    probabilityBand,
    probabilityConfidence,

    priorityScore,
    priorityBand,

    urgencyScore,
    opportunityScore,
    riskScore,
    amountScore,

    features,
  } = parsed.data;


  try {

    const result =
      recoveryStrategyService.recommend({

        recoveryProbability,

        recoveryProbabilityPercent,

        probabilityBand,

        probabilityConfidence,

        priorityScore,

        priorityBand,

        urgencyScore,

        opportunityScore,

        riskScore,

        amountScore,

        features,
      });


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
        "Recovery strategy recommendation failed",
    });
  }
}