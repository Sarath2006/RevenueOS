import { QueueEvents } from "bullmq";

import {
  createQueueConnection,
} from "./connection";

import { AI_QUEUE_NAME } from "./ai.queue";
import {
  RECOVERY_QUEUE_NAME,
} from "./recovery.queue";
import {
  SYNC_QUEUE_NAME,
} from "./sync.queue";
import {
  NOTIFICATION_QUEUE_NAME,
} from "./notification.queue";
import {
  ANALYTICS_QUEUE_NAME,
} from "./analytics.queue";

const queues = [
  AI_QUEUE_NAME,
  RECOVERY_QUEUE_NAME,
  SYNC_QUEUE_NAME,
  NOTIFICATION_QUEUE_NAME,
  ANALYTICS_QUEUE_NAME,
];

export const queueEvents = queues.map(
  (queueName) => {
    const events = new QueueEvents(
      queueName,
      {
        connection:
          createQueueConnection(),
      }
    );

    events.on("completed", (event) => {
      console.log(
        `[Queue:${queueName}] completed`,
        event.jobId
      );
    });

    events.on("failed", (event) => {
      console.error(
        `[Queue:${queueName}] failed`,
        event.jobId,
        event.failedReason
      );
    });

    return events;
  }
);