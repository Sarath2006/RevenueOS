import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const RECOVERY_QUEUE_NAME = "recovery";

export const recoveryQueue = new Queue(RECOVERY_QUEUE_NAME, {
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
});
