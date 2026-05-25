import "dotenv/config";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import { randomUUID } from "crypto";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import http from "http";
import mongoose from "mongoose";
import morgan from "morgan";
import { verifyEmailTransport } from "./services/email.service.js";
import { initSocketIO } from "./sockets/index.js";
import { sanitizeRequestPayload } from "./utils/sanitize.js";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const API = "/api/v1";
const MONGO = process.env.MONGODB_URI || "mongodb://localhost:27017/hupfumi";
const CLIENT_ORIGINS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const BODY_LIMIT = process.env.BODY_LIMIT || "2mb";

const captureRawBody = (req, _res, buffer, encoding) => {
  if (!buffer?.length) return;
  req.rawBody = buffer.toString(encoding || "utf8");
};

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || CLIENT_ORIGINS.includes(origin)) {
      return cb(null, true);
    }

    return cb(new Error("CORS origin denied"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 60 * 60 * 24,
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});

// ── Middleware ─────────────────────────────────────────────────
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "no-referrer" },
  }),
);
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: BODY_LIMIT, verify: captureRawBody }));
app.use(
  express.urlencoded({
    extended: true,
    limit: BODY_LIMIT,
    verify: captureRawBody,
  }),
);
app.use(cookieParser());
app.use((req, res, next) => {
  const incomingId = req.get("x-request-id");
  const requestId =
    typeof incomingId === "string" && incomingId.trim().length > 0
      ? incomingId.trim().slice(0, 100)
      : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
app.use((req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  // Apply CSRF origin checks only for cookie-authenticated requests.
  if (!req.cookies?.refreshToken) return next();

  const origin = req.get("origin") || "";
  const referer = req.get("referer") || "";
  const trustedByOrigin = origin && CLIENT_ORIGINS.includes(origin);
  const trustedByReferer =
    !origin &&
    referer &&
    CLIENT_ORIGINS.some((trustedOrigin) => referer.startsWith(trustedOrigin));

  if (trustedByOrigin || trustedByReferer) return next();

  return res.status(403).json({
    success: false,
    message: "CSRF validation failed",
  });
});

app.use(mongoSanitize());
app.use(hpp());
app.use(sanitizeRequestPayload);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(globalLimiter);
app.use(`${API}/auth`, authLimiter);
app.use((req, _res, next) => {
  const page = Number(req.query?.page);
  const limit = Number(req.query?.limit);

  if (Number.isFinite(page)) {
    req.query.page = String(Math.max(1, Math.floor(page)));
  }

  if (Number.isFinite(limit)) {
    req.query.limit = String(Math.min(100, Math.max(1, Math.floor(limit))));
  }

  next();
});

// ── Health check ───────────────────────────────────────────────
app.get("/health", (_, res) =>
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  }),
);

// ── Routes (dynamic import to avoid startup errors) ────────────
async function loadRoutes() {
  try {
    const { default: authR } = await import("./routes/auth.routes.js");
    const { default: userR } = await import("./routes/user.routes.js");
    const { default: jobR } = await import("./routes/job.routes.js");
    const { default: svcR } = await import("./routes/service.routes.js");
    const { default: prodR } = await import("./routes/product.routes.js");
    const { default: orderR } = await import("./routes/order.routes.js");
    const { default: walletR } = await import("./routes/wallet.routes.js");
    const { default: msgR } = await import("./routes/message.routes.js");
    const { default: notifR } = await import("./routes/notification.routes.js");
    const { default: reviewR } = await import("./routes/review.routes.js");
    const { default: searchR } = await import("./routes/search.routes.js");
    const { default: adminR } = await import("./routes/admin.routes.js");
    const { default: payR } = await import("./routes/payment.routes.js");
    const { default: savedR } = await import("./routes/saved.routes.js");
    const { default: couponR } = await import("./routes/coupon.routes.js");
    const { default: analyR } = await import("./routes/analytics.routes.js");
    const { default: uploadR } = await import("./routes/upload.routes.js");

    app.use(`${API}/auth`, authR);
    app.use(`${API}/users`, userR);
    app.use(`${API}/jobs`, jobR);
    app.use(`${API}/services`, svcR);
    app.use(`${API}/products`, prodR);
    app.use(`${API}/orders`, orderR);
    app.use(`${API}/wallet`, walletR);
    app.use(`${API}/messages`, msgR);
    app.use(`${API}/notifications`, notifR);
    app.use(`${API}/reviews`, reviewR);
    app.use(`${API}/search`, searchR);
    app.use(`${API}/admin`, adminR);
    app.use(`${API}/payments`, payR);
    app.use(`${API}/saved`, savedR);
    app.use(`${API}/coupons`, couponR);
    app.use(`${API}/analytics`, analyR);
    app.use(`${API}/uploads`, uploadR);

    console.log("Routes loaded");
  } catch (err) {
    console.error("Route load error:", err.message);
  }

  // 404
  app.use((_, res) =>
    res.status(404).json({ success: false, message: "Route not found" }),
  );

  // Error handler
  app.use((err, req, res, _next) => {
    const status = err.statusCode || err.status || 500;
    const msg =
      status >= 500 ? "Internal server error" : err.message || "Request failed";
    const requestId = req.requestId || "unknown-request";
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${requestId}]`, err);
    }

    const payload = { success: false, message: msg };
    payload.requestId = requestId;
    if (status >= 500 && process.env.NODE_ENV !== "production") {
      payload.details = err.message;
    }

    res.status(status).json(payload);
  });
}

// ── Boot ───────────────────────────────────────────────────────
async function boot() {
  try {
    await mongoose.connect(MONGO, { maxPoolSize: 10 });
    console.log("MongoDB connected");
    await verifyEmailTransport().catch((error) => {
      console.warn("Email transport verification skipped:", error.message);
    });
    await loadRoutes();
    global._io = initSocketIO(server);
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Boot error:", err.message);
    process.exit(1);
  }
}

boot();

process.on("SIGTERM", () => {
  server.close(() => {
    mongoose.disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    mongoose.disconnect();
    process.exit(0);
  });
});
export { app, server };
