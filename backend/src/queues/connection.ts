import IORedis from "ioredis";
import { env } from "../config/env";

export function createQueueConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}