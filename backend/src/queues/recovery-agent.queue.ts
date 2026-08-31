/**
 * ============================================================
 * RECOVERY AGENT QUEUE
 * ============================================================
 *
 * Asynchronous BullMQ queue for dispatching autonomous recovery
 * agent lifecycle runs.
 * ============================================================
 */

import { Queue } from "bullmq";
import { createQueueConnection } from "./connection";
import { RecoveryAgentJobData } from "./recovery-agent.types";
import { logger } from "../config/logger";

export const RECOVERY_AGENT_QUEUE_NAME = "recovery-agent";

export const recoveryAgentQueue = new Queue<RecoveryAgentJobData>(
  RECOVERY_AGENT_QUEUE_NAME,
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

export async function enqueueRecoveryAgentRun(
  data: Omit<RecoveryAgentJobData, "enqueuedAt">,
) {
  const jobId = `agent-run-${data.recoveryCaseId}-${Date.now()}`;

  logger.info(
    {
      jobId,
      recoveryCaseId: data.recoveryCaseId,
      merchantId: data.merchantId,
    },
    "Enqueuing recovery agent run job",
  );

  return recoveryAgentQueue.add(
    data.jobType ?? "START_AGENT",
    {
      ...data,
      enqueuedAt: new Date(),
    },
    {
      jobId,
    },
  );
}

