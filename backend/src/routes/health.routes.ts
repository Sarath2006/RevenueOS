import { Router } from "express";

import { prisma } from "../config/database";
import { redis } from "../config/redis";

const router = Router();

router.get("/", async (_req, res) => {
  let database = "disconnected";
  let redisStatus = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }

  try {
    await redis.ping();
    redisStatus = "connected";
  } catch {
    redisStatus = "disconnected";
  }

  const healthy =
    database === "connected" &&
    redisStatus === "connected";

  res.status(healthy ? 200 : 503).json({
    success: healthy,

    service: "RevenueOS Backend",

    status: healthy
      ? "healthy"
      : "unhealthy",

    timestamp: new Date().toISOString(),

    services: {
      database,
      redis: redisStatus,
    },
  });
});

export default router;