import Razorpay from "razorpay";

import { env } from "../../config/env";

export type RazorpayMode =
  | "test"
  | "live";

export function getRazorpayClient(
  mode: RazorpayMode = env.RAZORPAY_MODE
) {
  const keyId =
    mode === "test"
      ? env.RAZORPAY_TEST_KEY_ID
      : env.RAZORPAY_LIVE_KEY_ID;

  const keySecret =
    mode === "test"
      ? env.RAZORPAY_TEST_KEY_SECRET
      : env.RAZORPAY_LIVE_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      `Razorpay ${mode} credentials are not configured`
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}