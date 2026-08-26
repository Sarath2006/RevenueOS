import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const ANALYTICS_QUEUE_NAME =
  "analytics";

export const analyticsQueue = new Queue(
  ANALYTICS_QUEUE_NAME,
  {
    connection: createQueueConnection(),

    defaultJobOptions: {
      attempts: 3,

      backoff: {
        type: "exponential",
        delay: 3000,
      },

      removeOnComplete: 100,

      removeOnFail: 500,
    },
  }
);