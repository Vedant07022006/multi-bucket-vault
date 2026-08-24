import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import apiRouter from "./routes/index.js";
import errorHandler from "./middlewares/error.middleware.js";
import config from "./config/env.config.js";

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: config.corsOrigin, credentials: true }));

// ─── Body parsers ─────────────────────────────────────────────────────────────
// Keep limit small — actual file bytes go directly to buckets via pre-signed URLs,
// so the API server only handles JSON metadata, not file payloads.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ─── NoSQL injection protection ──────────────────────────────────────────────
app.use(mongoSanitize());

// ─── Health check (no auth — used by load balancer / Docker health checks) ───
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "OK", timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── 404 for unmatched routes ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ─── Centralized error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

export default app;
