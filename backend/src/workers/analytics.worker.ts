import { Worker } from "bullmq";

import {
  createQueueConnection,
} from "../queues/connection";

import {
  ANALYTICS_QUEUE_NAME,
} from "../queues/analytics.queue";

const worker = new Worker(
  ANALYTICS_QUEUE_NAME,

  async (job) => {
    console.log(
      `Analytics job received: ${job.id}`
    );

    const {
      merchantId,
      event,
    } = job.data;

    console.log({
      merchantId,
      event,
    });

    return {
      success: true,

      merchantId,

      event,

      status: "ANALYTICS_PROCESSED",
    };
  },

  {
    connection:
      createQueueConnection(),

    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(
    `Analytics job ${job.id} completed`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `Analytics job ${job?.id} failed`,
    error
  );
});

console.log(
  "Analytics worker started"
);