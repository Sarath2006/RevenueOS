import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";

import healthRoutes from "./routes/health.routes";

import {
  notFoundHandler,
} from "./middleware/not-found.middleware";

import {
  errorHandler,
} from "./middleware/error.middleware";

import razorpayRoutes
  from "./modules/razorpay/razorpay.routes";

import razorpayWebhookRouter
  from "./modules/webhooks/razorpay/razorpay-webhook.routes";


const app = express();


/*
 * =====================================================
 * SECURITY
 * =====================================================
 */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);


app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);


/*
 * =====================================================
 * GENERAL MIDDLEWARE
 * =====================================================
 */

app.use(compression());

app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 200,
  })
);


/*
 * =====================================================
 * RAZORPAY WEBHOOK
 *
 * IMPORTANT:
 * MUST COME BEFORE express.json()
 * =====================================================
 */

app.use(
  "/api/webhooks",
  express.raw({
    type: "application/json",
    limit: "2mb",
  }),
  razorpayWebhookRouter
);


/*
 * =====================================================
 * NORMAL JSON APIs
 * =====================================================
 */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);


/*
 * =====================================================
 * ROOT
 * =====================================================
 */

app.get("/", (_req, res) => {
  res.json({
    service: "RevenueOS",
    status: "online",
  });
});


/*
 * =====================================================
 * HEALTH
 * =====================================================
 */

app.use(
  "/api/health",
  healthRoutes
);


/*
 * =====================================================
 * RAZORPAY
 * =====================================================
 */

app.use(
  "/api/razorpay",
  razorpayRoutes
);


/*
 * =====================================================
 * 404
 * =====================================================
 */

app.use(notFoundHandler);


/*
 * =====================================================
 * ERROR HANDLER
 * =====================================================
 */

app.use(errorHandler);


export default app;