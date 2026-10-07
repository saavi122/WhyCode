import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Checks if a given hostname or IP address is localhost, loopback, or a private IPv4/IPv6 address.
 *
 * @param {string} urlString URL or hostname string.
 * @returns {boolean} True if localhost or private IP.
 */
export function isLocalOrPrivateAddress(urlString) {
  if (!urlString || typeof urlString !== "string") return false;

  let hostname = urlString;
  try {
    if (urlString.includes("://")) {
      const parsed = new URL(urlString);
      hostname = parsed.hostname;
    }
  } catch (_) {
    // If URL parsing fails, extract host part directly
    hostname = urlString.replace(/^.*:\/\//, "").split("/")[0].split(":")[0];
  }

  // Strip brackets from IPv6 if present
  hostname = hostname.replace(/^\[|\]$/g, "").toLowerCase().trim();

  // 1. Explicit localhost names
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "0.0.0.0" || hostname === "::1") {
    return true;
  }

  // 2. Loopback 127.0.0.0/8
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  // 3. Private IPv4 classes
  // 10.0.0.0 - 10.255.255.255
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  // 172.16.0.0 - 172.31.255.255
  const match172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  // 192.168.0.0 - 192.168.255.255
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  return false;
}

/**
 * Normalizes URL string to prevent localhost/127.0.0.1 confusion and strip trailing slashes.
 * @param {string} url Input URL.
 * @param {string} fallback Default URL if not provided.
 * @returns {string} Normalized URL.
 */
function normalizeUrl(url, fallback) {
  const target = (url || fallback || "").trim().replace(/\/+$/, "");
  if (target.startsWith("https://") || target.includes(".qdrant.tech") || target.includes(".huggingface.co")) {
    return target;
  }
  return target.replace("localhost", "127.0.0.1");
}

/**
 * Parses comma-separated allowlist into clean string array.
 * @param {string} allowlistStr Comma-delimited list of repo fullNames.
 * @returns {string[]} Normalized repository allowlist.
 */
function parseAllowlist(allowlistStr) {
  if (!allowlistStr || typeof allowlistStr !== "string") return [];
  return allowlistStr
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const servicesConfig = {
  // Database & Cache
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/WhyCode",
  redisUrl: process.env.REDIS_URL || "",
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: parseInt(process.env.REDIS_PORT || "6379", 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,

  // Vector Database (Qdrant)
  qdrantUrl: normalizeUrl(process.env.QDRANT_URL, "http://127.0.0.1:6333"),
  qdrantApiKey: process.env.QDRANT_API_KEY || "",

  // Embeddings & Reranker (HuggingFace TEI)
  teiEmbeddingsUrl: normalizeUrl(process.env.TEI_EMBEDDINGS_URL, "http://127.0.0.1:8080"),
  teiRerankUrl: normalizeUrl(process.env.TEI_RERANKER_URL || process.env.TEI_RERANK_URL, "http://127.0.0.1:8081"),
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || "",

  // LLM Inference
  llmBaseUrl: normalizeUrl(process.env.LLM_BASE_URL || process.env.VLLM_BASE_URL, "http://127.0.0.1:11434/v1"),
  llmModel: process.env.LLM_MODEL || process.env.VLLM_MODEL || "qwen2.5-coder:3b",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmExternal: process.env.LLM_EXTERNAL === "true",

  // Gemini Fallback Provider
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiDailyLimit: parseInt(process.env.GEMINI_DAILY_LIMIT || "200", 10),
  geminiEnabled: Boolean(process.env.GEMINI_API_KEY) && process.env.GEMINI_ENABLED !== "false",
  sendAdminAlerts: process.env.SEND_ADMIN_ALERTS === "true",

  // Calibration & Thresholds
  thresholdsFile: process.env.THRESHOLDS_FILE || "",
  answerMode: (process.env.ANSWER_MODE || "generate").toLowerCase() === "evidence" ? "evidence" : "generate",

  // Web & Client Routing
  clientOrigin: process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
  clientUrl: process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173",
  serverUrl: process.env.SERVER_URL || "http://localhost:5000",
  viteApiUrl: process.env.VITE_API_URL || "",

  // GitHub App
  githubAppId: process.env.GITHUB_APP_ID || process.env.APP_ID || "",
  githubAppSlug: process.env.GITHUB_APP_SLUG || process.env.APP_SLUG || "whycode-dev",
  githubClientId: process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || "",
  githubPrivateKeyB64: process.env.GITHUB_PRIVATE_KEY_B64 || process.env.PRIVATE_KEY_B64 || "",
  githubPrivateKeyPath: process.env.GITHUB_PRIVATE_KEY_PATH || "./whycode-dev.private-key.pem",
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "",
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL || process.env.CALLBACK_URL || "",

  // Guardrails, Demo & Privacy
  demoMode: process.env.DEMO_MODE === "true",
  demoReadOnly: process.env.DEMO_READ_ONLY === "true" || process.env.DEMO_MODE === "true",
  demoRepoAllowlist: parseAllowlist(process.env.DEMO_REPO_ALLOWLIST),
  maxQuestionLength: parseInt(process.env.MAX_QUESTION_LENGTH || "500", 10),

  // Security & Proxy Settings
  trustProxy: process.env.TRUST_PROXY || "1",
  cookieSecure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  cookieSameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
  allowLocalServices: process.env.ALLOW_LOCAL_SERVICES === "true",
};

/**
 * Validates service URLs in production mode. Refuses to start if any service points to
 * localhost or private network address unless ALLOW_LOCAL_SERVICES=true.
 */
export function validateProductionConfig() {
  if (process.env.NODE_ENV === "production" && !servicesConfig.allowLocalServices) {
    const urlsToCheck = [
      { name: "QDRANT_URL", url: servicesConfig.qdrantUrl },
      { name: "TEI_EMBEDDINGS_URL", url: servicesConfig.teiEmbeddingsUrl },
      { name: "TEI_RERANKER_URL", url: servicesConfig.teiRerankUrl },
      { name: "LLM_BASE_URL", url: servicesConfig.llmBaseUrl },
    ];

    if (servicesConfig.redisUrl) {
      urlsToCheck.push({ name: "REDIS_URL", url: servicesConfig.redisUrl });
    }

    if (servicesConfig.mongoUri && !servicesConfig.mongoUri.includes("mongodb+srv://")) {
      urlsToCheck.push({ name: "MONGO_URI", url: servicesConfig.mongoUri });
    }

    const violations = [];
    for (const item of urlsToCheck) {
      if (item.url && isLocalOrPrivateAddress(item.url)) {
        violations.push(`${item.name} (${item.url})`);
      }
    }

    if (violations.length > 0) {
      const errorMsg = `[CRITICAL CONFIG ERROR] Refusing to start in NODE_ENV=production: The following service URLs point to localhost or a private IP address:\n - ${violations.join("\n - ")}\nTo allow local microservices in production, set ALLOW_LOCAL_SERVICES=true.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

export default servicesConfig;
