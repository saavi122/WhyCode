import crypto from "crypto";
import axios from "axios";
import mongoose from "mongoose";
import GitHubConnection from "../models/GitHubConnection.js";
import GitHubState from "../models/GitHubState.js";
import Company from "../models/Company.js";
import Repository from "../models/Repository.js";
import RepositorySync from "../models/RepositorySync.js";
import WebhookDelivery from "../models/WebhookDelivery.js";
import { enqueueSyncJob, enqueueWebhookJob } from "../services/syncQueue.js";
import { createAppJwt, getInstallationToken } from "../services/githubApp.js";
import { logError, logInfo } from "../utils/logger.js";

const getClientUrl = () => {
  return process.env.CLIENT_URL || "http://localhost:5173";
};

// 1. GET /api/github/connect (Company Admin only)
export const getConnectUrl = async (req, res, next) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required." });
    }

    const state = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await GitHubState.create({
      state,
      userId: req.user.id,
      companyId: req.user.company,
      expiresAt,
    });

    const slug = process.env.GITHUB_APP_SLUG || "whycode-dev";
    const installUrl = `https://github.com/apps/${slug}/installations/new?state=${state}`;

    res.json({ installUrl, state });
  } catch (err) {
    next(err);
  }
};

// 2. GET /api/github/callback (Dedicated backend callback endpoint)
export const handleCallback = async (req, res, next) => {
  const clientUrl = getClientUrl();
  try {
    const { code, installation_id, setup_action, state, error, error_description } = req.query;

    if (error === "access_denied") {
      return res.redirect(
        `${clientUrl}/github/callback-complete?error=access_denied&message=${encodeURIComponent(
          "GitHub authorization was cancelled."
        )}`
      );
    }

    if (!state) {
      return res.redirect(
        `${clientUrl}/github/callback-complete?error=missing_state&message=${encodeURIComponent(
          "State parameter is missing."
        )}`
      );
    }

    // Validate state from DB
    const stateRecord = await GitHubState.findOne({ state });
    if (!stateRecord || stateRecord.used || stateRecord.expiresAt < new Date()) {
      return res.redirect(
        `${clientUrl}/github/callback-complete?error=invalid_state&message=${encodeURIComponent(
          "Invalid or expired state parameter."
        )}`
      );
    }

    // Mark state as used and delete it
    stateRecord.used = true;
    await stateRecord.save();
    await GitHubState.deleteOne({ _id: stateRecord._id });

    if (!code) {
      return res.redirect(
        `${clientUrl}/github/callback-complete?error=missing_code&message=${encodeURIComponent(
          "Authorization code is missing."
        )}`
      );
    }

    // Exchange code for user token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const tokenData = tokenRes.data;
    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(
        `${clientUrl}/github/callback-complete?error=oauth_failed&message=${encodeURIComponent(
          tokenData.error_description || "Failed to exchange authorization code with GitHub."
        )}`
      );
    }

    const userAccessToken = tokenData.access_token;

    // Fetch user profile
    const userRes = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        "User-Agent": "WhyCode-App",
      },
    });

    const githubUser = userRes.data;

    // Validate installation_id against user's authorized installations
    if (installation_id) {
      const instRes = await axios.get("https://api.github.com/user/installations", {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "WhyCode-App",
        },
      });

      const userInstallations = instRes.data.installations || [];
      const isValidInstallation = userInstallations.some(
        (inst) => String(inst.id) === String(installation_id)
      );

      if (!isValidInstallation) {
        logError("Forged installation_id rejected", {
          installationId: installation_id,
          companyId: stateRecord.companyId,
        });
        return res.redirect(
          `${clientUrl}/github/callback-complete?error=forged_installation&message=${encodeURIComponent(
            "Installation ID not authorized for this account."
          )}`
        );
      }
    }

    // Upsert GitHubConnection record (Do NOT store user token)
    await GitHubConnection.findOneAndUpdate(
      { companyId: stateRecord.companyId },
      {
        companyId: stateRecord.companyId,
        githubAccountId: String(githubUser.id),
        githubUsername: githubUser.login,
        githubAccountType: githubUser.type || "User",
        installationId: String(installation_id || ""),
        status: "CONNECTED",
        connectedAt: new Date(),
        updatedAt: new Date(),
        lastValidatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update Company model github status
    await Company.findByIdAndUpdate(stateRecord.companyId, {
      github: {
        connected: true,
        installationId: String(installation_id || ""),
        organization: githubUser.login,
        connectedAt: new Date(),
        status: "CONNECTED",
      },
    });

    logInfo("GitHub App connected successfully", {
      companyId: stateRecord.companyId,
      githubUsername: githubUser.login,
    });

    res.redirect(`${clientUrl}/github/callback-complete`);
  } catch (err) {
    logError("GitHub callback error", { errorMessage: err.message });
    res.redirect(
      `${clientUrl}/github/callback-complete?error=server_error&message=${encodeURIComponent(
        "Server error handling GitHub callback."
      )}`
    );
  }
};

// 4. GET /api/github/status
export const getStatus = async (req, res, next) => {
  try {
    const connection = await GitHubConnection.findOne({ companyId: req.user.company });

    if (!connection || connection.status === "NOT_CONNECTED" || connection.status === "DISCONNECTED") {
      return res.json({
        status: connection?.status || "NOT_CONNECTED",
        githubUsername: connection?.githubUsername || null,
        connectedAt: connection?.connectedAt || null,
      });
    }

    if (connection.status === "CONNECTED" && connection.installationId) {
      try {
        const appJwt = createAppJwt();
        await axios.get(`https://api.github.com/app/installations/${connection.installationId}`, {
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "WhyCode-App",
          },
        });

        connection.lastValidatedAt = new Date();
        await connection.save();

        return res.json({
          status: "CONNECTED",
          githubUsername: connection.githubUsername,
          connectedAt: connection.connectedAt,
        });
      } catch (checkErr) {
        if (checkErr.response && (checkErr.response.status === 404 || checkErr.response.status === 403)) {
          connection.status = "EXPIRED";
          await connection.save();
          return res.json({
            status: "EXPIRED",
            githubUsername: connection.githubUsername,
            connectedAt: connection.connectedAt,
          });
        }

        return res.status(500).json({
          status: "ERROR",
          message: "GitHub could not be reached. Please try again.",
          githubUsername: connection.githubUsername,
        });
      }
    }

    res.json({
      status: connection.status,
      githubUsername: connection.githubUsername,
      connectedAt: connection.connectedAt,
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: "GitHub could not be reached. Please try again.",
    });
  }
};

// 5. POST /api/github/disconnect (Company Admin only)
export const disconnectApp = async (req, res, next) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required." });
    }

    const connection = await GitHubConnection.findOne({ companyId: req.user.company });
    if (connection) {
      connection.status = "DISCONNECTED";
      await connection.save();
    }

    await Company.findByIdAndUpdate(req.user.company, {
      "github.connected": false,
      "github.status": "DISCONNECTED",
    });

    res.json({
      status: "DISCONNECTED",
      message: "GitHub disconnected successfully.",
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/github/repositories?search=&page=&perPage= (Company Admin only)
export const getRepositories = async (req, res, next) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required." });
    }

    const connection = await GitHubConnection.findOne({ companyId: req.user.company });
    if (!connection || connection.status !== "CONNECTED" || !connection.installationId) {
      return res.status(400).json({
        message: "GitHub App integration is not connected to this workspace.",
        connected: false,
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 30;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : "";

    const token = await getInstallationToken(connection.installationId);
    const response = await axios.get(
      `https://api.github.com/installation/repositories?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "WhyCode-App",
        },
      }
    );

    let repos = response.data.repositories || [];

    if (search) {
      repos = repos.filter(
        (r) =>
          r.full_name?.toLowerCase().includes(search) ||
          r.name?.toLowerCase().includes(search) ||
          r.owner?.login?.toLowerCase().includes(search) ||
          (r.description || "").toLowerCase().includes(search)
      );
    }

    const connectedRepos = await Repository.find({
      companyId: req.user.company,
      status: { $ne: "REVOKED" },
    }).select("githubRepositoryId fullName");

    const connectedSet = new Set(
      connectedRepos.map((r) => Number(r.githubRepositoryId))
    );

    const formatted = repos.map((r) => ({
      id: r.id,
      owner: r.owner?.login || "",
      name: r.name,
      fullName: r.full_name,
      private: Boolean(r.private),
      description: r.description || "",
      defaultBranch: r.default_branch || "main",
      htmlUrl: r.html_url || `https://github.com/${r.full_name}`,
      alreadyConnected: connectedSet.has(Number(r.id)),
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

// GET /api/github/repositories/connected (Company scoped)
export const getConnectedRepositories = async (req, res, next) => {
  try {
    const connectedRepos = await Repository.find({ companyId: req.user.company });
    res.json(connectedRepos);
  } catch (err) {
    next(err);
  }
};

// POST /api/github/repositories/:githubRepositoryId/connect (Company Admin only)
export const connectRepositoryById = async (req, res, next) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required." });
    }

    const rawId = req.params.githubRepositoryId;
    const githubRepoId = Number(rawId);
    if (!rawId || isNaN(githubRepoId)) {
      return res.status(400).json({ message: "Invalid repository ID provided." });
    }

    const connection = await GitHubConnection.findOne({ companyId: req.user.company });
    if (!connection || connection.status !== "CONNECTED" || !connection.installationId) {
      return res.status(400).json({ message: "GitHub App integration is not connected to this workspace." });
    }

    const token = await getInstallationToken(connection.installationId);

    // Call GitHub API to verify repository is in the installation's accessible repositories (do NOT trust client)
    let repoData;
    try {
      const repoRes = await axios.get(`https://api.github.com/repositories/${githubRepoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "WhyCode-App",
        },
      });
      repoData = repoRes.data;

      // Demo safety: DEMO_REPO_ALLOWLIST check
      if (process.env.DEMO_REPO_ALLOWLIST) {
        const allowedList = process.env.DEMO_REPO_ALLOWLIST.split(",").map((r) => r.trim().toLowerCase());
        const targetRepoName = (repoData.full_name || "").toLowerCase();
        if (!allowedList.includes(targetRepoName)) {
          return res.status(403).json({
            message: `Demo mode: Only allowlisted repositories can be connected (${process.env.DEMO_REPO_ALLOWLIST}).`,
            code: "DEMO_REPO_NOT_ALLOWLISTED",
          });
        }
      }
    } catch (checkErr) {
      if (checkErr.response && (checkErr.response.status === 404 || checkErr.response.status === 403)) {
        // Check if access was revoked for an existing repository
        const existing = await Repository.findOne({
          companyId: req.user.company,
          githubRepositoryId: githubRepoId,
        });
        if (existing) {
          existing.status = "REVOKED";
          await existing.save();
        }
        return res.status(checkErr.response.status).json({
          message: "WhyCode no longer has access to this repository.",
        });
      }
      throw checkErr;
    }

    // Check if duplicate connect
    const existingRepo = await Repository.findOne({
      companyId: req.user.company,
      githubRepositoryId: githubRepoId,
    });

    if (existingRepo) {
      existingRepo.status = "active";
      await existingRepo.save();
      return res.status(200).json(existingRepo);
    }

    // Store repository using data taken from GitHub
    const newRepo = await Repository.create({
      companyId: req.user.company,
      company: req.user.company,
      githubConnectionId: connection._id,
      githubRepositoryId: githubRepoId,
      owner: repoData.owner?.login || "",
      name: repoData.name,
      fullName: repoData.full_name,
      htmlUrl: repoData.html_url || `https://github.com/${repoData.full_name}`,
      defaultBranch: repoData.default_branch || "main",
      private: Boolean(repoData.private),
      description: repoData.description || "",
      status: "active",
      syncStatus: "NOT_SYNCED",
      lastSyncedAt: null,
      lastCommitSha: null,
      language: repoData.language || "",
      repoName: repoData.name,
    });

    return res.status(201).json(newRepo);
  } catch (err) {
    next(err);
  }
};

// POST /api/github/repositories/:id/sync OR /api/github/repositories/:owner/:repo/sync (Company Admin only)
export const triggerRepositorySync = async (req, res, next) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Access denied. Company Admin privileges required." });
    }

    const { id, owner, repo: repoParam } = req.params;
    const repoIdentifier = id || (owner && repoParam ? `${owner}/${repoParam}` : null);
    const syncType = req.body?.syncType || "MANUAL";

    let repo = null;
    if (repoIdentifier) {
      if (mongoose.Types.ObjectId.isValid(repoIdentifier)) {
        repo = await Repository.findOne({ _id: repoIdentifier, companyId: req.user.company });
      }
      if (!repo) {
        const githubIdNum = Number(repoIdentifier);
        if (!isNaN(githubIdNum)) {
          repo = await Repository.findOne({ githubRepositoryId: githubIdNum, companyId: req.user.company });
        }
      }
      if (!repo) {
        repo = await Repository.findOne({
          $or: [{ fullName: repoIdentifier }, { repoName: repoIdentifier }],
          companyId: req.user.company,
        });
      }
    }

    if (!repo) {
      return res.status(404).json({ message: "Repository not found or access denied." });
    }

    const syncRecord = await RepositorySync.create({
      repositoryId: repo._id,
      companyId: req.user.company,
      syncType,
      status: "PENDING",
      step: "QUEUED",
      startedAt: new Date(),
    });

    enqueueSyncJob(syncRecord._id.toString());

    return res.status(202).json({
      message: "Sync job enqueued successfully.",
      syncId: syncRecord._id,
      status: syncRecord.status,
      step: syncRecord.step,
      sync: syncRecord,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/github/repositories/:id/sync-status OR /api/github/repositories/:owner/:repo/sync-status
export const getRepoSyncStatus = async (req, res, next) => {
  try {
    const { id, owner, repo: repoParam } = req.params;
    const repoIdentifier = id || (owner && repoParam ? `${owner}/${repoParam}` : null);

    let repo = null;
    if (repoIdentifier) {
      if (mongoose.Types.ObjectId.isValid(repoIdentifier)) {
        repo = await Repository.findOne({ _id: repoIdentifier, companyId: req.user.company });
      }
      if (!repo) {
        const githubIdNum = Number(repoIdentifier);
        if (!isNaN(githubIdNum)) {
          repo = await Repository.findOne({ githubRepositoryId: githubIdNum, companyId: req.user.company });
        }
      }
      if (!repo) {
        repo = await Repository.findOne({
          $or: [{ fullName: repoIdentifier }, { repoName: repoIdentifier }],
          companyId: req.user.company,
        });
      }
    }

    if (!repo) {
      return res.status(404).json({ message: "Repository not found." });
    }

    const syncRecord = await RepositorySync.findOne({
      repositoryId: repo._id,
      companyId: req.user.company,
    }).sort({ createdAt: -1 });

    if (!syncRecord) {
      return res.json({
        status: repo.syncStatus || "NOT_SYNCED",
        step: repo.syncStatus === "COMPLETED" ? "COMPLETED" : "NOT_SYNCED",
        counts: { files: 0, commits: 0, pullRequests: 0, chunks: 0, embedded: 0, upserted: 0 },
        lastCommitSha: repo.lastCommitSha || "",
        lastSyncedAt: repo.lastSyncedAt || null,
        error: null,
      });
    }

    return res.json({
      syncId: syncRecord._id,
      status: syncRecord.status,
      step: syncRecord.step,
      counts: syncRecord.counts,
      lastCommitSha: syncRecord.lastCommitSha || repo.lastCommitSha || "",
      lastSyncedAt: repo.lastSyncedAt || syncRecord.completedAt || null,
      startedAt: syncRecord.startedAt,
      completedAt: syncRecord.completedAt,
      error: syncRecord.error,
    });
  } catch (err) {
    next(err);
  }
};

// Backwards compatibility aliases
export const getCandidateRepositories = getRepositories;
export const selectRepositories = async (req, res, next) => {
  if (req.body?.selectedRepos && Array.isArray(req.body.selectedRepos)) {
    return getRepositories(req, res, next);
  }
  next();
};

export const installApp = getConnectUrl;
export const getTeams = async (req, res) => res.json([]);
export const getMembers = async (req, res) => res.json([]);
export const triggerSync = triggerRepositorySync;
export const getSyncStatus = getRepoSyncStatus;

/**
 * Validates HMAC SHA-256 webhook signature using constant-time comparison.
 * @param {Buffer|string} rawBody Raw request body buffer or string.
 * @param {string} signatureHeader X-Hub-Signature-256 header value.
 * @param {string} secret Configured webhook secret.
 * @returns {boolean} True if signature is valid.
 */
export function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  try {
    const hmac = crypto.createHmac("sha256", secret);
    const calculated = "sha256=" + hmac.update(rawBody || "").digest("hex");
    const calcBuf = Buffer.from(calculated, "utf-8");
    const sigBuf = Buffer.from(signatureHeader, "utf-8");
    if (calcBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(calcBuf, sigBuf);
  } catch (_) {
    return false;
  }
}

/**
 * POST /api/github/webhooks: Verifies signature, records idempotency, responds 202, enqueues sync.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // 1. Verify X-Hub-Signature-256
    const isValid = verifyWebhookSignature(req.rawBody, signature, secret);
    if (!isValid) {
      logError("[WEBHOOK] Invalid signature rejected", {
        hasSignature: Boolean(signature),
        hasSecret: Boolean(secret),
      });
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const deliveryId = req.headers["x-github-delivery"];
    const event = req.headers["x-github-event"] || req.body?.action || "unknown";
    const payload = req.body || {};

    // 2. Idempotency check via X-GitHub-Delivery (7-day TTL)
    if (deliveryId) {
      try {
        const existing = await WebhookDelivery.findOne({ deliveryId });
        if (existing) {
          logInfo("[WEBHOOK] Duplicate delivery skipped (idempotent)", { deliveryId, event });
          return res.status(202).json({ received: true, duplicate: true, deliveryId });
        }
        await WebhookDelivery.create({
          deliveryId,
          event,
          status: "RECEIVED",
        });
      } catch (deliveryErr) {
        if (deliveryErr.code === 11000) {
          return res.status(202).json({ received: true, duplicate: true, deliveryId });
        }
      }
    }

    // 3. Respond 202 Accepted immediately
    res.status(202).json({ received: true, event, deliveryId });

    // 4. Enqueue background processing
    enqueueWebhookJob({ deliveryId, event, payload });
  } catch (err) {
    next(err);
  }
};



