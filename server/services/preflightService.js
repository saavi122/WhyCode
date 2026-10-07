import axios from "axios";
import mongoose from "mongoose";
import net from "net";
import { servicesConfig } from "../config/services.js";
import { isRedisReady } from "../config/redis.js";
import { logInfo, logError } from "../utils/logger.js";
import { getInstallationToken } from "./githubApp.js";
import GitHubConnection from "../models/GitHubConnection.js";

const TIMEOUT_MS = 4000;

export class PreflightError extends Error {
  constructor(service, url, causeCode, details) {
    const msg = `${service} service unreachable (${url}) - ${causeCode || details || "Connection failed"}`;
    super(msg);
    this.name = "PreflightError";
    this.service = service;
    this.url = url;
    this.causeCode = causeCode;
    this.details = details;
  }
}

/**
 * Sanitizes URLs to remove basic auth, tokens, and credentials.
 * @param {string} rawUrl Raw URL.
 * @returns {string} Sanitized URL without secrets.
 */
function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl);
    parsed.password = "";
    parsed.username = "";
    return parsed.toString();
  } catch (_) {
    return rawUrl.replace(/:\/\/[^@]+@/, "://");
  }
}

/**
 * Sanitizes error messages to prevent leaking connection strings, tokens, or internal credentials.
 * @param {Error|any} err Caught error.
 * @returns {string} Safe error reason description.
 */
function sanitizeErrorMessage(err) {
  if (!err) return "Unknown dependency error";
  const code = err.code || err.cause?.code || (err.response ? `HTTP ${err.response.status}` : "CONN_FAILED");
  const base = err.message || String(err);
  // Redact any auth strings, passwords, or tokens
  const clean = base
    .replace(/mongodb(\+srv)?:\/\/[^ \n\r\t]+/gi, "mongodb://[REDACTED]")
    .replace(/Bearer [A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/api[-_]?key=[^ \n\r\t&]+/gi, "api-key=[REDACTED]");
  return `${code}: ${clean.slice(0, 100)}`;
}

/**
 * Runs readiness check across all critical system dependencies:
 * - Mongo Database
 * - Redis Cache & Queue
 * - Qdrant Vector DB
 * - HuggingFace TEI Embeddings
 * - HuggingFace TEI Reranker
 * - LLM Inference Service (vLLM / Ollama / Cloud)
 *
 * @returns {Promise<Object>} Dependency health summary with no exposed secrets.
 */
export async function checkReadiness() {
  const dependencies = {
    mongo: { status: "unknown" },
    redis: { status: "unknown" },
    qdrant: { status: "unknown" },
    teiEmbed: { status: "unknown" },
    teiRerank: { status: "unknown" },
    llm: { status: "unknown" },
  };

  // 1. Check MongoDB
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      dependencies.mongo = { status: "ok" };
    } else {
      dependencies.mongo = { status: "error", reason: `Mongoose connection state: ${state}` };
    }
  } catch (err) {
    dependencies.mongo = { status: "error", reason: sanitizeErrorMessage(err) };
  }

  // 2. Check Redis
  try {
    const redisOk = await isRedisReady();
    if (redisOk) {
      dependencies.redis = { status: "ok" };
    } else if (servicesConfig.redisUrl || servicesConfig.redisHost) {
      // Direct TCP probe fallback
      const host = servicesConfig.redisHost || "127.0.0.1";
      const port = servicesConfig.redisPort || 6379;
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port, timeout: TIMEOUT_MS }, () => {
          socket.end();
          resolve(true);
        });
        socket.on("error", reject);
        socket.on("timeout", () => {
          socket.destroy();
          reject(new Error("Timeout"));
        });
      });
      dependencies.redis = { status: "ok" };
    } else {
      dependencies.redis = { status: "ok", mode: "in-memory-fallback" };
    }
  } catch (err) {
    dependencies.redis = { status: "degraded", reason: sanitizeErrorMessage(err) };
  }

  // 3. Check Qdrant Vector Store
  try {
    const qUrl = servicesConfig.qdrantUrl;
    const headers = {};
    if (servicesConfig.qdrantApiKey) {
      headers["api-key"] = servicesConfig.qdrantApiKey;
    }
    await axios.get(`${qUrl}/readyz`, { headers, timeout: TIMEOUT_MS }).catch(async () => {
      await axios.get(`${qUrl}/collections`, { headers, timeout: TIMEOUT_MS });
    });
    dependencies.qdrant = { status: "ok" };
  } catch (err) {
    dependencies.qdrant = { status: "error", reason: sanitizeErrorMessage(err) };
  }

  // 4. Check TEI Embeddings
  try {
    const teiUrl = servicesConfig.teiEmbeddingsUrl;
    const headers = {};
    if (servicesConfig.internalServiceToken) {
      headers["Authorization"] = `Bearer ${servicesConfig.internalServiceToken}`;
    }
    const res = await axios.post(
      `${teiUrl}/embed`,
      { inputs: "health check" },
      { headers, timeout: TIMEOUT_MS }
    );
    if (Array.isArray(res.data)) {
      dependencies.teiEmbed = { status: "ok" };
    } else {
      dependencies.teiEmbed = { status: "error", reason: "Invalid response format" };
    }
  } catch (err) {
    dependencies.teiEmbed = { status: "error", reason: sanitizeErrorMessage(err) };
  }

  // 5. Check TEI Reranker
  try {
    const rerankUrl = servicesConfig.teiRerankUrl;
    const headers = {};
    if (servicesConfig.internalServiceToken) {
      headers["Authorization"] = `Bearer ${servicesConfig.internalServiceToken}`;
    }
    const res = await axios.post(
      `${rerankUrl}/rerank`,
      { query: "health", texts: ["check"] },
      { headers, timeout: TIMEOUT_MS }
    );
    if (Array.isArray(res.data)) {
      dependencies.teiRerank = { status: "ok" };
    } else {
      dependencies.teiRerank = { status: "error", reason: "Invalid response format" };
    }
  } catch (err) {
    dependencies.teiRerank = { status: "error", reason: sanitizeErrorMessage(err) };
  }

  // 6. Check LLM Service
  try {
    const llmUrl = servicesConfig.llmBaseUrl.replace(/\/+$/, "");
    const headers = {};
    if (servicesConfig.llmApiKey || servicesConfig.internalServiceToken) {
      headers["Authorization"] = `Bearer ${servicesConfig.llmApiKey || servicesConfig.internalServiceToken}`;
    }

    const testUrl = llmUrl.endsWith("/v1") ? `${llmUrl}/models` : `${llmUrl}/v1/models`;
    await axios.get(testUrl, { headers, timeout: TIMEOUT_MS }).catch(async () => {
      // Fallback: check base URL
      await axios.get(llmUrl, { headers, timeout: TIMEOUT_MS });
    });
    dependencies.llm = { status: "ok" };
  } catch (err) {
    dependencies.llm = { status: "error", reason: sanitizeErrorMessage(err) };
  }

  const criticals = [dependencies.mongo, dependencies.qdrant, dependencies.teiEmbed, dependencies.llm];
  const allCriticalOk = criticals.every((d) => d.status === "ok");
  const overallStatus = allCriticalOk ? "ok" : "degraded";

  return {
    status: overallStatus,
    ready: allCriticalOk,
    timestamp: new Date().toISOString(),
    dependencies,
  };
}

/**
 * Runs a preflight health check across all required sync dependencies before starting repository sync.
 *
 * @param {string} companyId Target company ID.
 * @param {number|string} [githubRepositoryId] Target GitHub Repository ID.
 */
export async function runSyncPreflightCheck(companyId, githubRepositoryId = null) {
  logInfo("[PREFLIGHT] Starting dependency preflight check...", { companyId });

  // 1. Check TEI Embeddings Service
  const teiUrl = servicesConfig.teiEmbeddingsUrl;
  try {
    const headers = {};
    if (servicesConfig.internalServiceToken) {
      headers["Authorization"] = `Bearer ${servicesConfig.internalServiceToken}`;
    }
    const embedRes = await axios.post(
      `${teiUrl}/embed`,
      { inputs: "preflight check" },
      { headers, timeout: TIMEOUT_MS }
    );
    if (!Array.isArray(embedRes.data)) {
      throw new Error("Invalid response format from TEI /embed");
    }
    logInfo("[PREFLIGHT] TEI embedding service healthy");
  } catch (err) {
    const causeCode = err.code || err.cause?.code || (err.response ? `HTTP ${err.response.status}` : "ECONNRESET");
    throw new PreflightError("Embedding", sanitizeUrl(teiUrl), causeCode, err.message);
  }

  // 2. Check Qdrant Vector Database
  const qdrantUrl = servicesConfig.qdrantUrl;
  try {
    const headers = {};
    if (servicesConfig.qdrantApiKey) {
      headers["api-key"] = servicesConfig.qdrantApiKey;
    }
    await axios.get(`${qdrantUrl}/readyz`, { headers, timeout: TIMEOUT_MS });
    logInfo("[PREFLIGHT] Qdrant vector database healthy");
  } catch (err) {
    const causeCode = err.code || err.cause?.code || (err.response ? `HTTP ${err.response.status}` : "ECONNRESET");
    throw new PreflightError("Qdrant", sanitizeUrl(qdrantUrl), causeCode, err.message);
  }

  // 3. Check Redis TCP connectivity
  try {
    const isReady = await isRedisReady();
    if (!isReady && (servicesConfig.redisHost || servicesConfig.redisUrl)) {
      const host = servicesConfig.redisHost || "127.0.0.1";
      const port = servicesConfig.redisPort || 6379;
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port, timeout: TIMEOUT_MS }, () => {
          socket.end();
          resolve(true);
        });
        socket.on("error", reject);
        socket.on("timeout", () => {
          socket.destroy();
          reject(new Error("Redis connection timed out"));
        });
      });
    }
    logInfo("[PREFLIGHT] Redis service healthy");
  } catch (err) {
    const causeCode = err.code || err.cause?.code || "ECONNREFUSED";
    throw new PreflightError("Redis", `${servicesConfig.redisHost}:${servicesConfig.redisPort}`, causeCode, err.message);
  }

  // 4. Check GitHub API & Installation Token
  try {
    const connection = await GitHubConnection.findOne({
      $or: [{ companyId }, { company: companyId }],
      status: "CONNECTED",
    });
    if (!connection || !connection.installationId) {
      throw new Error("No active GitHub connection found for company.");
    }

    const token = await getInstallationToken(connection.installationId);
    if (!token) {
      throw new Error("Failed to generate installation access token.");
    }

    let repoCheckOk = false;
    if (githubRepositoryId) {
      try {
        await axios.get(`https://api.github.com/repositories/${githubRepositoryId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "WhyCode-App",
          },
          timeout: TIMEOUT_MS,
        });
        repoCheckOk = true;
      } catch (repoErr) {
        // Fallback to checking installation repositories if numeric id is legacy
        repoCheckOk = false;
      }
    }

    if (!repoCheckOk) {
      await axios.get("https://api.github.com/installation/repositories?per_page=1", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "WhyCode-App",
        },
        timeout: TIMEOUT_MS,
      });
    }

    logInfo("[PREFLIGHT] GitHub API connection healthy");
  } catch (err) {
    const causeCode = err.code || err.cause?.code || (err.response ? `HTTP ${err.response.status}` : "ECONNRESET");
    throw new PreflightError("GitHub", "api.github.com", causeCode, err.message);
  }

  logInfo("[PREFLIGHT] All preflight checks passed successfully.");
  return true;
}
