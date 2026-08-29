import { Redis } from "ioredis";

import { env } from "../config/env";

/**
 * ============================================================
 * BULLMQ REDIS CONNECTION
 * ============================================================
 *
 * BullMQ requires a dedicated Redis connection.
 *
 * IMPORTANT:
 * maxRetriesPerRequest MUST be null for BullMQ workers.
 */

export function createQueueConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,

    enableReadyCheck: true,

    lazyConnect: false,
  });
}