import crypto from "crypto";
import { env } from "../../../config/env";

export function getRazorpayWebhookSecret() {
  if (env.RAZORPAY_MODE === "test") {
    if (!env.RAZORPAY_TEST_WEBHOOK_SECRET) {
      throw new Error(
        "RAZORPAY_TEST_WEBHOOK_SECRET is not configured"
      );
    }

    return env.RAZORPAY_TEST_WEBHOOK_SECRET;
  }

  if (!env.RAZORPAY_LIVE_WEBHOOK_SECRET) {
    throw new Error(
      "RAZORPAY_LIVE_WEBHOOK_SECRET is not configured"
    );
  }

  return env.RAZORPAY_LIVE_WEBHOOK_SECRET;
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer,
  receivedSignature: string
): boolean {
  const secret = getRazorpayWebhookSecret();

  const expectedSignature =
    crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

  const expected =
    Buffer.from(expectedSignature, "utf8");

  const received =
    Buffer.from(receivedSignature, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received
  );
}