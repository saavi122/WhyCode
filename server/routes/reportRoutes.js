import express from "express";
import {
  getReports,
  getReportById,
  triggerGenerateReport,
  handleApproveReport,
  handleEditAndApproveReport,
  handleRejectReport,
  handleRetryReport,
  handleExportReportMarkdown,
} from "../controllers/reportController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getReports);
router.post("/generate", triggerGenerateReport);
router.get("/:id", getReportById);
router.post("/:id/approve", handleApproveReport);
router.post("/:id/edit-and-approve", handleEditAndApproveReport);
router.post("/:id/reject", handleRejectReport);
router.post("/:id/retry", handleRetryReport);
router.get("/:id/export", handleExportReportMarkdown);

export default router;
