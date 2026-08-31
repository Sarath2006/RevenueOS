/**
 * ============================================================
 * RECOVERY ACTION WORKER
 * ============================================================
 *
 * Background worker processing recovery action jobs asynchronously
 * through the central Recovery Orchestrator (M7.1).
 * ============================================================
 */

import { Worker, Job } from "bullmq";
import { createQueueConnection } from "../queues/connection";
import { RECOVERY_ACTION_QUEUE_NAME } from "../queues/recovery-action.queue";
import { RecoveryActionJobData, RecoveryActionJobResult } from "../queues/recovery-action.types";
import { recoveryOrchestratorService } from "../modules/recovery/orchestration/orchestrator.service";
import { logger } from "../config/logger";

export async function processRecoveryActionJob(
  job: Job<RecoveryActionJobData>,
): Promise<RecoveryActionJobResult> {
  const { decisionId, decision, recoveryCaseId, merchantId, customerId, metadata } = job.data;

  logger.info(
    {
      jobId: job.id,
      recoveryCaseId,
      decisionId: decisionId ?? decision?.decisionId,
    },
    "Recovery action worker started processing job",
  );

  const outcome = await recoveryOrchestratorService.orchestrate({
    decisionId,
    decision,
    recoveryCaseId,
    merchantId,
    customerId,
    metadata: {
      ...metadata,
      jobId: job.id,
    },
  });

  logger.info(
    {
      jobId: job.id,
      status: outcome.status,
      actionId: outcome.actionId,
      actionType: outcome.actionType,
    },
    "Recovery action worker completed processing job",
  );

  return outcome;
}

export const recoveryActionWorker = new Worker<RecoveryActionJobData, RecoveryActionJobResult>(
  RECOVERY_ACTION_QUEUE_NAME,
  processRecoveryActionJob,
  {
    connection: createQueueConnection(),
    concurrency: 5,
    lockDuration: 30000,
    stalledInterval: 30000,
  },
);

recoveryActionWorker.on("ready", () => {
  logger.info("Recovery action worker ready");
});

recoveryActionWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Recovery action job completed successfully");
});

recoveryActionWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, "Recovery action job failed");
});

