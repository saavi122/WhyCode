import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

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
import errorHandler from "./middleware/errorHandler.js";
import seedAdmin from "./utils/seedAdmin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Connect DB and then seed administrator
connectDB().then(() => {
  seedAdmin();
});

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "5mb" })); // larger limit for code/diff payloads

app.use("/api/auth", authRoutes);
app.use("/api/repositories", repoRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/drift", driftRoutes);
app.use("/api/chat", chatRoutes);
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

// Serve static assets
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// API 404 handler for any unmatched /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Catch-all to serve index.html for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.resolve(clientDistPath, "index.html"));
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
