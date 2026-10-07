import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import { servicesConfig, validateProductionConfig } from "./config/services.js";
import { checkReadiness } from "./services/preflightService.js";
import { demoReadOnlyGuard } from "./middleware/demoGuard.js";

import authRoutes from "./routes/authRoutes.js";
import repoRoutes from "./routes/repoRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import driftRoutes from "./routes/driftRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import timelineRoutes from "./routes/timelineRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import githubAnalyzeRoutes from "./routes/githubAnalyzeRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import companyDashboardRoutes from "./routes/companyDashboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import employeeDashboardRoutes from "./routes/employeeDashboardRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import engineRoutes from "./routes/engineRoutes.js";
import { probePrimaryHealth } from "./services/modelSwitchTracker.js";
import errorHandler from "./middleware/errorHandler.js";
import seedAdmin from "./utils/seedAdmin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Enforce production localhost/private address validation
validateProductionConfig();

// Connect DB and then seed administrator
connectDB().then(() => {
  seedAdmin();
});

const app = express();

// Trust proxy header for accurate IP rate limiting behind load balancers/proxies
app.set("trust proxy", servicesConfig.trustProxy);

// CORS configuration with credentials and explicit origin
const allowedOrigins = [
  servicesConfig.clientOrigin,
  servicesConfig.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback for demo
    },
    credentials: true,
  })
);

// Raw body parser for webhook signature verification and standard JSON body
app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Rate limiters for public endpoints
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many chat requests from this IP, please wait a moment.",
    code: "RATE_LIMITED",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication requests, please try again later.",
    code: "AUTH_RATE_LIMITED",
  },
});

// Guardrails: Demo mode read-only guard
app.use(demoReadOnlyGuard);

// ── Health Check Endpoints ───────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.get("/api/health/ready", async (req, res) => {
  try {
    const report = await checkReadiness();
    const statusCode = report.ready ? 200 : 503;
    res.status(statusCode).json(report);
  } catch (err) {
    res.status(503).json({
      status: "error",
      ready: false,
      timestamp: new Date().toISOString(),
      error: "Failed to evaluate readiness",
    });
  }
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/chat", chatLimiter, chatRoutes);
app.use("/api/repositories", repoRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/drift", driftRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/github", githubAnalyzeRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/company", companyDashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employee", employeeDashboardRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/engine", engineRoutes);
app.use("/api/company/engine", engineRoutes);

// Lightweight primary health probe timer (runs every 30s in non-test mode)
if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    try {
      await probePrimaryHealth();
    } catch (_) {}
  }, 30000);
}

// Serve static assets
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// API 404 handler for any unmatched /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Catch-all to serve index.html for client-side routing
app.get("*", (req, res) => {
  const indexPath = path.resolve(clientDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send("Frontend build not found. Please ensure the build step 'npm run build' completed successfully on Render.");
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
