import mongoose from "mongoose";
import ModelSwitchEvent from "../models/ModelSwitchEvent.js";
import Notification from "../models/Notification.js";
import { testPrimaryConnection, circuitBreaker } from "./vllmService.js";
import { servicesConfig } from "../config/services.js";
import { logInfo, logError } from "../utils/logger.js";

/**
 * Records a model fallback switch event for a company, deduplicated per incident.
 * If an active unrecovered incident exists for the company and target destination,
 * it increments the requestCount counter instead of creating a duplicate document.
 *
 * @param {Object} params
 * @param {string} params.companyId Target company ID.
 * @param {string} params.to Target destination: "gemini" or "evidence".
 * @param {string} params.reason Short failure reason / error code (no prompts or secrets).
 * @param {string} [params.mode="AUTO"] Active engine mode.
 * @returns {Promise<Object>} The active or created ModelSwitchEvent.
 */
async function safeDbOp(opFn, fallback = null, timeoutMs = 1000) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return fallback;
  }
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB_TIMEOUT")), timeoutMs);
  });
  try {
    const result = await Promise.race([opFn(), timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    return fallback;
  }
}

/**
 * Records a model fallback switch event for a company, deduplicated per incident.
 * If an active unrecovered incident exists for the company and target destination,
 * it increments the requestCount counter instead of creating a duplicate document.
 *
 * @param {Object} params
 * @param {string} params.companyId Target company ID.
 * @param {string} params.to Target destination: "gemini" or "evidence".
 * @param {string} params.reason Short failure reason / error code (no prompts or secrets).
 * @param {string} [params.mode="AUTO"] Active engine mode.
 * @returns {Promise<Object>} The active or created ModelSwitchEvent.
 */
export async function recordModelSwitch({ companyId, to, reason, mode = "AUTO" }) {
  const safeCompanyId = String(companyId || "default_tenant");
  const cleanReason = String(reason || "Primary model unreachable").slice(0, 200);

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return {
      companyId: safeCompanyId,
      time: new Date(),
      from: "primary",
      to,
      reason: cleanReason,
      mode,
      requestCount: 1,
    };
  }

  return safeDbOp(async () => {
    // Look for an existing open incident (recoveredAt is null)
    let activeEvent = await ModelSwitchEvent.findOne({
      companyId: safeCompanyId,
      recoveredAt: null,
      to,
    }).sort({ createdAt: -1 });

    if (activeEvent) {
      activeEvent.requestCount = (activeEvent.requestCount || 1) + 1;
      await activeEvent.save();

      logInfo("[MODEL_SWITCH] Incremented fallback incident counter", {
        eventId: activeEvent._id,
        companyId: safeCompanyId,
        to,
        requestCount: activeEvent.requestCount,
      });

      return activeEvent.toObject();
    }

    // Create new incident event
    const newEvent = await ModelSwitchEvent.create({
      companyId: safeCompanyId,
      time: new Date(),
      from: "primary",
      to,
      reason: cleanReason,
      mode,
      requestCount: 1,
      recoveredAt: null,
    });

    logInfo("[MODEL_SWITCH] New fallback incident recorded", {
      eventId: newEvent._id,
      companyId: safeCompanyId,
      to,
      reason: cleanReason,
      mode,
    });

    // Create in-app notification for Company Admins (created once per incident)
    try {
      const destinationLabel = to === "gemini" ? "Google Gemini fallback" : "Evidence-only mode";
      await Notification.create({
        companyId: safeCompanyId,
        title: `Primary RAG Model Offline`,
        message: `Your primary answer model is offline (${cleanReason}). System switched to ${destinationLabel}.`,
        type: "FALLBACK_ALERT",
      });
    } catch (notifErr) {
      logError("[MODEL_SWITCH] Failed to create in-app notification", { message: notifErr.message });
    }

    // Optional webhook / email alert hook if configured
    if (servicesConfig.sendAdminAlerts) {
      try {
        logInfo("[ALERT_HOOK] Triggered admin alert hook", { companyId: safeCompanyId, to, reason: cleanReason });
      } catch (_) {}
    }

    return newEvent.toObject();
  }, {
    companyId: safeCompanyId,
    time: new Date(),
    from: "primary",
    to,
    reason: cleanReason,
    mode,
    requestCount: 1,
  });
}

/**
 * Records recovery of the primary model for a company, closing any open incidents.
 *
 * @param {string} companyId Target company ID.
 * @returns {Promise<number>} Number of closed incidents.
 */
export async function recordRecovery(companyId) {
  const safeCompanyId = String(companyId || "default_tenant");

  return safeDbOp(async () => {
    const openEvents = await ModelSwitchEvent.find({
      companyId: safeCompanyId,
      recoveredAt: null,
    });

    if (!openEvents || openEvents.length === 0) {
      return 0;
    }

    const now = new Date();
    await ModelSwitchEvent.updateMany(
      { companyId: safeCompanyId, recoveredAt: null },
      { $set: { recoveredAt: now } }
    );

    logInfo("[MODEL_SWITCH] Primary model recovered - incidents closed", {
      companyId: safeCompanyId,
      closedCount: openEvents.length,
      recoveredAt: now,
    });

    // Create recovery in-app notification
    try {
      await Notification.create({
        companyId: safeCompanyId,
        title: "Primary RAG Model Recovered",
        message: "Your primary answer model is back online and responding normally.",
        type: "RECOVERY_ALERT",
      });
    } catch (_) {}

    return openEvents.length;
  }, 0);
}

/**
 * Gets the active fallback incident for a company if one is ongoing.
 *
 * @param {string} companyId Target company ID.
 * @returns {Promise<Object|null>}
 */
export async function getActiveIncident(companyId) {
  const safeCompanyId = String(companyId || "default_tenant");

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const active = await ModelSwitchEvent.findOne({
      companyId: safeCompanyId,
      recoveredAt: null,
    }).sort({ createdAt: -1 }).lean();

    return active || null;
  } catch (err) {
    return null;
  }
}

/**
 * Gets the last 10 switch events for a company with duration computed.
 *
 * @param {string} companyId Target company ID.
 * @param {number} [limit=10]
 * @returns {Promise<Array<Object>>}
 */
export async function getRecentSwitchEvents(companyId, limit = 10) {
  const safeCompanyId = String(companyId || "default_tenant");

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return [];
  }

  try {
    const events = await ModelSwitchEvent.find({ companyId: safeCompanyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return events.map((e) => {
      const startTime = e.time ? new Date(e.time).getTime() : new Date(e.createdAt).getTime();
      const endTime = e.recoveredAt ? new Date(e.recoveredAt).getTime() : Date.now();
      const durationMs = Math.max(0, endTime - startTime);

      let durationText;
      if (durationMs < 60000) {
        durationText = `${Math.round(durationMs / 1000)}s`;
      } else if (durationMs < 3600000) {
        durationText = `${Math.round(durationMs / 60000)}m`;
      } else {
        durationText = `${(durationMs / 3600000).toFixed(1)}h`;
      }

      return {
        ...e,
        durationMs,
        durationText: e.recoveredAt ? durationText : `${durationText} (ongoing)`,
        isOngoing: !e.recoveredAt,
      };
    });
  } catch (err) {
    logError("[MODEL_SWITCH] Failed to fetch switch events", { message: err.message });
    return [];
  }
}

/**
 * Probes the primary health and automatically recovers open incidents across companies.
 * @returns {Promise<{ online: boolean, latencyMs: number, model?: string, error?: string }>}
 */
export async function probePrimaryHealth() {
  const testRes = await testPrimaryConnection();

  if (testRes.success) {
    circuitBreaker.recordSuccess();

    // Close any open incidents in database
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const openEvents = await ModelSwitchEvent.find({ recoveredAt: null });
        if (openEvents.length > 0) {
          const distinctCompanyIds = [...new Set(openEvents.map((e) => e.companyId))];
          for (const cid of distinctCompanyIds) {
            await recordRecovery(cid);
          }
        }
      } catch (_) {}
    }
  }

  return testRes;
}
