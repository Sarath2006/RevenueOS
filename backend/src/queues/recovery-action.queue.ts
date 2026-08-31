/**
 * ============================================================
 * RECOVERY ACTION QUEUE
 * ============================================================
 *
 * Asynchronous BullMQ queue for dispatching and executing
 * bounded recovery actions in near real-time.
 * ============================================================
 */

import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";
import { RecoveryActionJobData } from "./recovery-action.types";
import { logger } from "../config/logger";

export const RECOVERY_ACTION_QUEUE_NAME = "recovery-action";

export const recoveryActionQueue = new Queue<RecoveryActionJobData>(
  RECOVERY_ACTION_QUEUE_NAME,
  {
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
  },
);

export async function enqueueRecoveryAction(
  data: Omit<RecoveryActionJobData, "enqueuedAt">,
) {
  const jobId = `action-${data.recoveryCaseId}-${Date.now()}`;

  logger.info(
    {
      jobId,
      recoveryCaseId: data.recoveryCaseId,
      decisionId: data.decisionId,
    },
    "Enqueuing recovery action job",
  );

  return recoveryActionQueue.add(
    "execute-action",
    {
      ...data,
      enqueuedAt: new Date(),
    },
    {
      jobId,
    },
  );
}

