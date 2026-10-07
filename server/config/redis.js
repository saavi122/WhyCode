import Redis from "ioredis";
import { servicesConfig } from "./services.js";
import { logInfo, logError } from "../utils/logger.js";

let redisClient = null;
let isConnected = false;
const inMemoryFallbackStore = new Map();

/**
 * Creates or retrieves the singleton Redis client.
 * Supports redis:// and rediss:// (TLS), as well as host/port configurations.
 *
 * @returns {Redis|null} ioredis instance or null if unconfigured/disabled.
 */
export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const { redisUrl, redisHost, redisPort, redisPassword } = servicesConfig;

  // Only connect if REDIS_URL is explicitly set, or non-default host configured, or dev environment with Redis envs
  const isRedisConfigured = Boolean(
    redisUrl || (redisHost && redisHost !== "127.0.0.1") || (process.env.NODE_ENV !== "production" && (process.env.REDIS_HOST || process.env.REDIS_URL))
  );

  if (!isRedisConfigured) {
    return null;
  }

  try {
    const options = {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        // Linear / exponential backoff max 5 seconds
        return Math.min(times * 200, 5000);
      },
    };

    if (redisUrl) {
      // Handles rediss:// and redis://
      redisClient = new Redis(redisUrl, options);
    } else if (redisHost) {
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        ...options,
      });
    } else {
      return null;
    }

    redisClient.on("connect", () => {
      isConnected = true;
      logInfo("[REDIS] Connected to Redis instance");
    });

    redisClient.on("ready", () => {
      isConnected = true;
    });

    redisClient.on("error", (err) => {
      isConnected = false;
      // Do not crash server on transient Redis disconnects
      logError("[REDIS] Connection error", { message: err.message, code: err.code });
    });

    redisClient.on("close", () => {
      isConnected = false;
    });

    // Attempt initial connect without blocking startup
    redisClient.connect().catch((err) => {
      logError("[REDIS] Initial connection failed (fallback enabled)", { message: err.message });
    });

    return redisClient;
  } catch (error) {
    logError("[REDIS] Failed to initialize client", { message: error.message });
    return null;
  }
}

/**
 * Checks if Redis is currently connected and ready.
 * @returns {Promise<boolean>}
 */
export async function isRedisReady() {
  try {
    const client = getRedisClient();
    if (!client) return false;
    const res = await client.ping();
    return res === "PONG";
  } catch (_) {
    return false;
  }
}

/**
 * Stores OAuth state parameter in Redis (or in-memory fallback) with TTL.
 *
 * @param {string} state OAuth state string.
 * @param {Object} data Associated metadata.
 * @param {number} [ttlSec=600] Time to live in seconds (default 10 mins).
 */
export async function saveOAuthState(state, data = {}, ttlSec = 600) {
  const payload = JSON.stringify({ ...data, createdAt: Date.now() });
  try {
    const client = getRedisClient();
    if (client && isConnected) {
      await client.set(`oauth_state:${state}`, payload, "EX", ttlSec);
      return;
    }
  } catch (_) {}

  // Fallback to in-memory store
  inMemoryFallbackStore.set(`oauth_state:${state}`, {
    data: payload,
    expiresAt: Date.now() + ttlSec * 1000,
  });
}

/**
 * Verifies and consumes OAuth state parameter (one-time use).
 *
 * @param {string} state OAuth state string.
 * @returns {Promise<Object|null>} Parsed data or null if invalid/expired.
 */
export async function verifyAndConsumeOAuthState(state) {
  if (!state) return null;
  const key = `oauth_state:${state}`;

  try {
    const client = getRedisClient();
    if (client && isConnected) {
      const val = await client.get(key);
      if (val) {
        await client.del(key);
        return JSON.parse(val);
      }
    }
  } catch (_) {}

  // Check fallback store
  const stored = inMemoryFallbackStore.get(key);
  if (stored) {
    inMemoryFallbackStore.delete(key);
    if (stored.expiresAt > Date.now()) {
      try {
        return JSON.parse(stored.data);
      } catch (_) {
        return {};
      }
    }
  }

  return null;
}

/**
 * Retrieves cached value by key.
 * @param {string} key Cache key.
 * @returns {Promise<any|null>}
 */
export async function getCache(key) {
  try {
    const client = getRedisClient();
    if (client && isConnected) {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    }
  } catch (_) {}

  const stored = inMemoryFallbackStore.get(key);
  if (stored && stored.expiresAt > Date.now()) {
    try {
      return JSON.parse(stored.data);
    } catch (_) {
      return stored.data;
    }
  }
  return null;
}

/**
 * Sets cached value by key with TTL.
 * @param {string} key Cache key.
 * @param {any} value Data to store.
 * @param {number} [ttlSec=300] TTL in seconds.
 */
export async function setCache(key, value, ttlSec = 300) {
  const payload = JSON.stringify(value);
  try {
    const client = getRedisClient();
    if (client && isConnected) {
      await client.set(key, payload, "EX", ttlSec);
      return;
    }
  } catch (_) {}

  inMemoryFallbackStore.set(key, {
    data: payload,
    expiresAt: Date.now() + ttlSec * 1000,
  });
}
