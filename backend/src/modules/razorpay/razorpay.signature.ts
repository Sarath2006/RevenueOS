import crypto from "crypto";

import { env } from "../../config/env";

function getSecret() {
  if (
    env.RAZORPAY_MODE === "test"
  ) {
    if (
      !env.RAZORPAY_TEST_KEY_SECRET
    ) {
      throw new Error(
        "Razorpay test secret is missing"
      );
    }

    return env.RAZORPAY_TEST_KEY_SECRET;
  }

  if (
    !env.RAZORPAY_LIVE_KEY_SECRET
  ) {
    throw new Error(
      "Razorpay live secret is missing"
    );
  }

  return env.RAZORPAY_LIVE_KEY_SECRET;
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  receivedSignature: string
) {
  const secret = getSecret();

  const payload =
    `${orderId}|${paymentId}`;

  const expected =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(payload)
      .digest("hex");

  const expectedBuffer =
    Buffer.from(expected, "utf8");

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      "utf8"
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}