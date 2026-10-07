import { logError } from "./logger.js";

const DEFAULT_RETRIES = 3;

/**
 * Checks if an error is retriable (ECONNRESET, ETIMEDOUT, 502, 503, 429).
 */
export function isRetriableError(error) {
  if (!error) return false;
  const code = error.code || error.cause?.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return true;
  }
  const status = error.response?.status;
  if (status === 502 || status === 503 || status === 429 || status === 504) {
    return true;
  }
  return false;
}

/**
 * Executes an async function with up to 3 retries and exponential backoff.
 */
export async function withRetry(fn, options = {}) {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const initialDelay = options.delay ?? 300;

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (!isRetriableError(err) || attempt === retries) {
        throw err;
      }

      const delay = initialDelay * Math.pow(2, attempt - 1);
      logError(`[RETRY] Request failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`, {
        errorName: err.name,
        errorCode: err.code,
        errorCause: err.cause?.code,
        status: err.response?.status,
        url: err.config?.url,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
