import {
  Request,
  Response,
  NextFunction,
} from "express";

import { Environment } from "../../../generated/prisma/client";

import { env } from "../../../config/env";

import {
  verifyRazorpayWebhookSignature,
} from "./razorpay-webhook.signature";

import {
  processRazorpayWebhook,
} from "./razorpay-webhook.service";

export async function handleRazorpayWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawBody =
      req.body as Buffer;

    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({
        success: false,
        error: {
          code: "RAW_BODY_REQUIRED",
          message:
            "Webhook raw body is required",
        },
      });

      return;
    }

    const signature =
      req.headers[
        "x-razorpay-signature"
      ];

    const eventId =
      req.headers[
        "x-razorpay-event-id"
      ];

    if (
      typeof signature !== "string"
    ) {
      res.status(400).json({
        success: false,
        error: {
          code:
            "MISSING_WEBHOOK_SIGNATURE",
          message:
            "Missing X-Razorpay-Signature",
        },
      });

      return;
    }

    /*
     * Verify the signature against the
     * exact raw request body.
     */
    const valid =
      verifyRazorpayWebhookSignature(
        rawBody,
        signature
      );

    if (!valid) {
      res.status(400).json({
        success: false,
        error: {
          code:
            "INVALID_WEBHOOK_SIGNATURE",
          message:
            "Webhook signature verification failed",
        },
      });

      return;
    }

    /*
     * M5 test environment:
     * resolve the RevenueOS merchant from configuration.
     */
    const merchantId =
      env.RAZORPAY_TEST_MERCHANT_ID;

    if (!merchantId) {
      throw new Error(
        "RAZORPAY_TEST_MERCHANT_ID is not configured"
      );
    }

    const result =
      await processRazorpayWebhook(
        rawBody,
        merchantId,
        Environment.TEST,
        typeof eventId === "string"
          ? eventId
          : undefined
      );

    /*
     * Razorpay expects a successful 2xx
     * response from the webhook endpoint.
     */
    res.status(200).json({
      success: true,
      received: true,
      duplicate:
        result.duplicate,
    });
  } catch (error) {
    next(error);
  }
}