import {
  Prisma,
  Environment,
} from "../../generated/prisma/client";

import { prisma } from "../../config/database";

import {
  normalizeRazorpayOrder,
} from "./order.normalizer";

export async function upsertRazorpayOrder(
  tx: Prisma.TransactionClient,
  merchantId: string,
  environment: Environment,
  entity: any
) {
  const normalized =
    normalizeRazorpayOrder(
      entity,
      environment
    );

  return tx.order.upsert({
    where: {
      merchantId_razorpayOrderId: {
        merchantId,
        razorpayOrderId:
          normalized.razorpayOrderId,
      },
    },

    create: {
      merchantId,

      razorpayOrderId:
        normalized.razorpayOrderId,

      environment:
        normalized.environment,

      amount:
        normalized.amount,

      amountPaid:
        normalized.amountPaid,

      amountDue:
        normalized.amountDue,

      currency:
        normalized.currency,

      status:
        normalized.status,

      attempts:
        normalized.attempts,

      receipt:
        normalized.receipt,

      notes:
        normalized.notes as Prisma.InputJsonObject | undefined,
    },

    update: {
      environment:
        normalized.environment,

      amount:
        normalized.amount,

      amountPaid:
        normalized.amountPaid,

      amountDue:
        normalized.amountDue,

      currency:
        normalized.currency,

      status:
        normalized.status,

      attempts:
        normalized.attempts,

      receipt:
        normalized.receipt,

      notes:
        normalized.notes as Prisma.InputJsonObject | undefined,
    },
  });
}
