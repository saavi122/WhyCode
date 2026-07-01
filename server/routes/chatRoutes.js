import express from "express";
import { askQuestion } from "../controllers/chatController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:repoId", protect, askQuestion);

export default router;
