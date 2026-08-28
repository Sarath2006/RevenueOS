import {
  WebhookStatus,
  Environment,
} from "../../../generated/prisma/client";

import { prisma } from "../../../config/database";
import { syncQueue } from "../../../queues/sync.queue";

import type {
  RazorpayWebhookPayload,
} from "./razorpay-webhook.types";

export async function processRazorpayWebhook(
  rawBody: Buffer,
  merchantId: string,
  environment: Environment,
  eventId: string | undefined
) {
  const payload =
    JSON.parse(
      rawBody.toString("utf8")
    ) as RazorpayWebhookPayload;

  const eventType = payload.event;

  /*
   * Idempotency:
   * Razorpay can send the same event more than once.
   */
  if (eventId) {
    const existing =
      await prisma.webhookEvent.findFirst({
        where: {
          merchantId,
          razorpayEventId: eventId,
        },
      });

    if (existing) {
      await prisma.webhookEvent.update({
        where: {
          id: existing.id,
        },
        data: {
          status: WebhookStatus.DUPLICATE,
        },
      });

      return {
        duplicate: true,
        webhookEventId: existing.id,
      };
    }
  }

  const webhookEvent =
    await prisma.webhookEvent.create({
      data: {
        merchantId,
        razorpayEventId: eventId,
        eventType,
        environment,
        payload: payload as any,
        status: WebhookStatus.RECEIVED,
      },
    });

  await syncQueue.add(
    `razorpay:${eventType}`,
    {
      merchantId,
      mode:
        environment === Environment.TEST
          ? "test"
          : "live",
      eventType,
      eventId:
        webhookEvent.id,
      razorpayEventId:
        eventId,
      payload,
    },
    {
      jobId:
        eventId
          ? `razorpay-event-${eventId}`
          : undefined,
    }
  );

  return {
    duplicate: false,
    webhookEventId:
      webhookEvent.id,
  };
}
