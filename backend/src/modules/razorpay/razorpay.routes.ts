import { Router } from "express";

import {
  createOrder,
  fetchOrder,
  fetchPayment,
  fetchOrderPayments,
  createPaymentLink,
  fetchPaymentLink,
  cancelPaymentLink,
  verifyPayment,
} from "./razorpay.controller";

const router = Router();

router.post(
  "/orders",
  createOrder
);

router.get(
  "/orders/:orderId",
  fetchOrder
);

router.get(
  "/orders/:orderId/payments",
  fetchOrderPayments
);

router.get(
  "/payments/:paymentId",
  fetchPayment
);

router.post(
  "/payment-links",
  createPaymentLink
);

router.get(
  "/payment-links/:paymentLinkId",
  fetchPaymentLink
);

router.post(
  "/payment-links/:paymentLinkId/cancel",
  cancelPaymentLink
);

router.post(
  "/payments/verify",
  verifyPayment
);

export default router;