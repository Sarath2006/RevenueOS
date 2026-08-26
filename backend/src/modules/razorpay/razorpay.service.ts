import crypto from "node:crypto";

import {
  getRazorpayClient,
  RazorpayMode,
} from "./razorpay.config";

export class RazorpayService {
  async createOrder(
    params: {
      amount: number;
      currency: string;
      receipt: string;
      notes?: Record<string, string>;
    },
    mode?: RazorpayMode
  ) {
    const razorpay =
      getRazorpayClient(mode);

    return razorpay.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    });
  }

  async fetchOrder(
    orderId: string,
    mode?: RazorpayMode
  ) {
    const razorpay =
      getRazorpayClient(mode);

    return razorpay.orders.fetch(
      orderId
    );
  }

  async fetchPayment(
    paymentId: string,
    mode?: RazorpayMode
  ) {
    const razorpay =
      getRazorpayClient(mode);

    return razorpay.payments.fetch(
      paymentId
    );
  }

  async fetchPaymentsForOrder(
    orderId: string,
    mode?: RazorpayMode
  ) {
    const razorpay =
      getRazorpayClient(mode);

    return razorpay.orders.fetchPayments(
      orderId
    );
  }

  async createPaymentLink(
    params: any,
    mode?: RazorpayMode
  ) {
    const razorpay =
      getRazorpayClient(mode);

    return razorpay.paymentLink.create(
      params
    );
  }

  async fetchPaymentLink(
    paymentLinkId: string,
    mode?: RazorpayMode
  ) {
    const razorpay =
      getRazorpayClient(mode);

    return razorpay.paymentLink.fetch(
      paymentLinkId
    );
  }

  async cancelPaymentLink(
    paymentLinkId: string,
    mode?: RazorpayMode
  ) {
    const razorpay =
      getRazorpayClient(mode);

    return razorpay.paymentLink.cancel(
      paymentLinkId
    );
  }

   /**
   * Verify Razorpay Checkout payment signature.
   *
   * Razorpay creates the signature from:
   *
   * order_id + "|" + payment_id
   *
   * using the Razorpay Key Secret.
   */
  verifyPaymentSignature(
    params: {
      orderId: string;
      paymentId: string;
      signature: string;
    },
    mode: RazorpayMode = "test"
  ): boolean {
    const keySecret =
      mode === "live"
        ? process.env.RAZORPAY_LIVE_KEY_SECRET
        : process.env.RAZORPAY_TEST_KEY_SECRET;

    if (!keySecret) {
      throw new Error(
        `Razorpay ${mode} Key Secret is not configured`
      );
    }

    const payload =
      `${params.orderId}|${params.paymentId}`;

    const expectedSignature =
      crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

    if (
      expectedSignature.length !==
      params.signature.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(params.signature)
    );
  }
}

export const razorpayService =
  new RazorpayService();