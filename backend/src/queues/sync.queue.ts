import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";

export const SYNC_QUEUE_NAME = "razorpay-sync";

export interface SyncJob {
  merchantId: string;

  mode: "test" | "live";

  /**
   * RevenueOS internal WebhookEvent ID
   */
  eventId: string;

  /**
   * Razorpay event ID
   */
  razorpayEventId?: string;

  /**
   * Razorpay event name
   */
  eventType: string;

  /**
   * Original Razorpay webhook payload
   */
  payload: any;
}

export const syncQueue = new Queue<SyncJob>(
  SYNC_QUEUE_NAME,
  {
    connection: createQueueConnection(),

    defaultJobOptions: {
      attempts: 5,

      backoff: {
        type: "exponential",
        delay: 1000,
      },

      removeOnComplete: {
        age: 3600,
        count: 1000,
      },

      removeOnFail: {
        age: 86400,
      },
    },
  }
);