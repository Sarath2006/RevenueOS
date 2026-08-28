import crypto from "node:crypto";

import {
  getRazorpayClient,
  RazorpayMode,
} from "./razorpay.config";

export class RazorpayService {
  /**
   * Create Razorpay Order
   */
  async createOrder(
    params: {
      amount: number;
      currency: string;
      receipt: string;
      notes?: Record<string, string>;
    },
    mode: RazorpayMode = "test"
  ) {
    const razorpay = getRazorpayClient(mode);

    return razorpay.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    });
  }

  /**
   * Fetch Razorpay Order
   */
  async fetchOrder(
    orderId: string,
    mode: RazorpayMode = "test"
  ) {
    const razorpay = getRazorpayClient(mode);

    return razorpay.orders.fetch(orderId);
  }

  /**
   * Fetch Razorpay Payment
   */
  async fetchPayment(
    paymentId: string,
    mode: RazorpayMode = "test"
  ) {
    const razorpay = getRazorpayClient(mode);

    return razorpay.payments.fetch(paymentId);
  }

  /**
   * Fetch payments belonging to an order
   */
  async fetchPaymentsForOrder(
    orderId: string,
    mode: RazorpayMode = "test"
  ) {
    const razorpay = getRazorpayClient(mode);

    return razorpay.orders.fetchPayments(orderId);
  }

  /**
   * Create Razorpay Payment Link
   */
  async createPaymentLink(
    params: any,
    mode: RazorpayMode = "test"
  ) {
    const razorpay = getRazorpayClient(mode);

    return razorpay.paymentLink.create(params);
  }

  /**
   * Fetch Payment Link
   */
  async fetchPaymentLink(
    paymentLinkId: string,
    mode: RazorpayMode = "test"
  ) {
    const razorpay = getRazorpayClient(mode);

    return razorpay.paymentLink.fetch(
      paymentLinkId
    );
  }

  /**
   * Cancel Payment Link
   */
  async cancelPaymentLink(
    paymentLinkId: string,
    mode: RazorpayMode = "test"
  ) {
    const razorpay = getRazorpayClient(mode);

    return razorpay.paymentLink.cancel(
      paymentLinkId
    );
  }

  /**
   * Verify Razorpay Checkout payment signature.
   *
   * Razorpay Checkout signature:
   *
   * order_id|payment_id
   *
   * HMAC-SHA256 using Razorpay Key Secret.
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
        .createHmac(
          "sha256",
          keySecret
        )
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