import crypto from "crypto";

/**
 * Generates a SHA-256 hash of the input string or buffer for privacy-safe tracing.
 * @param {string|Buffer} data Input text or buffer.
 * @returns {string} Hex SHA-256 hash.
 */
export function createHash(data) {
  if (!data) return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // Empty hash
  const stringData = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(stringData).digest("hex");
}

/**
 * Sanitizes metadata to remove potential raw code or secret keys, keeping only hashes, sizes, and timings.
 * @param {Object} meta Raw metadata object.
 * @returns {Object} Sanitized metadata object.
 */
export function sanitizeLogPayload(meta = {}) {
  const sanitized = {};

  for (const [key, val] of Object.entries(meta)) {
    if (val === undefined || val === null) {
      sanitized[key] = val;
      continue;
    }

    // Redact secret token fields
    if (/token|secret|password|auth|authorization|key|credential/i.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // If string looks like source code or long payload, replace with hash and size
    if (typeof val === "string") {
      if (val.length > 100 || val.includes("\n") || key.toLowerCase().includes("code") || key.toLowerCase().includes("text")) {
        sanitized[`${key}Hash`] = createHash(val);
        sanitized[`${key}Size`] = val.length;
      } else {
        sanitized[key] = val;
      }
      continue;
    }

    // Pass numbers, booleans, and small primitive fields directly
    if (typeof val === "number" || typeof val === "boolean") {
      sanitized[key] = val;
      continue;
    }

    // For arrays or objects
    if (typeof val === "object") {
      if (Array.isArray(val)) {
        sanitized[`${key}Count`] = val.length;
      } else {
        sanitized[key] = sanitizeLogPayload(val);
      }
    }
  }

  return sanitized;
}

/**
 * Safe logger that emits structured logs without raw code or secrets.
 * @param {string} message Log message event title.
 * @param {Object} [meta={}] Log metadata.
 */
export function logInfo(message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level: "INFO",
    message,
    ...sanitizeLogPayload(meta),
  };
  console.log(JSON.stringify(payload));
  return payload;
}

/**
 * Safe error logger that emits structured logs without raw code or secrets.
 * @param {string} message Log message event title.
 * @param {Object} [meta={}] Log metadata.
 */
export function logError(message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level: "ERROR",
    message,
    ...sanitizeLogPayload(meta),
  };
  console.error(JSON.stringify(payload));
  return payload;
}
