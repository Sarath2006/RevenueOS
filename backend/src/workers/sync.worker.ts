import { Worker } from "bullmq";

import {
  createQueueConnection,
} from "../queues/connection";

import {
  SYNC_QUEUE_NAME,
} from "../queues/sync.queue";

const worker = new Worker(
  SYNC_QUEUE_NAME,

  async (job) => {
    console.log(
      `Sync job received: ${job.id}`
    );

    const {
      merchantId,
      resourceType,
    } = job.data;

    console.log(
      `Syncing ${resourceType} for merchant ${merchantId}`
    );

    return {
      success: true,

      merchantId,

      resourceType,

      status: "SYNC_PENDING",
    };
  },

  {
    connection:
      createQueueConnection(),

    concurrency: 3,
  }
);

worker.on("completed", (job) => {
  console.log(
    `Sync job ${job.id} completed`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `Sync job ${job?.id} failed`,
    error
  );
});

console.log(
  "Sync worker started"
);