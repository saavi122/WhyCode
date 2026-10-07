import Company from "../models/Company.js";
import AuditLog from "../models/AuditLog.js";
import { servicesConfig } from "../config/services.js";
import { testPrimaryConnection } from "../services/vllmService.js";
import { testGeminiConnection, geminiDailyTracker, isGeminiAvailable } from "../services/geminiService.js";
import {
  getRecentSwitchEvents,
  getActiveIncident,
  probePrimaryHealth,
} from "../services/modelSwitchTracker.js";
import { logInfo, logError } from "../utils/logger.js";

/**
 * Gets the current engine status, primary/Gemini metrics, company mode, and switch history.
 */
export async function getEngineStatus(req, res) {
  const companyId = req.user?.company?._id || req.user?.company || req.user?.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "Company context required", code: "NO_COMPANY_CONTEXT" });
  }

  try {
    const company = await Company.findById(companyId).lean();
    const currentMode = company?.answerEngineMode || "AUTO";

    // Test primary status live
    const primaryTest = await testPrimaryConnection();

    // Get Gemini usage & status
    const geminiUsage = geminiDailyTracker.getUsage();
    const geminiConfigured = Boolean(servicesConfig.geminiApiKey || process.env.GEMINI_API_KEY);
    const geminiEnabled = servicesConfig.geminiEnabled;

    const recentEvents = await getRecentSwitchEvents(String(companyId), 10);
    const activeIncident = await getActiveIncident(String(companyId));

    res.json({
      success: true,
      mode: currentMode,
      primary: {
        online: primaryTest.success,
        model: servicesConfig.llmModel,
        latencyMs: primaryTest.latencyMs,
        lastCheckTime: new Date().toISOString(),
        error: primaryTest.error || null,
      },
      gemini: {
        configured: geminiConfigured,
        enabled: geminiEnabled,
        model: servicesConfig.geminiModel,
        requestsToday: geminiUsage.requestsToday,
        dailyLimit: geminiUsage.dailyLimit,
        remaining: geminiUsage.remaining,
        limitReached: geminiUsage.limitReached,
      },
      activeIncident,
      recentEvents,
    });
  } catch (err) {
    logError("[ENGINE_CONTROLLER] Failed to get engine status", { errorMessage: err.message, companyId });
    res.status(500).json({ message: "Failed to retrieve answer engine status", error: err.message });
  }
}

/**
 * Updates company answer engine mode (AUTO, PRIMARY_ONLY, GEMINI_ONLY) with audit logging.
 */
export async function updateEngineMode(req, res) {
  const { mode } = req.body;
  const companyId = req.user?.company?._id || req.user?.company || req.user?.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "Company context required", code: "NO_COMPANY_CONTEXT" });
  }

  const validModes = ["AUTO", "PRIMARY_ONLY", "GEMINI_ONLY"];
  if (!mode || !validModes.includes(String(mode).toUpperCase())) {
    return res.status(400).json({
      message: `Invalid engine mode. Must be one of: ${validModes.join(", ")}`,
      code: "INVALID_ENGINE_MODE",
    });
  }

  const targetMode = String(mode).toUpperCase();

  // If selecting GEMINI_ONLY, ensure Gemini is configured
  if (targetMode === "GEMINI_ONLY" && !Boolean(servicesConfig.geminiApiKey || process.env.GEMINI_API_KEY)) {
    return res.status(400).json({
      message: "Cannot select GEMINI_ONLY: GEMINI_API_KEY is not configured on this server.",
      code: "GEMINI_NOT_CONFIGURED",
    });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found", code: "COMPANY_NOT_FOUND" });
    }

    const previousMode = company.answerEngineMode || "AUTO";
    company.answerEngineMode = targetMode;
    await company.save();

    // Record audit log entry
    await AuditLog.create({
      companyId: String(companyId),
      userId: req.user._id || req.user.id,
      action: "CHANGE_ENGINE_MODE",
      details: {
        previousMode,
        newMode: targetMode,
        updatedBy: req.user.email || req.user.name || "admin",
      },
    });

    logInfo("[ENGINE_CONTROLLER] Company engine mode updated", {
      companyId,
      previousMode,
      newMode: targetMode,
      userId: req.user._id || req.user.id,
    });

    res.json({
      success: true,
      mode: targetMode,
      previousMode,
      message: `Answer engine mode updated to ${targetMode}`,
    });
  } catch (err) {
    logError("[ENGINE_CONTROLLER] Failed to update engine mode", { errorMessage: err.message, companyId });
    res.status(500).json({ message: "Failed to update answer engine mode", error: err.message });
  }
}

/**
 * Tests connectivity to the primary answer model with a harmless probe.
 */
export async function testPrimary(req, res) {
  try {
    const result = await testPrimaryConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Tests connectivity to Google Gemini fallback with a harmless probe.
 */
export async function testGemini(req, res) {
  try {
    const result = await testGeminiConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Manually triggers a primary model health probe and recovery check.
 */
export async function probePrimary(req, res) {
  try {
    const result = await probePrimaryHealth();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
