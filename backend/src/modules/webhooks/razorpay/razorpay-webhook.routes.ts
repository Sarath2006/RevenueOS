import { Router } from "express";

import {
  handleRazorpayWebhook,
} from "./razorpay-webhook.controller";

const router = Router();

router.post(
  "/razorpay",
  handleRazorpayWebhook
);

export default router;