import express from "express";
import { getDrifts, updateDriftStatus } from "../controllers/driftController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:repoId", protect, getDrifts);
router.patch("/:driftId", protect, updateDriftStatus);

export default router;
