import { Worker } from "bullmq";

import {
  createQueueConnection,
} from "../queues/connection";

import {
  RECOVERY_QUEUE_NAME,
} from "../queues/recovery.queue";

const worker = new Worker(
  RECOVERY_QUEUE_NAME,

  async (job) => {
    console.log(
      `Recovery job received: ${job.id}`
    );

    const {
      recoveryCaseId,
    } = job.data;

    console.log(
      `Processing recovery case: ${recoveryCaseId}`
    );

    return {
      success: true,

      recoveryCaseId,

      status: "RECOVERY_PROCESSING",
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
    `Recovery job ${job.id} completed`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `Recovery job ${job?.id} failed`,
    error
  );
});

console.log(
  "Recovery worker started"
);