import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import axios from "axios";
import { fileURLToPath } from "url";
import { logError, logInfo } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory cache for installation access tokens: Map<installationId, { token, expiresAt }>
const tokenCache = new Map();

/**
 * Loads the GitHub App private key from file path, base64 env, or raw env.
 * @returns {string} PEM formatted private key string.
 */
export function getPrivateKey() {
  if (process.env.GITHUB_PRIVATE_KEY_PATH) {
    const candidatePaths = [
      path.isAbsolute(process.env.GITHUB_PRIVATE_KEY_PATH) ? process.env.GITHUB_PRIVATE_KEY_PATH : null,
      path.resolve(process.cwd(), process.env.GITHUB_PRIVATE_KEY_PATH),
      path.resolve(__dirname, "../", process.env.GITHUB_PRIVATE_KEY_PATH),
      path.resolve(__dirname, "../../", process.env.GITHUB_PRIVATE_KEY_PATH),
      path.resolve(__dirname, "../whycode-dev.2026-10-03.private-key.pem"),
    ].filter(Boolean);

    for (const keyPath of candidatePaths) {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, "utf8");
      }
    }
  }

  if (process.env.GITHUB_PRIVATE_KEY_B64) {
    return Buffer.from(process.env.GITHUB_PRIVATE_KEY_B64, "base64").toString("utf8");
  }

  if (process.env.GITHUB_PRIVATE_KEY) {
    return process.env.GITHUB_PRIVATE_KEY;
  }

  throw new Error("GitHub App private key not configured. Set GITHUB_PRIVATE_KEY_PATH or GITHUB_PRIVATE_KEY_B64.");
}

/**
 * Generates an RS256 signed JWT for authenticating as the GitHub App.
 * Expire time is set under 10 minutes (9 minutes), iat now-60s.
 * @returns {string} App JWT string.
 */
export function createAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new Error("GITHUB_APP_ID is not configured in environment variables.");
  }

  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: String(appId),
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

/**
 * Fetches an installation access token for a given installation ID, cached in memory.
 *
 * @param {string|number} installationId GitHub App installation ID.
 * @returns {Promise<string>} Installation access token.
 */
export async function getInstallationToken(installationId) {
  if (!installationId) {
    throw new Error("installationId is required to fetch installation access token.");
  }

  const strId = String(installationId);

  // Check cache (cached until ~5 minutes before expiry)
  const cached = tokenCache.get(strId);
  const bufferMs = 5 * 60 * 1000;
  if (cached && cached.expiresAt > Date.now() + bufferMs) {
    return cached.token;
  }

  const appJwt = createAppJwt();
  const url = `https://api.github.com/app/installations/${strId}/access_tokens`;

  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "WhyCode-App",
        },
        timeout: 10000,
      }
    );

    const token = response.data.token;
    const expiresAt = response.data.expires_at ? new Date(response.data.expires_at).getTime() : Date.now() + 55 * 60 * 1000;

    tokenCache.set(strId, { token, expiresAt });
    logInfo("Generated new installation access token", { installationId: strId });

    return token;
  } catch (err) {
    logError("Failed to fetch installation access token", {
      installationId: strId,
      errorMessage: err.response?.data?.message || err.message,
    });
    throw err;
  }
}

/**
 * Clears cached installation token for testing or force-refresh.
 * @param {string|number} [installationId]
 */
export function clearTokenCache(installationId) {
  if (installationId) {
    tokenCache.delete(String(installationId));
  } else {
    tokenCache.clear();
  }
}
