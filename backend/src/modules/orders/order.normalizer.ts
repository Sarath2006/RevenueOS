import { Environment } from "../../generated/prisma/client";

export interface NormalizedRazorpayOrder {
  razorpayOrderId: string;

  amount: number;

  amountPaid: number;

  amountDue: number;

  currency: string;

  status: string;

  attempts: number;

  receipt: string | null;

  notes: Record<string, unknown> | null;

  environment: Environment;
}

function normalizeAmount(
  value: unknown
): number {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      `Invalid Razorpay order amount: ${String(value)}`
    );
  }

  return amount / 100;
}

export function normalizeRazorpayOrder(
  entity: any,
  environment: Environment
): NormalizedRazorpayOrder {
  if (!entity?.id) {
    throw new Error(
      "Razorpay order payload missing order.id"
    );
  }

  return {
    razorpayOrderId: String(entity.id),

    amount: normalizeAmount(
      entity.amount
    ),

    amountPaid: normalizeAmount(
      entity.amount_paid
    ),

    amountDue: normalizeAmount(
      entity.amount_due
    ),

    currency:
      typeof entity.currency === "string"
        ? entity.currency
        : "INR",

    status:
      typeof entity.status === "string"
        ? entity.status
        : "CREATED",

    attempts:
      Number.isInteger(entity.attempts) &&
      entity.attempts >= 0
        ? entity.attempts
        : 0,

    receipt:
      entity.receipt != null
        ? String(entity.receipt)
        : null,

    notes:
      entity.notes &&
      typeof entity.notes === "object"
        ? entity.notes
        : null,

    environment,
  };
}
