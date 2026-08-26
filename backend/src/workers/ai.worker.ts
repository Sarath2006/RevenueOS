import { Worker } from "bullmq";

import {
  createQueueConnection,
} from "../queues/connection";

import {
  AI_QUEUE_NAME,
} from "../queues/ai.queue";

const worker = new Worker(
  AI_QUEUE_NAME,

  async (job) => {
    console.log(
      `AI job received: ${job.id}`
    );

    const {
      recoveryCaseId,
    } = job.data;

    console.log(
      `Analyzing recovery case: ${recoveryCaseId}`
    );

    // AI service will be connected in M4.

    return {
      success: true,

      recoveryCaseId,

      status: "AI_ANALYSIS_PENDING",
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
    `AI job ${job.id} completed`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `AI job ${job?.id} failed`,
    error
  );
});

console.log(
  "AI worker started"
);