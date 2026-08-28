import {
  PaymentFailureCategory,
  PaymentStatus,
} from "../../generated/prisma/client";

export interface NormalizedPayment {
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  razorpayInvoiceId?: string;

  amount: number;
  currency: string;

  status: PaymentStatus;

  failureCategory: PaymentFailureCategory;
  failureReason?: string;

  method?: string;
  cardNetwork?: string;
  bank?: string;

  capturedAt?: Date;
  failedAt?: Date;
}

function mapFailureCategory(
  reason?: string,
): PaymentFailureCategory {
  if (!reason) {
    return PaymentFailureCategory.UNKNOWN;
  }

  const value = reason.toLowerCase();

  if (
    value.includes("insufficient") ||
    value.includes("balance")
  ) {
    return PaymentFailureCategory.INSUFFICIENT_FUNDS;
  }

  if (
    value.includes("bank") &&
    value.includes("declin")
  ) {
    return PaymentFailureCategory.BANK_DECLINED;
  }

  if (
    value.includes("card") &&
    value.includes("declin")
  ) {
    return PaymentFailureCategory.CARD_DECLINED;
  }

  if (
    value.includes("network") ||
    value.includes("timeout")
  ) {
    return PaymentFailureCategory.NETWORK_ERROR;
  }

  if (
    value.includes("authentication") ||
    value.includes("auth")
  ) {
    return PaymentFailureCategory.AUTHENTICATION_FAILED;
  }

  if (value.includes("otp")) {
    return PaymentFailureCategory.OTP_FAILURE;
  }

  if (
    value.includes("limit") ||
    value.includes("exceed")
  ) {
    return PaymentFailureCategory.LIMIT_EXCEEDED;
  }

  if (value.includes("expired")) {
    return PaymentFailureCategory.EXPIRED_CARD;
  }

  if (
    value.includes("fraud") ||
    value.includes("risk")
  ) {
    return PaymentFailureCategory.FRAUD_REVIEW;
  }

  return PaymentFailureCategory.UNKNOWN;
}

export function normalizePayment(
  payment: any,
): NormalizedPayment {
  const status = String(payment.status ?? "")
    .toLowerCase();

  let normalizedStatus: PaymentStatus;

  switch (status) {
    case "created":
      normalizedStatus = PaymentStatus.CREATED;
      break;

    case "authorized":
      normalizedStatus = PaymentStatus.AUTHORIZED;
      break;

    case "captured":
      normalizedStatus = PaymentStatus.CAPTURED;
      break;

    case "failed":
      normalizedStatus = PaymentStatus.FAILED;
      break;

    case "refunded":
      normalizedStatus = PaymentStatus.REFUNDED;
      break;

    default:
      normalizedStatus = PaymentStatus.CREATED;
  }

  const errorReason =
    payment.error_description ??
    payment.error_reason ??
    payment.error_source ??
    payment.error_step;

  return {
    razorpayPaymentId: payment.id,

    razorpayOrderId:
      payment.order_id ?? undefined,

    razorpayInvoiceId:
      payment.invoice_id ?? undefined,

    // Razorpay amount is in paise.
    amount: Number(payment.amount ?? 0) / 100,

    currency:
      payment.currency ?? "INR",

    status: normalizedStatus,

    failureCategory:
      normalizedStatus === PaymentStatus.FAILED
        ? mapFailureCategory(errorReason)
        : PaymentFailureCategory.NONE,

    failureReason:
      errorReason ?? undefined,

    method:
      payment.method ?? undefined,

    cardNetwork:
      payment.card?.network ?? undefined,

    bank:
      payment.bank ?? undefined,

    capturedAt:
      normalizedStatus === PaymentStatus.CAPTURED
        ? new Date()
        : undefined,

    failedAt:
      normalizedStatus === PaymentStatus.FAILED
        ? new Date()
        : undefined,
  };
}
