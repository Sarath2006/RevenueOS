import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("ready", () => {
  console.log("Redis ready");
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});