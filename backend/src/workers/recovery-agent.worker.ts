/**
 * ============================================================
 * RECOVERY AGENT WORKER
 * ============================================================
 *
 * Background worker processing autonomous recovery agent loop jobs.
 * ============================================================
 */

import { Worker, Job } from "bullmq";
import { createQueueConnection } from "../queues/connection";
import { RECOVERY_AGENT_QUEUE_NAME } from "../queues/recovery-agent.queue";
import { RecoveryAgentJobData, RecoveryAgentJobResult } from "../queues/recovery-agent.types";
import { recoveryAgentService } from "../modules/recovery-agent/controller/agent.service";
import { logger } from "../config/logger";

export async function processRecoveryAgentJob(
  job: Job<RecoveryAgentJobData>,
): Promise<RecoveryAgentJobResult> {
  const { merchantId, customerId, recoveryCaseId, maxIterations, initialDecisionId, metadata } = job.data;

  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,
      merchantId,
    },
    "Recovery agent worker started processing job",
  );

  const result = await recoveryAgentService.runAgent({
    merchantId,
    customerId,
    recoveryCaseId,
    maxIterations,
    initialDecisionId,
    source: "SYSTEM",
    metadata: {
      ...metadata,
      jobId: job.id,
    },
  });

  logger.info(
    {
      jobId: job.id,
      status: result.status,
      finalState: result.finalState,
      totalIterations: result.totalIterations,
    },
    "Recovery agent worker completed job",
  );

  return result;
}

export const recoveryAgentWorker = new Worker<RecoveryAgentJobData, RecoveryAgentJobResult>(
  RECOVERY_AGENT_QUEUE_NAME,
  processRecoveryAgentJob,
  {
    connection: createQueueConnection(),
    concurrency: 5,
    lockDuration: 60000,
    stalledInterval: 60000,
  },
);

recoveryAgentWorker.on("ready", () => {
  logger.info("Recovery agent worker ready");
});

recoveryAgentWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Recovery agent job completed successfully");
});

recoveryAgentWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, "Recovery agent job failed");
});

