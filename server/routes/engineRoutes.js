import express from "express";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  getEngineStatus,
  updateEngineMode,
  testPrimary,
  testGemini,
  probePrimary,
} from "../controllers/engineController.js";

const router = express.Router();

router.use(protect);

// Status and probing accessible by company admins and system admins
router.get("/status", roleMiddleware("company", "admin", "company_admin"), getEngineStatus);
router.put("/mode", roleMiddleware("company", "admin", "company_admin"), updateEngineMode);
router.post("/test-primary", roleMiddleware("company", "admin", "company_admin"), testPrimary);
router.post("/test-gemini", roleMiddleware("company", "admin", "company_admin"), testGemini);
router.post("/probe-primary", roleMiddleware("company", "admin", "company_admin"), probePrimary);

export default router;
