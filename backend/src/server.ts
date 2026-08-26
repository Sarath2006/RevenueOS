import app from "./app";

import { env } from "./config/env";

import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database";

import { redis } from "./config/redis";

import { logger } from "./config/logger";

async function bootstrap() {
  try {
    await connectDatabase();

    await redis.ping();

    logger.info("Redis connection verified");

    const server = app.listen(
      env.PORT,
      () => {
        logger.info(
          `RevenueOS API running at http://localhost:${env.PORT}`
        );
      }
    );

    const shutdown = async (
      signal: string
    ) => {
      logger.info(
        `${signal} received`
      );

      server.close(async () => {
        await redis.quit();

        await disconnectDatabase();

        logger.info(
          "RevenueOS shutdown complete"
        );

        process.exit(0);
      });
    };

    process.on(
      "SIGTERM",
      () => shutdown("SIGTERM")
    );

    process.on(
      "SIGINT",
      () => shutdown("SIGINT")
    );
  } catch (error) {
    logger.error(
      error,
      "Failed to start RevenueOS"
    );

    process.exit(1);
  }
}

bootstrap();