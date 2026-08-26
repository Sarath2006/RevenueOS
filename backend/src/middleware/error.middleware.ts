import {
  Request,
  Response,
  NextFunction,
} from "express";

import { logger } from "../config/logger";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(
    {
      error,
      method: req.method,
      path: req.path,
    },
    "Unhandled error"
  );

  res.status(error.statusCode || 500).json({
    success: false,

    error: {
      code:
        error.code ||
        "INTERNAL_SERVER_ERROR",

      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    },
  });
}