import mongoose from "mongoose";
import Report from "../models/Report.js";
import Repository from "../models/Repository.js";
import {
  generateDriftReport,
  generateIntentReport,
  generateChangeSummaryReport,
  approveReport,
  editAndApproveReport,
  rejectReport,
  exportReportMarkdown,
} from "../services/reportService.js";
import { logInfo, logError } from "../utils/logger.js";

/**
 * GET /api/reports
 * Lists reports for the authenticated company with optional filters.
 */
export const getReports = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const { reportType, status, severity, repositoryId, search } = req.query;

    const filter = { companyId };

    if (reportType && reportType !== "ALL") {
      filter.reportType = reportType;
    }
    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (severity && severity !== "ALL") {
      filter.severity = severity;
    }
    if (repositoryId && mongoose.Types.ObjectId.isValid(repositoryId)) {
      filter.repositoryId = repositoryId;
    }
    if (search) {
      filter.$or = [
        { targetPath: { $regex: search, $options: "i" } },
        { "output.title": { $regex: search, $options: "i" } },
        { "output.summary": { $regex: search, $options: "i" } },
      ];
    }

    const reports = await Report.find(filter)
      .populate("repositoryId", "fullName name defaultBranch")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(reports);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/:id
 * Fetches single report details with tenant protection.
 */
export const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID format." });
    }

    const report = await Report.findOne({ _id: id, companyId }).populate(
      "repositoryId",
      "fullName name defaultBranch htmlUrl"
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found or access denied." });
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/generate
 * Manually generates a new documentation, intent, or change summary report.
 */
export const triggerGenerateReport = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const { repositoryId, reportType = "DRIFT", targetPath = "README.md", targetSymbol } = req.body;

    if (!repositoryId) {
      return res.status(400).json({ message: "repositoryId is required." });
    }

    const repo = await Repository.findOne({ _id: repositoryId, companyId });
    if (!repo) {
      return res.status(404).json({ message: "Repository not found or unauthorized for this workspace." });
    }

    const authContext = { companyId, user: req.user };

    let report;
    if (reportType === "DRIFT") {
      report = await generateDriftReport({
        authContext,
        repositoryId: repo._id.toString(),
        targetPath,
        triggerType: "MANUAL",
      });
    } else if (reportType === "INTENT") {
      report = await generateIntentReport({
        authContext,
        repositoryId: repo._id.toString(),
        targetPath,
        targetSymbol,
        triggerType: "MANUAL",
      });
    } else if (reportType === "CHANGE_SUMMARY") {
      report = await generateChangeSummaryReport({
        authContext,
        repositoryId: repo._id.toString(),
        targetPath,
        triggerType: "MANUAL",
      });
    } else {
      return res.status(400).json({ message: `Unsupported report type: ${reportType}` });
    }

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/:id/approve
 * Approves a report and publishes it (Company Admin / Lead only).
 */
export const handleApproveReport = async (req, res, next) => {
  try {
    if (req.user.role !== "company" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required to publish reports." });
    }

    const { id } = req.params;
    const companyId = req.user.company;

    const report = await approveReport({
      reportId: id,
      companyId,
      user: req.user,
    });

    res.json({ message: "Report approved and published successfully.", report });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/:id/edit-and-approve
 * Custom edits a report before publishing without overwriting original AI draft.
 */
export const handleEditAndApproveReport = async (req, res, next) => {
  try {
    if (req.user.role !== "company" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required to edit and publish reports." });
    }

    const { id } = req.params;
    const companyId = req.user.company;
    const editedData = req.body || {};

    const report = await editAndApproveReport({
      reportId: id,
      companyId,
      user: req.user,
      editedData,
    });

    res.json({ message: "Report edited and published successfully.", report });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/:id/reject
 * Rejects a report with mandatory reason.
 */
export const handleRejectReport = async (req, res, next) => {
  try {
    if (req.user.role !== "company" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required to reject reports." });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const companyId = req.user.company;

    const report = await rejectReport({
      reportId: id,
      companyId,
      user: req.user,
      reason,
    });

    res.json({ message: "Report rejected.", report });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/:id/retry
 * Retries a failed report generation.
 */
export const handleRetryReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;

    const report = await Report.findOne({ _id: id, companyId });
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    const authContext = { companyId, user: req.user };
    let newReport;

    if (report.reportType === "DRIFT") {
      newReport = await generateDriftReport({
        authContext,
        repositoryId: report.repositoryId.toString(),
        targetPath: report.targetPath,
        triggerType: "MANUAL",
      });
    } else if (report.reportType === "INTENT") {
      newReport = await generateIntentReport({
        authContext,
        repositoryId: report.repositoryId.toString(),
        targetPath: report.targetPath,
        targetSymbol: report.targetSymbol,
        triggerType: "MANUAL",
      });
    } else {
      newReport = await generateChangeSummaryReport({
        authContext,
        repositoryId: report.repositoryId.toString(),
        targetPath: report.targetPath,
        triggerType: "MANUAL",
      });
    }

    res.json(newReport);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/:id/export
 * Exports the report formatted in GitHub Markdown.
 */
export const handleExportReportMarkdown = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;

    const report = await Report.findOne({ _id: id, companyId }).populate("repositoryId", "fullName name");
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    const markdown = exportReportMarkdown(report);
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="report-${report._id}.md"`);
    res.send(markdown);
  } catch (err) {
    next(err);
  }
};
