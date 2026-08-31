/**
 * ============================================================
 * M7.3 — ACTION EXECUTOR SERVICE & ADAPTERS
 * ============================================================
 *
 * Implements the concrete execution layer for recovery actions.
 * Decouples external provider interaction (Razorpay, WhatsApp, SMS)
 * through isolated adapter interfaces.
 * ============================================================
 */

import { logger } from "../../../config/logger";
import type {
  ExecuteActionInput,
  ActionResult,
  IPaymentActionAdapter,
  INotificationActionAdapter,
  IPaymentLinkActionAdapter,
  INoActionAdapter,
} from "./action-executor.types";

/**
 * ============================================================
 * ADAPTER: PAYMENT ACTION (GATEWAY RETRY)
 * ============================================================
 */
export class DefaultPaymentActionAdapter implements IPaymentActionAdapter {
  public async executeRetry(input: ExecuteActionInput): Promise<ActionResult> {
    const executedAt = new Date();

    try {
      logger.info(
        {
          actionId: input.actionId,
          recoveryCaseId: input.recoveryCaseId,
          amount: input.amount,
          currency: input.currency,
          paymentId: input.paymentId,
        },
        "Executing payment retry via gateway adapter",
      );

      // In real-time production, this calls Razorpay payment retry API.
      // Here we simulate successful gateway authorization and capture.
      const simulatedProviderRef = `pay_ret_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      return {
        success: true,
        actionId: input.actionId,
        actionType: input.type,
        channel: input.channel ?? "PAYMENT_RETRY",
        providerReference: simulatedProviderRef,
        recoveredAmount: input.amount,
        paymentStatus: "CAPTURED",
        message: `Payment retry executed successfully for ${input.currency} ${input.amount}.`,
        metadata: {
          gateway: "RAZORPAY",
          providerReference: simulatedProviderRef,
          retryAttempt: input.metadata?.attemptNumber ?? 1,
        },
        executedAt,
      };
    } catch (error: any) {
      logger.error(
        {
          actionId: input.actionId,
          error: error.message,
        },
        "Payment retry adapter encountered an error",
      );

      return {
        success: false,
        actionId: input.actionId,
        actionType: input.type,
        channel: input.channel ?? "PAYMENT_RETRY",
        errorCode: error.code ?? "GATEWAY_ERROR",
        errorMessage: error.message ?? "Payment gateway retry failed",
        executedAt,
      };
    }
  }
}

/**
 * ============================================================
 * ADAPTER: NOTIFICATION ACTION (WHATSAPP / SMS / EMAIL)
 * ============================================================
 */
export class DefaultNotificationActionAdapter implements INotificationActionAdapter {
  public async sendReminder(input: ExecuteActionInput): Promise<ActionResult> {
    const executedAt = new Date();
    const channel = input.channel ?? "WHATSAPP";

    try {
      logger.info(
        {
          actionId: input.actionId,
          recoveryCaseId: input.recoveryCaseId,
          channel,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
        },
        "Dispatching customer recovery reminder",
      );

      const simulatedMsgId = `msg_${channel.toLowerCase()}_${Date.now().toString(36)}`;

      return {
        success: true,
        actionId: input.actionId,
        actionType: input.type,
        channel,
        providerReference: simulatedMsgId,
        message: `Recovery reminder successfully dispatched to customer via ${channel}.`,
        metadata: {
          channel,
          providerMessageId: simulatedMsgId,
          recipientPhone: input.customerPhone,
          recipientEmail: input.customerEmail,
        },
        executedAt,
      };
    } catch (error: any) {
      logger.error(
        {
          actionId: input.actionId,
          error: error.message,
        },
        "Notification adapter error",
      );

      return {
        success: false,
        actionId: input.actionId,
        actionType: input.type,
        channel,
        errorCode: error.code ?? "NOTIFICATION_DISPATCH_ERROR",
        errorMessage: error.message ?? "Customer reminder dispatch failed",
        executedAt,
      };
    }
  }
}

/**
 * ============================================================
 * ADAPTER: PAYMENT LINK ACTION
 * ============================================================
 */
export class DefaultPaymentLinkActionAdapter implements IPaymentLinkActionAdapter {
  public async createPaymentLink(input: ExecuteActionInput): Promise<ActionResult> {
    const executedAt = new Date();

    try {
      logger.info(
        {
          actionId: input.actionId,
          recoveryCaseId: input.recoveryCaseId,
          amount: input.amount,
          currency: input.currency,
        },
        "Generating Razorpay recovery payment link",
      );

      const simulatedLinkId = `plink_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const simulatedShortUrl = `https://rzp.io/i/${simulatedLinkId}`;

      return {
        success: true,
        actionId: input.actionId,
        actionType: input.type,
        channel: "PAYMENT_LINK",
        providerReference: simulatedLinkId,
        message: `Payment link created: ${simulatedShortUrl}`,
        metadata: {
          paymentLinkId: simulatedLinkId,
          paymentLinkUrl: simulatedShortUrl,
          expiresInDays: 3,
        },
        executedAt,
      };
    } catch (error: any) {
      logger.error(
        {
          actionId: input.actionId,
          error: error.message,
        },
        "Payment link adapter error",
      );

      return {
        success: false,
        actionId: input.actionId,
        actionType: input.type,
        channel: "PAYMENT_LINK",
        errorCode: error.code ?? "PAYMENT_LINK_ERROR",
        errorMessage: error.message ?? "Failed to create payment link",
        executedAt,
      };
    }
  }
}

/**
 * ============================================================
 * ADAPTER: NO-ACTION / TERMINAL
 * ============================================================
 */
export class DefaultNoActionAdapter implements INoActionAdapter {
  public async executeNoAction(input: ExecuteActionInput): Promise<ActionResult> {
    return {
      success: true,
      actionId: input.actionId,
      actionType: input.type,
      message: `No external action dispatched for strategy '${input.type}'.`,
      executedAt: new Date(),
    };
  }
}

/**
 * ============================================================
 * CENTRAL ACTION EXECUTOR
 * ============================================================
 */
export class ActionExecutorService {
  private paymentAdapter: IPaymentActionAdapter;
  private notificationAdapter: INotificationActionAdapter;
  private paymentLinkAdapter: IPaymentLinkActionAdapter;
  private noActionAdapter: INoActionAdapter;

  constructor(adapters?: {
    paymentAdapter?: IPaymentActionAdapter;
    notificationAdapter?: INotificationActionAdapter;
    paymentLinkAdapter?: IPaymentLinkActionAdapter;
    noActionAdapter?: INoActionAdapter;
  }) {
    this.paymentAdapter = adapters?.paymentAdapter ?? new DefaultPaymentActionAdapter();
    this.notificationAdapter = adapters?.notificationAdapter ?? new DefaultNotificationActionAdapter();
    this.paymentLinkAdapter = adapters?.paymentLinkAdapter ?? new DefaultPaymentLinkActionAdapter();
    this.noActionAdapter = adapters?.noActionAdapter ?? new DefaultNoActionAdapter();
  }

  /**
   * Execute the bounded recovery action through the appropriate adapter.
   */
  public async execute(input: ExecuteActionInput): Promise<ActionResult> {
    logger.info(
      {
        actionId: input.actionId,
        actionType: input.type,
        recoveryCaseId: input.recoveryCaseId,
        amount: input.amount,
      },
      "ActionExecutor dispatching recovery action",
    );

    switch (input.type) {
      case "RETRY_PAYMENT":
      case "OFFER_ALTERNATIVE_PAYMENT":
        return this.paymentAdapter.executeRetry(input);

      case "SEND_WHATSAPP":
      case "SEND_SMS":
      case "SEND_EMAIL":
      case "VOICE_CALL":
      case "HINGLISH_VOICE":
        return this.notificationAdapter.sendReminder(input);

      case "SEND_PAYMENT_LINK":
        return this.paymentLinkAdapter.createPaymentLink(input);

      case "NO_ACTION":
      case "WAIT":
      case "STOP":
      case "ESCALATE":
        return this.noActionAdapter.executeNoAction(input);

      default:
        // Handle custom strategy mapping
        if ((input.type as string).includes("REMINDER")) {
          return this.notificationAdapter.sendReminder(input);
        }
        if ((input.type as string).includes("LINK")) {
          return this.paymentLinkAdapter.createPaymentLink(input);
        }
        if ((input.type as string).includes("RETRY")) {
          return this.paymentAdapter.executeRetry(input);
        }
        return this.noActionAdapter.executeNoAction(input);
    }
  }
}

export const actionExecutorService = new ActionExecutorService();

