import { Worker } from "bullmq";
import type { Prisma } from "../generated/prisma/client";

import { logger } from "../config/logger";
import { prisma } from "../config/database";
import { createQueueConnection } from "../queues/connection";

import {
  SYNC_QUEUE_NAME,
  SyncJob,
} from "../queues/sync.queue";

import {
  upsertRazorpayOrder,
} from "../modules/orders/order.service";

type SyncEnvironment = "TEST" | "LIVE";

type PaymentLinkStatus =
  | "CREATED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED";

/**
 * ============================================================
 * REVENUEOS RAZORPAY SYNCHRONIZATION WORKER
 * ============================================================
 *
 * Razorpay
 *    ↓
 * Webhook
 *    ↓
 * WebhookEvent
 *    ↓
 * BullMQ
 *    ↓
 * Sync Worker
 *    ↓
 * Normalized RevenueOS data
 *
 * Supported:
 *
 * payment.failed
 * payment.authorized
 * payment.captured
 * order.paid
 * subscription.pending
 * subscription.halted
 * subscription.charged
 * payment_link.paid
 * payment_link.partially_paid
 * payment_link.cancelled
 * payment_link.expired
 */

export const syncWorker = new Worker<SyncJob>(
  SYNC_QUEUE_NAME,

  async (job) => {
    const {
      merchantId,
      mode,
      eventType,
      eventId,
      razorpayEventId,
      payload,
    } = job.data;

    const environment: SyncEnvironment =
      mode === "live" ? "LIVE" : "TEST";

    logger.info(
      {
        jobId: job.id,
        merchantId,
        eventType,
        eventId,
        razorpayEventId,
        environment,
      },
      "Processing Razorpay synchronization job"
    );

    try {
      switch (eventType) {
        /**
         * ======================================================
         * PAYMENT FAILED
         * ======================================================
         */

        case "payment.failed":
          await handlePaymentFailed(
            merchantId,
            eventId,
            payload,
            environment
          );
          break;

        /**
         * ======================================================
         * PAYMENT AUTHORIZED
         * ======================================================
         */

        case "payment.authorized":
          await handlePaymentSuccessState(
            merchantId,
            eventId,
            payload,
            environment
          );
          break;

        /**
         * ======================================================
         * PAYMENT CAPTURED
         * ======================================================
         */

        case "payment.captured":
          await handlePaymentCaptured(
            merchantId,
            eventId,
            payload,
            environment
          );
          break;

        /**
         * ======================================================
         * ORDER PAID
         * ======================================================
         */

        case "order.paid":
          await handleOrderPaid(
            merchantId,
            eventId,
            payload,
            environment
          );
          break;

        /**
         * ======================================================
         * SUBSCRIPTION
         * ======================================================
         */

        case "subscription.pending":
        case "subscription.halted":
        case "subscription.charged":
          await handleSubscriptionEvent(
            merchantId,
            eventId,
            eventType,
            payload,
            environment
          );
          break;

        /**
         * ======================================================
         * PAYMENT LINK
         * ======================================================
         */

        case "payment_link.paid":
        case "payment_link.partially_paid":
        case "payment_link.cancelled":
        case "payment_link.expired":
          await handlePaymentLinkEvent(
            merchantId,
            eventId,
            eventType,
            payload,
            environment
          );
          break;

        /**
         * ======================================================
         * UNKNOWN EVENT
         * ======================================================
         */

        default:
          logger.info(
            {
              merchantId,
              eventType,
            },
            "No synchronization handler for webhook event"
          );
      }

      /**
       * Mark webhook as successfully processed.
       */
      await prisma.webhookEvent.update({
        where: {
          id: eventId,
        },

        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      logger.info(
        {
          jobId: job.id,
          eventId,
          eventType,
        },
        "Sync job completed"
      );

      return {
        success: true,
        eventId,
        eventType,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown synchronization error";

      logger.error(
        {
          jobId: job.id,
          merchantId,
          eventId,
          eventType,
          error: message,
        },
        "Sync job failed"
      );

      /**
       * Preserve failure state.
       */
      try {
        await prisma.webhookEvent.update({
          where: {
            id: eventId,
          },

          data: {
            status: "FAILED",
            errorMessage: message,
          },
        });
      } catch (updateError: unknown) {
        const updateMessage =
          updateError instanceof Error
            ? updateError.message
            : "Unknown webhook update error";

        logger.error(
          {
            eventId,
            error: updateMessage,
          },
          "Failed to update WebhookEvent failure state"
        );
      }

      /**
       * IMPORTANT:
       *
       * Throwing allows BullMQ to retry the job.
       */
      throw error;
    }
  },

  {
    connection: createQueueConnection(),
    concurrency: 10,
  }
);

/**
 * ============================================================
 * PAYMENT FAILED
 * ============================================================
 */

async function handlePaymentFailed(
  merchantId: string,
  webhookEventId: string,
  payload: any,
  environment: SyncEnvironment
) {
  const payment =
    payload?.payload?.payment?.entity;

  if (!payment?.id) {
    throw new Error(
      "payment.failed payload missing payment.id"
    );
  }

  const amount =
    normalizeRazorpayAmount(
      payment.amount,
      `payment ${payment.id} amount`
    );

  if (amount === null) {
    throw new Error(
      `Payment ${payment.id} is missing amount`
    );
  }

  const paymentRecord =
    await prisma.payment.upsert({
      where: {
        merchantId_razorpayPaymentId: {
          merchantId,
          razorpayPaymentId: payment.id,
        },
      },

      create: {
        merchantId,

        razorpayPaymentId:
          payment.id,

        razorpayOrderId:
          payment.order_id ?? null,

        environment,

        amount,

        currency:
          payment.currency ?? "INR",

        status: "FAILED",

        failureReason:
          payment.error_description ??
          payment.error_reason ??
          null,

        method:
          payment.method ?? null,

        failedAt: new Date(),
      },

      update: {
        status: "FAILED",

        failureReason:
          payment.error_description ??
          payment.error_reason ??
          null,

        method:
          payment.method ?? undefined,

        failedAt: new Date(),
      },
    });

  /**
   * Link WebhookEvent → Payment.
   */
  await prisma.webhookEvent.update({
    where: {
      id: webhookEventId,
    },

    data: {
      paymentId: paymentRecord.id,
    },
  });

  /**
   * Find active recovery case.
   */
  const existingCase =
    await prisma.recoveryCase.findFirst({
      where: {
        merchantId,

        paymentId:
          paymentRecord.id,

        status: {
          notIn: [
            "RECOVERED",
            "STOPPED",
          ],
        },
      },
    });

  /**
   * Create recovery case only once.
   */
  if (!existingCase) {
    await prisma.recoveryCase.create({
      data: {
        merchantId,

        paymentId:
          paymentRecord.id,

        type:
          "PAYMENT_FAILURE",

        status:
          "OPEN",

        amountAtRisk:
          amount,

        recoveredAmount: 0,

        reason:
          payment.error_description ??
          payment.error_reason ??
          "Payment failed",
      },
    });

    logger.info(
      {
        merchantId,
        paymentId:
          paymentRecord.id,
      },
      "Recovery case created"
    );
  }

  logger.info(
    {
      merchantId,

      paymentId:
        paymentRecord.id,

      razorpayPaymentId:
        payment.id,
    },
    "Payment failure synchronized"
  );
}

/**
 * ============================================================
 * PAYMENT AUTHORIZED
 * ============================================================
 */

async function handlePaymentSuccessState(
  merchantId: string,
  webhookEventId: string,
  payload: any,
  environment: SyncEnvironment
) {
  const payment =
    payload?.payload?.payment?.entity;

  if (!payment?.id) {
    throw new Error(
      "payment.authorized payload missing payment.id"
    );
  }

  const amount =
    normalizeRazorpayAmount(
      payment.amount,
      `payment ${payment.id} amount`
    );

  if (amount === null) {
    throw new Error(
      `Payment ${payment.id} is missing amount`
    );
  }

  const paymentRecord =
    await prisma.payment.upsert({
      where: {
        merchantId_razorpayPaymentId: {
          merchantId,
          razorpayPaymentId:
            payment.id,
        },
      },

      create: {
        merchantId,

        razorpayPaymentId:
          payment.id,

        razorpayOrderId:
          payment.order_id ??
          null,

        environment,

        amount,

        currency:
          payment.currency ??
          "INR",

        status:
          "AUTHORIZED",

        method:
          payment.method ??
          null,
      },

      update: {
        status:
          "AUTHORIZED",

        method:
          payment.method ??
          undefined,
      },
    });

  await prisma.webhookEvent.update({
    where: {
      id: webhookEventId,
    },

    data: {
      paymentId:
        paymentRecord.id,
    },
  });

  logger.info(
    {
      merchantId,

      razorpayPaymentId:
        payment.id,
    },
    "Payment authorized synchronized"
  );
}

/**
 * ============================================================
 * M5.7 — PAYMENT CAPTURED
 * ============================================================
 */

async function handlePaymentCaptured(
  merchantId: string,
  webhookEventId: string,
  payload: any,
  environment: SyncEnvironment
) {
  const payment =
    payload?.payload?.payment?.entity;

  if (!payment?.id) {
    throw new Error(
      "payment.captured payload missing payment.id"
    );
  }

  const amount =
    normalizeRazorpayAmount(
      payment.amount,
      `payment ${payment.id} amount`
    );

  if (amount === null) {
    throw new Error(
      `Payment ${payment.id} is missing amount`
    );
  }

  const razorpayOrderId =
    payment.order_id ?? null;

  let orderId:
    | string
    | undefined;

  if (razorpayOrderId) {
    const order =
      await prisma.order.findUnique({
        where: {
          merchantId_razorpayOrderId: {
            merchantId,
            razorpayOrderId,
          },
        },

        select: {
          id: true,
        },
      });

    orderId = order?.id;
  }

  const paymentRecord =
    await prisma.payment.upsert({
      where: {
        merchantId_razorpayPaymentId: {
          merchantId,

          razorpayPaymentId:
            payment.id,
        },
      },

      create: {
        merchantId,

        orderId,

        razorpayPaymentId:
          payment.id,

        razorpayOrderId:
          payment.order_id ??
          null,

        environment,

        amount,

        currency:
          payment.currency ??
          "INR",

        status:
          "CAPTURED",

        method:
          payment.method ??
          null,

        capturedAt:
          new Date(),
      },

      update: {
        orderId,

        status:
          "CAPTURED",

        capturedAt:
          new Date(),

        method:
          payment.method ??
          undefined,

        razorpayOrderId:
          payment.order_id ??
          undefined,
      },
    });

  await prisma.webhookEvent.update({
    where: {
      id: webhookEventId,
    },

    data: {
      paymentId:
        paymentRecord.id,
    },
  });

  const recoveryCases =
    await prisma.recoveryCase.findMany({
      where: {
        merchantId,

        paymentId:
          paymentRecord.id,

        status: {
          notIn: [
            "RECOVERED",
            "STOPPED",
          ],
        },
      },
    });

  for (const recoveryCase of recoveryCases) {
    const outstandingAmount =
      Math.max(
        0,
        Number(
          recoveryCase.amountAtRisk
        ) -
          Number(
            recoveryCase.recoveredAmount ?? 0
          )
      );

    const recoveryAmount =
      Math.min(
        amount,
        outstandingAmount
      );

    if (recoveryAmount <= 0) {
      await prisma.recoveryCase.update({
        where: {
          id: recoveryCase.id,
        },

        data: {
          status:
            "RECOVERED",

          recoveredAt:
            new Date(),
        },
      });

      continue;
    }

    const newRecoveredAmount =
      Number(
        recoveryCase.recoveredAmount ?? 0
      ) + recoveryAmount;

    const fullyRecovered =
      newRecoveredAmount >=
      Number(
        recoveryCase.amountAtRisk
      );

    await prisma.recoveryCase.update({
      where: {
        id: recoveryCase.id,
      },

      data: {
        recoveredAmount:
          newRecoveredAmount,

        status:
          fullyRecovered
            ? "RECOVERED"
            : recoveryCase.status,

        recoveredAt:
          fullyRecovered
            ? new Date()
            : undefined,
      },
    });

    logger.info(
      {
        merchantId,

        recoveryCaseId:
          recoveryCase.id,

        paymentId:
          paymentRecord.id,

        recoveredAmount:
          newRecoveredAmount,

        amountAtRisk:
          recoveryCase.amountAtRisk,

        fullyRecovered,
      },
      "Recovery case updated after captured payment"
    );
  }

  logger.info(
    {
      merchantId,

      paymentId:
        paymentRecord.id,

      razorpayPaymentId:
        payment.id,

      amount,

      environment,
    },
    "Payment captured synchronized"
  );
}

/**
 * ============================================================
 * M5.8 — ORDER PAID
 * ============================================================
 */

async function handleOrderPaid(
  merchantId: string,
  webhookEventId: string,
  payload: any,
  environment: SyncEnvironment
) {
  const order =
    payload?.payload?.order?.entity;

  const payment =
    payload?.payload?.payment?.entity;

  if (!order?.id) {
    throw new Error(
      "order.paid payload missing order.id"
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const orderRecord =
        await upsertRazorpayOrder(
          tx,
          merchantId,
          environment,
          order
        );

      await tx.webhookEvent.update({
        where: {
          id: webhookEventId,
        },

        data: {
          orderId:
            orderRecord.id,
        },
      });

      if (payment?.id) {
        const amount =
          normalizeRazorpayAmount(
            payment.amount,
            `payment ${payment.id} amount`
          );

        if (amount === null) {
          throw new Error(
            `Payment ${payment.id} is missing amount`
          );
        }

        const paymentRecord =
          await tx.payment.upsert({
            where: {
              merchantId_razorpayPaymentId: {
                merchantId,

                razorpayPaymentId:
                  payment.id,
              },
            },

            create: {
              merchantId,

              orderId:
                orderRecord.id,

              razorpayPaymentId:
                payment.id,

              razorpayOrderId:
                payment.order_id ??
                order.id,

              environment,

              amount,

              currency:
                payment.currency ??
                order.currency ??
                "INR",

              status:
                "CAPTURED",

              method:
                payment.method ??
                null,

              capturedAt:
                new Date(),
            },

            update: {
              orderId:
                orderRecord.id,

              razorpayOrderId:
                payment.order_id ??
                order.id,

              status:
                "CAPTURED",

              method:
                payment.method ??
                undefined,

              capturedAt:
                new Date(),
            },
          });

        await tx.webhookEvent.update({
          where: {
            id: webhookEventId,
          },

          data: {
            paymentId:
              paymentRecord.id,
          },
        });

        const recoveryCases =
          await tx.recoveryCase.findMany({
            where: {
              merchantId,

              paymentId:
                paymentRecord.id,

              status: {
                notIn: [
                  "RECOVERED",
                  "STOPPED",
                ],
              },
            },
          });

        for (
          const recoveryCase
          of recoveryCases
        ) {
          const amountAtRisk =
            Number(
              recoveryCase.amountAtRisk
            );

          const recoveredAmount =
            Number(
              recoveryCase.recoveredAmount
            );

          const outstanding =
            Math.max(
              0,
              amountAtRisk -
                recoveredAmount
            );

          const recoveryAmount =
            Math.min(
              amount,
              outstanding
            );

          const newRecoveredAmount =
            recoveredAmount +
            recoveryAmount;

          const fullyRecovered =
            newRecoveredAmount >=
            amountAtRisk;

          await tx.recoveryCase.update({
            where: {
              id: recoveryCase.id,
            },

            data: {
              recoveredAmount:
                newRecoveredAmount,

              status:
                fullyRecovered
                  ? "RECOVERED"
                  : recoveryCase.status,

              recoveredAt:
                fullyRecovered
                  ? new Date()
                  : undefined,
            },
          });
        }
      }
    }
  );

  logger.info(
    {
      merchantId,

      webhookEventId,

      razorpayOrderId:
        order.id,

      razorpayPaymentId:
        payment?.id ?? null,

      environment,
    },

    "Order paid synchronized"
  );
}

/**
 * ============================================================
 * M5.9 — SUBSCRIPTION SYNCHRONIZATION
 * ============================================================
 */

async function handleSubscriptionEvent(
  merchantId: string,
  webhookEventId: string,
  eventType: string,
  payload: any,
  environment: SyncEnvironment
) {
  const subscription =
    payload?.payload?.subscription?.entity;

  if (!subscription?.id) {
    throw new Error(
      "Subscription webhook missing subscription.id"
    );
  }

  const merchant =
    await prisma.merchant.findUnique({
      where: {
        id: merchantId,
      },

      select: {
        id: true,
      },
    });

  if (!merchant) {
    throw new Error(
      `Merchant ${merchantId} not found`
    );
  }

  const status =
    mapRazorpaySubscriptionStatus(
      eventType,
      subscription.status
    );

  const amount =
    normalizeRazorpayAmount(
      subscription.amount,
      `subscription ${subscription.id} amount`
    );

  const currentPeriodStart =
    unixSecondsToDate(
      subscription.current_start
    );

  const currentPeriodEnd =
    unixSecondsToDate(
      subscription.current_end
    );

  const failedAttempts =
    normalizeInteger(
      subscription.charge_attempts ??
        subscription.auth_attempts
    );

  const subscriptionRecord =
    await prisma.subscription.upsert({
      where: {
        merchantId_razorpaySubscriptionId: {
          merchantId,

          razorpaySubscriptionId:
            subscription.id,
        },
      },

      create: {
        merchantId,

        razorpaySubscriptionId:
          subscription.id,

        environment,

        status,

        planId:
          subscription.plan_id ??
          null,

        amount,

        currency:
          subscription.currency ??
          "INR",

        currentPeriodStart,

        currentPeriodEnd,

        failedAttempts:
          failedAttempts ?? 0,
      },

      update: {
        environment,

        status,

        planId:
          subscription.plan_id ??
          undefined,

        amount:
          amount ??
          undefined,

        currency:
          subscription.currency ??
          undefined,

        currentPeriodStart:
          currentPeriodStart ??
          undefined,

        currentPeriodEnd:
          currentPeriodEnd ??
          undefined,

        failedAttempts:
          failedAttempts ??
          undefined,
      },
    });

  await prisma.webhookEvent.update({
    where: {
      id: webhookEventId,
    },

    data: {
      subscriptionId:
        subscriptionRecord.id,
    },
  });

  logger.info(
    {
      merchantId,

      subscriptionId:
        subscriptionRecord.id,

      razorpaySubscriptionId:
        subscription.id,

      status,

      amount,

      currency:
        subscription.currency ??
        "INR",

      currentPeriodStart,

      currentPeriodEnd,

      failedAttempts:
        failedAttempts ?? 0,

      environment,
    },
    "Subscription synchronized"
  );
}

/**
 * ============================================================
 * SUBSCRIPTION STATUS NORMALIZATION
 * ============================================================
 */

function mapRazorpaySubscriptionStatus(
  eventType: string,
  razorpayStatus?: string
):
  | "CREATED"
  | "ACTIVE"
  | "PENDING"
  | "HALTED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED" {

  switch (eventType) {
    case "subscription.pending":
      return "PENDING";

    case "subscription.halted":
      return "HALTED";

    case "subscription.charged":
      return "ACTIVE";
  }

  switch (
    String(
      razorpayStatus ?? ""
    ).toLowerCase()
  ) {
    case "active":
      return "ACTIVE";

    case "pending":
      return "PENDING";

    case "halted":
      return "HALTED";

    case "cancelled":
      return "CANCELLED";

    case "completed":
      return "COMPLETED";

    case "expired":
      return "EXPIRED";

    case "created":
      return "CREATED";

    default:
      return "CREATED";
  }
}

/**
 * ============================================================
 * M5.10 — PAYMENT LINK SYNCHRONIZATION
 * ============================================================
 *
 * Razorpay
 *    ↓
 * payment_link.*
 *    ↓
 * WebhookEvent
 *    ↓
 * BullMQ
 *    ↓
 * Sync Worker
 *    ↓
 * PaymentLink
 */

async function handlePaymentLinkEvent(
  merchantId: string,
  webhookEventId: string,
  eventType: string,
  payload: any,
  environment: SyncEnvironment
) {
  const paymentLink =
    payload?.payload?.payment_link?.entity;

  if (!paymentLink?.id) {
    throw new Error(
      `${eventType} payload missing payment_link.entity.id`
    );
  }

  /**
   * ----------------------------------------------------------
   * Normalize status
   * ----------------------------------------------------------
   */

  const status =
    normalizePaymentLinkStatus(
      paymentLink.status,
      eventType
    );

  /**
   * ----------------------------------------------------------
   * Normalize amounts
   * ----------------------------------------------------------
   */

  const amount =
    normalizeRazorpayAmount(
      paymentLink.amount,
      `payment link ${paymentLink.id} amount`
    );

  if (amount === null) {
    throw new Error(
      `Payment Link ${paymentLink.id} is missing amount`
    );
  }

  const amountPaid =
    normalizeRazorpayAmount(
      paymentLink.amount_paid ?? 0,
      `payment link ${paymentLink.id} amount_paid`
    ) ?? 0;

  const firstMinPartialAmount =
    paymentLink.first_min_partial_amount != null
      ? normalizeRazorpayAmount(
          paymentLink.first_min_partial_amount,
          `payment link ${paymentLink.id} first_min_partial_amount`
        )
      : null;

  /**
   * ----------------------------------------------------------
   * Resolve Customer
   * ----------------------------------------------------------
   */

  const customerId =
    await resolvePaymentLinkCustomer(
      merchantId,
      paymentLink.customer
    );

  /**
   * ----------------------------------------------------------
   * Normalize Razorpay timestamps
   * ----------------------------------------------------------
   */

  const expireBy =
    unixSecondsToDate(
      paymentLink.expire_by
    );

  const expiredAt =
    unixSecondsToDate(
      paymentLink.expired_at
    );

  const cancelledAt =
    unixSecondsToDate(
      paymentLink.cancelled_at
    );

  const razorpayCreatedAt =
    unixSecondsToDate(
      paymentLink.created_at
    );

  /**
   * ----------------------------------------------------------
   * UPSERT PAYMENT LINK
   * ----------------------------------------------------------
   *
   * Unique:
   *
   * merchantId + razorpayPaymentLinkId
   *
   * This makes synchronization merchant-safe
   * and idempotent.
   */

  const paymentLinkRecord =
    await prisma.paymentLink.upsert({
      where: {
        merchantId_razorpayPaymentLinkId: {
          merchantId,

          razorpayPaymentLinkId:
            paymentLink.id,
        },
      },

      create: {
        merchantId,

        customerId,

        razorpayPaymentLinkId:
          paymentLink.id,

        razorpayOrderId:
          paymentLink.order_id ??
          null,

        environment,

        amount,

        amountPaid,

        currency:
          paymentLink.currency ??
          "INR",

        status,

        acceptPartial:
          Boolean(
            paymentLink.accept_partial
          ),

        firstMinPartialAmount,

        referenceId:
          paymentLink.reference_id ??
          null,

        description:
          paymentLink.description ??
          null,

        shortUrl:
          paymentLink.short_url ??
          null,

        expireBy,

        expiredAt,

        cancelledAt,

        reminderEnable:
          paymentLink.reminder_enable ??
          null,

        upiLink:
          paymentLink.upi_link ??
          null,

        whatsappLink:
          paymentLink.whatsapp_link ??
          null,

        metadata:
          buildPaymentLinkMetadata(
            paymentLink
          ),

        ...(razorpayCreatedAt
          ? {
              createdAt:
                razorpayCreatedAt,
            }
          : {}),
      },

      update: {
        customerId:
          customerId ??
          undefined,

        razorpayOrderId:
          paymentLink.order_id ??
          undefined,

        environment,

        amount,

        amountPaid,

        currency:
          paymentLink.currency ??
          undefined,

        status,

        acceptPartial:
          paymentLink.accept_partial ??
          undefined,

        firstMinPartialAmount,

        referenceId:
          paymentLink.reference_id ??
          undefined,

        description:
          paymentLink.description ??
          undefined,

        shortUrl:
          paymentLink.short_url ??
          undefined,

        expireBy:
          expireBy ??
          undefined,

        expiredAt:
          expiredAt ??
          undefined,

        cancelledAt:
          cancelledAt ??
          undefined,

        reminderEnable:
          paymentLink.reminder_enable ??
          undefined,

        upiLink:
          paymentLink.upi_link ??
          undefined,

        whatsappLink:
          paymentLink.whatsapp_link ??
          undefined,

        metadata:
          buildPaymentLinkMetadata(
            paymentLink
          ),
      },
    });

  /**
   * ----------------------------------------------------------
   * Synchronize attached Payment
   * ----------------------------------------------------------
   *
   * Some Payment Link webhook payloads may contain
   * a payment entity.
   */

  const payment =
    payload?.payload?.payment?.entity;

  if (payment?.id) {
    const paymentAmount =
      normalizeRazorpayAmount(
        payment.amount,
        `payment ${payment.id} amount`
      );

    if (paymentAmount === null) {
      throw new Error(
        `Payment ${payment.id} is missing amount`
      );
    }

    const paymentStatus =
      String(
        payment.status ?? ""
      ).toLowerCase();

    const normalizedPaymentStatus =
      paymentStatus === "captured"
        ? "CAPTURED"
        : "AUTHORIZED";

    const paymentRecord =
      await prisma.payment.upsert({
        where: {
          merchantId_razorpayPaymentId: {
            merchantId,

            razorpayPaymentId:
              payment.id,
          },
        },

        create: {
          merchantId,

          razorpayPaymentId:
            payment.id,

          razorpayOrderId:
            payment.order_id ??
            paymentLink.order_id ??
            null,

          environment,

          amount:
            paymentAmount,

          currency:
            payment.currency ??
            paymentLink.currency ??
            "INR",

          status:
            normalizedPaymentStatus,

          method:
            payment.method ??
            null,

          capturedAt:
            normalizedPaymentStatus ===
            "CAPTURED"
              ? new Date()
              : null,
        },

        update: {
          razorpayOrderId:
            payment.order_id ??
            paymentLink.order_id ??
            undefined,

          status:
            normalizedPaymentStatus,

          method:
            payment.method ??
            undefined,

          capturedAt:
            normalizedPaymentStatus ===
            "CAPTURED"
              ? new Date()
              : undefined,
        },

      });

    /**
     * Link WebhookEvent → Payment.
     */
    await prisma.webhookEvent.update({
      where: {
        id: webhookEventId,
      },

      data: {
        paymentId:
          paymentRecord.id,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * Final logging
   * ----------------------------------------------------------
   */

  logger.info(
    {
      merchantId,

      paymentLinkId:
        paymentLinkRecord.id,

      razorpayPaymentLinkId:
        paymentLink.id,

      status,

      amount,

      amountPaid,

      currency:
        paymentLink.currency ??
        "INR",

      environment,

      eventType,
    },
    "Payment Link synchronized"
  );

  return paymentLinkRecord;
}

/**
 * ============================================================
 * PAYMENT LINK STATUS NORMALIZER
 * ============================================================
 */

function normalizePaymentLinkStatus(
  razorpayStatus: unknown,
  eventType: string
): PaymentLinkStatus {

  switch (
    String(
      razorpayStatus ?? ""
    ).toLowerCase()
  ) {
    case "created":
      return "CREATED";

    case "partially_paid":
      return "PARTIALLY_PAID";

    case "paid":
      return "PAID";

    case "cancelled":
      return "CANCELLED";

    case "expired":
      return "EXPIRED";
  }

  switch (eventType) {
    case "payment_link.paid":
      return "PAID";

    case "payment_link.partially_paid":
      return "PARTIALLY_PAID";

    case "payment_link.cancelled":
      return "CANCELLED";

    case "payment_link.expired":
      return "EXPIRED";

    default:
      throw new Error(
        `Unsupported Payment Link status: ${String(
          razorpayStatus
        )}`
      );
  }
}

/**
 * ============================================================
 * RAZORPAY AMOUNT NORMALIZER
 * ============================================================
 *
 * Razorpay:
 *
 * ₹500 = 50000 paise
 *
 * RevenueOS DB:
 *
 * 500
 */

function normalizeRazorpayAmount(
  value: unknown,
  fieldName: string
): number | null {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numeric =
    Number(value);

  if (
    !Number.isFinite(numeric) ||
    numeric < 0
  ) {
    throw new Error(
      `Invalid Razorpay amount for ${fieldName}: ${String(
        value
      )}`
    );
  }

  return numeric / 100;
}

/**
 * ============================================================
 * UNIX TIMESTAMP NORMALIZER
 * ============================================================
 */

function unixSecondsToDate(
  value: unknown
): Date | null {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const seconds =
    Number(value);

  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return null;
  }

  const date =
    new Date(seconds * 1000);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/**
 * ============================================================
 * PAYMENT LINK CUSTOMER RESOLUTION
 * ============================================================
 */

async function resolvePaymentLinkCustomer(
  merchantId: string,
  razorpayCustomer: any
): Promise<string | null> {

  if (!razorpayCustomer) {
    return null;
  }

  const email =
    normalizeNullableString(
      razorpayCustomer.email
    );

  const phone =
    normalizeNullableString(
      razorpayCustomer.contact
    );

  const name =
    normalizeNullableString(
      razorpayCustomer.name
    );

  if (!email && !phone) {
    return null;
  }

  /**
   * Prefer email.
   */
  let customer =
    email
      ? await prisma.customer.findFirst({
          where: {
            merchantId,
            email,
          },

          select: {
            id: true,
          },
        })
      : null;

  /**
   * Fallback to phone.
   */
  if (!customer && phone) {
    customer =
      await prisma.customer.findFirst({
        where: {
          merchantId,
          phone,
        },

        select: {
          id: true,
        },
      });
  }

  if (customer) {
    await prisma.customer.update({
      where: {
        id: customer.id,
      },

      data: {
        email:
          email ??
          undefined,

        phone:
          phone ??
          undefined,

        name:
          name ??
          undefined,
      },
    });

    return customer.id;
  }

  /**
   * Create internal customer.
   *
   * Prisma generates the internal ID.
   */
  const created =
    await prisma.customer.create({
      data: {
        merchantId,

        email,

        phone,

        name,
      },

      select: {
        id: true,
      },
    });

  return created.id;
}

/**
 * ============================================================
 * STRING NORMALIZER
 * ============================================================
 */

function normalizeNullableString(
  value: unknown
): string | null {

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const result =
    String(value).trim();

  return result.length > 0
    ? result
    : null;
}

/**
 * ============================================================
 * PAYMENT LINK METADATA
 * ============================================================
 */

function buildPaymentLinkMetadata(
  paymentLink: any
): Prisma.InputJsonValue {

  return {
    notes:
      paymentLink.notes ??
      null,

    notify:
      paymentLink.notify ??
      null,

    reminders:
      paymentLink.reminders ??
      null,

    callbackMethod:
      paymentLink.callback_method ??
      null,

    callbackUrl:
      paymentLink.callback_url ??
      null,

    userId:
      paymentLink.user_id ??
      null,

    whatsappLink:
      paymentLink.whatsapp_link ??
      null,

    upiLink:
      paymentLink.upi_link ??
      null,

    reminderEnable:
      paymentLink.reminder_enable ??
      null,

    acceptPartial:
      paymentLink.accept_partial ??
      null,
  };
}

/**
 * ============================================================
 * INTEGER NORMALIZER
 * ============================================================
 */

function normalizeInteger(
  value: unknown
): number | null {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numeric =
    Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.max(
    0,
    Math.trunc(numeric)
  );
}

/**
 * ============================================================
 * BULLMQ EVENTS
 * ============================================================
 */

syncWorker.on(
  "completed",
  (job) => {
    logger.info(
      {
        jobId: job.id,
      },
      "Sync job completed"
    );
  }
);

syncWorker.on(
  "failed",
  (job, error) => {
    logger.error(
      {
        jobId: job?.id,

        error:
          error.message,
      },
      "Sync job failed"
    );
  }
);

/**
 * ============================================================
 * WORKER STARTUP
 * ============================================================
 */

logger.info(
  {
    queue:
      SYNC_QUEUE_NAME,

    concurrency: 10,
  },
  "Razorpay sync worker started"
);
