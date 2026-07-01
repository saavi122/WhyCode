import express from "express";
import { getRepositories, registerRepository, getRepoRisk, deleteRepository, getGitHubRepos } from "../controllers/repoController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// IMPORTANT: specific routes BEFORE parameterized ones
router.get("/github-list", protect, getGitHubRepos);
router.get("/", protect, getRepositories);
router.post("/", protect, registerRepository);
router.get("/risk/:repoId", protect, getRepoRisk);
router.delete("/:repoId", protect, deleteRepository);

export default router;
