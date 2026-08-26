import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  FRONTEND_URL: z.string().url(),

  AI_SERVICE_URL: z.string().url(),

  RAZORPAY_MODE: z
    .enum(["test", "live"])
    .default("test"),

  RAZORPAY_TEST_KEY_ID:
    z.string().optional(),

  RAZORPAY_TEST_KEY_SECRET:
    z.string().optional(),

  RAZORPAY_LIVE_KEY_ID:
    z.string().optional(),

  RAZORPAY_LIVE_KEY_SECRET:
    z.string().optional(),

  RAZORPAY_TEST_WEBHOOK_SECRET:
    z.string().optional(),

  RAZORPAY_LIVE_WEBHOOK_SECRET:
    z.string().optional(),

  JWT_SECRET:
    z.string().optional(),
});

export const env = envSchema.parse(
  process.env
);