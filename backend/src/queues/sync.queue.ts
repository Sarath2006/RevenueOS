import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const SYNC_QUEUE_NAME = "razorpay-sync";

export const syncQueue = new Queue(
  SYNC_QUEUE_NAME,
  {
    connection: createQueueConnection(),

    defaultJobOptions: {
      attempts: 5,

      backoff: {
        type: "exponential",
        delay: 5000,
      },

      removeOnComplete: 100,

      removeOnFail: 500,
    },
  }
);