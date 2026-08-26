import { Worker } from "bullmq";

import {
  createQueueConnection,
} from "../queues/connection";

import {
  NOTIFICATION_QUEUE_NAME,
} from "../queues/notification.queue";

const worker = new Worker(
  NOTIFICATION_QUEUE_NAME,

  async (job) => {
    console.log(
      `Notification job received: ${job.id}`
    );

    const {
      channel,
      recipient,
      message,
    } = job.data;

    console.log({
      channel,
      recipient,
      message,
    });

    // Email / WhatsApp / SMS
    // will be connected later.

    return {
      success: true,

      channel,

      status: "NOTIFICATION_PENDING",
    };
  },

  {
    connection:
      createQueueConnection(),

    concurrency: 10,
  }
);

worker.on("completed", (job) => {
  console.log(
    `Notification job ${job.id} completed`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `Notification job ${job?.id} failed`,
    error
  );
});

console.log(
  "Notification worker started"
);