import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";

import healthRoutes from "./routes/health.routes";

import { notFoundHandler } from "./middleware/not-found.middleware";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

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

app.use(compression());

app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 200,
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", (_req, res) => {
  res.json({
    service: "RevenueOS",
    status: "online",
  });
});

app.use(
  "/api/health",
  healthRoutes
);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;