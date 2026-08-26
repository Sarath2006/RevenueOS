import {
  Request,
  Response,
  NextFunction,
} from "express";

import { z } from "zod";

import {
  razorpayService,
} from "./razorpay.service";

import {
  verifyPaymentSignature,
} from "./razorpay.signature";

const createOrderSchema =
  z.object({
    amount: z
      .number()
      .int()
      .positive(),

    currency: z
      .string()
      .length(3)
      .default("INR"),

    receipt: z
      .string()
      .min(1)
      .max(40),

    notes: z
      .record(z.string(), z.string())
      .optional(),
  });

export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input =
      createOrderSchema.parse(
        req.body
      );

    const order =
      await razorpayService.createOrder(
        input
      );

    res.status(201).json({
      success: true,

      data: {
        id: order.id,
        amount: order.amount,
        currency:
          order.currency,
        status: order.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

const orderParamsSchema =
  z.object({
    orderId: z.string().min(1),
  });

export async function fetchOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      orderId,
    } =
      orderParamsSchema.parse(
        req.params
      );

    const order =
      await razorpayService.fetchOrder(
        orderId
      );

    res.json({
      success: true,

      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function fetchPayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paymentId =
      z.string()
        .min(1)
        .parse(
          req.params.paymentId
        );

    const payment =
      await razorpayService.fetchPayment(
        paymentId
      );

    res.json({
      success: true,

      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

export async function fetchOrderPayments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId =
      z.string()
        .min(1)
        .parse(
          req.params.orderId
        );

    const payments =
      await razorpayService.fetchPaymentsForOrder(
        orderId
      );

    res.json({
      success: true,

      data: payments,
    });
  } catch (error) {
    next(error);
  }
}

const paymentLinkSchema =
  z.object({
    amount: z
      .number()
      .int()
      .positive(),

    currency: z
      .string()
      .length(3)
      .default("INR"),

    description:
      z.string()
       .min(1)
       .max(2048),

    reference_id:
      z.string()
       .min(1)
       .max(40),

    customer:
      z.object({
        name: z.string().optional(),

        email:
          z.string()
           .email()
           .optional(),

        contact:
          z.string()
           .optional(),
      })
      .optional(),

    notify:
      z.object({
        sms: z.boolean().optional(),
        email: z.boolean().optional(),
      })
      .optional(),

    reminder_enable:
      z.boolean()
       .optional(),

    notes:
      z.record(z.string(), z.string())
       .optional(),
  });

export async function createPaymentLink(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input =
      paymentLinkSchema.parse(
        req.body
      );

    const link =
      await razorpayService.createPaymentLink(
        input
      );

    res.status(201).json({
      success: true,

      data: {
        id: link.id,

        short_url:
          link.short_url,

        amount:
          link.amount,

        currency:
          link.currency,

        status:
          link.status,
      },
    });
  } catch (error) {
    next(error);
  }
}


export async function fetchPaymentLink(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paymentLinkId =
      z.string()
        .min(1)
        .parse(
          req.params.paymentLinkId
        );

    const link =
      await razorpayService.fetchPaymentLink(
        paymentLinkId
      );

    res.json({
      success: true,

      data: link,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelPaymentLink(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paymentLinkId =
      z.string()
        .min(1)
        .parse(
          req.params.paymentLinkId
        );

    const link =
      await razorpayService.cancelPaymentLink(
        paymentLinkId
      );

    res.json({
      success: true,

      data: link,
    });
  } catch (error) {
    next(error);
  }
}

const verifyPaymentSchema =
  z.object({
    orderId:
      z.string().min(1),

    paymentId:
      z.string().min(1),

    signature:
      z.string().min(1),
  });

export async function verifyPayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input =
      verifyPaymentSchema.parse(
        req.body
      );

    const valid =
      verifyPaymentSignature(
        input.orderId,
        input.paymentId,
        input.signature
      );

    if (!valid) {
      res.status(400).json({
        success: false,

        error: {
          code:
            "INVALID_PAYMENT_SIGNATURE",

          message:
            "Payment signature verification failed",
        },
      });

      return;
    }

    res.json({
      success: true,

      verified: true,

      message:
        "Payment signature verified",
    });
  } catch (error) {
    next(error);
  }
}