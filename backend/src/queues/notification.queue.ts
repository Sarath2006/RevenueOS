import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const NOTIFICATION_QUEUE_NAME =
  "notifications";

export const notificationQueue = new Queue(
  NOTIFICATION_QUEUE_NAME,
  {
    connection: createQueueConnection(),

    defaultJobOptions: {
      attempts: 3,

      backoff: {
        type: "exponential",
        delay: 2000,
      },

      removeOnComplete: 100,

      removeOnFail: 500,
    },
  }
);