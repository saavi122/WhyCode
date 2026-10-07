import express from "express";
import { askQuestion } from "../controllers/chatController.js";
import protect from "../middleware/authMiddleware.js";
import { chatRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/:repoId", protect, chatRateLimiter, askQuestion);

export default router;
