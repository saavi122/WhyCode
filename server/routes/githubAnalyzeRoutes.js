import express from "express";
import { analyzeCommit, analyzeRepo } from "../controllers/githubAnalyzeController.js";
import {
  getStatus,
  getConnectUrl,
  handleCallback,
  getRepositories,
  getConnectedRepositories,
  connectRepositoryById,
  getCandidateRepositories,
  getTeams,
  getMembers,
  selectRepositories,
  disconnectApp,
  triggerSync,
  getSyncStatus,
  handleWebhook,
} from "../controllers/githubAppController.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { syncRateLimiter, webhookRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Public callback & webhook endpoints (rate-limited)
router.get("/callback", handleCallback);
router.post("/webhook", webhookRateLimiter, handleWebhook);
router.post("/webhooks", webhookRateLimiter, handleWebhook);

// Protected app configuration & repository management endpoints
router.get("/connect", protect, roleMiddleware("company"), getConnectUrl);
router.get("/install", protect, roleMiddleware("company"), getConnectUrl); // alias for backwards compatibility
router.get("/status", protect, getStatus);
router.get("/repositories/connected", protect, getConnectedRepositories);
router.get("/repositories", protect, roleMiddleware("company"), getRepositories);
router.post("/repositories/:githubRepositoryId/connect", protect, roleMiddleware("company"), connectRepositoryById);

router.post("/repositories/:owner/:repo/sync", protect, roleMiddleware("company"), syncRateLimiter, triggerSync);
router.get("/repositories/:owner/:repo/sync-status", protect, getSyncStatus);
router.post("/repositories/:id/sync", protect, roleMiddleware("company"), syncRateLimiter, triggerSync);
router.get("/repositories/:id/sync-status", protect, getSyncStatus);

router.get("/teams", protect, getTeams);
router.get("/members", protect, getMembers);
router.post("/select-repositories", protect, selectRepositories);
router.post("/disconnect", protect, roleMiddleware("company"), disconnectApp);
router.post("/sync", protect, syncRateLimiter, triggerSync);
router.get("/sync-status", protect, getSyncStatus);

// Core analytical endpoints
router.post("/analyze-commit", protect, analyzeCommit);
router.post("/analyze-repo", protect, analyzeRepo);

export default router;

