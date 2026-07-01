import express from "express";
import { scanRepository, getScanStatus } from "../controllers/scanController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:repoId", protect, scanRepository);
router.get("/:repoId/status", protect, getScanStatus);

export default router;
