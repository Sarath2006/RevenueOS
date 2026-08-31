/**
 * ============================================================
 * M7.3 — ACTION EXECUTOR TYPES & ADAPTER INTERFACES
 * ============================================================
 *
 * Defines contracts for executing bounded recovery actions
 * across payment gateways, notification providers, and link services.
 * ============================================================
 */

import type { DecisionType, Channel } from "../../../generated/prisma/client";

export interface ExecuteActionInput {
  actionId: string;
  recoveryCaseId: string;
  decisionId: string;
  merchantId: string;
  customerId: string;
  type: DecisionType;
  channel?: Channel | null;
  amount: number;
  currency: string;
  paymentId?: string | null;
  subscriptionId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  strategyReason?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  actionType: string;
  channel?: string | null;
  providerReference?: string | null;
  recoveredAmount?: number | null;
  paymentStatus?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
  executedAt: Date;
}

export interface IPaymentActionAdapter {
  executeRetry(input: ExecuteActionInput): Promise<ActionResult>;
}

export interface INotificationActionAdapter {
  sendReminder(input: ExecuteActionInput): Promise<ActionResult>;
}

export interface IPaymentLinkActionAdapter {
  createPaymentLink(input: ExecuteActionInput): Promise<ActionResult>;
}

export interface INoActionAdapter {
  executeNoAction(input: ExecuteActionInput): Promise<ActionResult>;
}

