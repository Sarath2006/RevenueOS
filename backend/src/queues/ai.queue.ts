import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const AI_QUEUE_NAME = "ai-analysis";

export const aiQueue = new Queue(AI_QUEUE_NAME, {
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