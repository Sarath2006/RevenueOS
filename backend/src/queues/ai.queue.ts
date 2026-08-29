/**
 * ============================================================
 * RevenueOS — AI Decision Queue
 * ============================================================
 *
 * M6.10
 *
 * Responsibilities:
 * - Create AI analysis queue
 * - Configure retries
 * - Prevent duplicate active jobs
 * - Provide deterministic job IDs
 *
 * Does NOT:
 * - calculate AI scores
 * - persist decisions
 * - call Razorpay
 * ============================================================
 */

import { Queue } from "bullmq";

import {
  createQueueConnection,
} from "./connection";

import {
  AIDecisionJobData,
} from "./ai.types";


/**
 * ============================================================
 * QUEUE NAME
 * ============================================================
 */

export const AI_QUEUE_NAME =
  "ai-analysis";


/**
 * ============================================================
 * AI QUEUE
 * ============================================================
 */

export const aiQueue =
  new Queue<AIDecisionJobData>(
    AI_QUEUE_NAME,
    {
      connection:
        createQueueConnection(),

      defaultJobOptions: {
        /**
         * Retry transient failures.
         */
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 2000,
        },

        /**
         * Keep successful jobs for debugging.
         */
        removeOnComplete: {
          count: 100,
        },

        /**
         * Keep failed jobs for debugging.
         */
        removeOnFail: {
          count: 500,
        },
      },
    },
  );


/**
 * ============================================================
 * JOB ID
 * ============================================================
 *
 * BullMQ does NOT allow ":" inside custom job IDs.
 *
 * WRONG:
 *
 * decision:case123
 *
 * CORRECT:
 *
 * decision-case123
 * ============================================================
 */

export function buildAIDecisionJobId(
  recoveryCaseId?: string | null,
  customerId?: string,
): string {
  if (recoveryCaseId) {
    return `decision-${recoveryCaseId}`;
  }
  if (customerId) {
    return `decision-cust-${customerId}-${Date.now()}`;
  }
  return `decision-${Date.now()}`;
}


/**
 * ============================================================
 * ENQUEUE AI DECISION
 * ============================================================
 */

export async function enqueueAIDecision(
  data: AIDecisionJobData,
) {
  const jobId =
    buildAIDecisionJobId(
      data.recoveryCaseId,
      data.customerId,
    );


  /**
   * Check for an existing job.
   */
  const existingJob =
    await aiQueue.getJob(jobId);


  if (existingJob) {
    const state =
      await existingJob.getState();


    /**
     * Do not duplicate active work.
     */
    if (
      state === "waiting" ||
      state === "active" ||
      state === "delayed"
    ) {
      return existingJob;
    }


    /**
     * If the old job is completed
     * or failed, remove it so the
     * recovery case can be processed again.
     */
    if (
      state === "completed" ||
      state === "failed"
    ) {
      await existingJob.remove();
    }
  }


  /**
   * Create new job.
   */
  return aiQueue.add(
    "create-decision",
    data,
    {
      jobId,
    },
  );
}


/**
 * ============================================================
 * QUEUE SHUTDOWN
 * ============================================================
 */

export async function closeAIQueue() {
  await aiQueue.close();
}