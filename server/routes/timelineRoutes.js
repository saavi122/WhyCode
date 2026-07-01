import express from "express";
import { getFileTimeline, getRepoTimeline } from "../controllers/timelineController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:repoId", protect, getRepoTimeline);
router.get("/:repoId/*", protect, getFileTimeline);

export default router;
