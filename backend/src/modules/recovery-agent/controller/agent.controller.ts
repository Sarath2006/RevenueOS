/**
 * ============================================================
 * M8.1 — RECOVERY AGENT CONTROLLER (HTTP HANDLERS)
 * ============================================================
 */

import { Request, Response } from "express";
import { recoveryAgentService } from "./agent.service";
import { agentRunRepository } from "./agent-run.repository";

export class RecoveryAgentController {
  public async startAgentRun(req: Request, res: Response): Promise<void> {
    try {
      const { merchantId, customerId, recoveryCaseId, maxIterations, initialDecisionId } = req.body;

      if (!merchantId || !recoveryCaseId) {
        res.status(400).json({ error: "merchantId and recoveryCaseId are required" });
        return;
      }

      const result = await recoveryAgentService.runAgent({
        merchantId,
        customerId: customerId ?? "",
        recoveryCaseId,
        maxIterations,
        initialDecisionId,
        source: "MANUAL",
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getAgentRun(req: Request, res: Response): Promise<void> {
    try {
      const agentRunId = String(req.params.agentRunId);
      const run = await agentRunRepository.findByAgentRunId(agentRunId);

      if (!run) {
        res.status(404).json({ error: "Agent run not found" });
        return;
      }

      res.status(200).json({ success: true, data: run });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getRunsForCase(req: Request, res: Response): Promise<void> {
    try {
      const recoveryCaseId = String(req.params.recoveryCaseId);
      const runs = await agentRunRepository.findByRecoveryCaseId(recoveryCaseId);
      res.status(200).json({ success: true, data: runs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const recoveryAgentController = new RecoveryAgentController();
