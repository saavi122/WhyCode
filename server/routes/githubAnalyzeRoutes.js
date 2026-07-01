import express from "express";
import { analyzeCommit, analyzeRepo } from "../controllers/githubAnalyzeController.js";
import {
  getStatus,
  installApp,
  handleCallback,
  getCandidateRepositories,
  getTeams,
  getMembers,
  selectRepositories,
  triggerSync,
  getSyncStatus,
  handleWebhook
} from "../controllers/githubAppController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Public callback & webhook endpoints
router.get("/callback", handleCallback);
router.post("/webhook", handleWebhook);

// Protected app configuration endpoints
router.get("/status", protect, getStatus);
router.get("/install", protect, installApp);
router.get("/repositories", protect, getCandidateRepositories);
router.get("/teams", protect, getTeams);
router.get("/members", protect, getMembers);
router.post("/select-repositories", protect, selectRepositories);
router.post("/sync", protect, triggerSync);
router.get("/sync-status", protect, getSyncStatus);

// Core analytical endpoints (legacy/compatibility)
router.post("/analyze-commit", protect, analyzeCommit);
router.post("/analyze-repo", protect, analyzeRepo);

export default router;
