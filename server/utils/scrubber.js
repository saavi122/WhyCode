import path from "path";

const SENSITIVE_PATTERNS = [
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gi,
  /(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})/g,
  /(api[_-]?key|access[_-]?token|secret[_-]?key|auth[_-]?token|password)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.\:\/]{16,})["']?/gi,
];

const IGNORED_PATHS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  "coverage/",
  ".env",
];

const IGNORED_EXTENSIONS = [
  // Images and icons
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp", ".tiff",
  // Fonts
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  // Archives & compressed files
  ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz",
  // Executables, binaries & compiled code
  ".exe", ".dll", ".so", ".dylib", ".bin", ".iso", ".dmg", ".pkg", ".class", ".jar", ".war", ".pyc", ".wasm",
  // Media & documents
  ".pdf", ".mp3", ".mp4", ".mov", ".avi", ".mkv", ".flv", ".wav",
  // Database files
  ".db", ".sqlite", ".sqlite3", ".parquet",
  // Source maps
  ".map",
  // Cryptographic keys & certs
  ".pem", ".key", ".crt", ".der", ".pfx", ".p12"
];

const IGNORED_FILENAMES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "cargo.lock",
  "gemfile.lock",
  "composer.lock",
  "poetry.lock",
];

/**
 * Checks if a file path should be skipped during repository indexing.
 * @param {string} filePath File path to evaluate.
 * @param {number} [fileSize=0] Size of the file in bytes.
 * @returns {boolean} True if file should be skipped.
 */
export function shouldSkipFile(filePath, fileSize = 0) {
  if (!filePath) return true;

  // Skip files over 1 MB (1,048,576 bytes)
  if (fileSize > 1024 * 1024) return true;

  const normalized = filePath.replace(/\\/g, "/");
  const baseName = path.basename(normalized).toLowerCase();

  // Directory skips (node_modules/, dist/, build/, coverage/, etc.)
  if (IGNORED_PATHS.some((ignored) => normalized.includes(ignored))) {
    return true;
  }

  // Exact filename skips (package-lock.json, yarn.lock, etc.)
  if (IGNORED_FILENAMES.includes(baseName)) {
    return true;
  }

  // Lockfile wildcard (*.lock)
  if (baseName.endsWith(".lock")) {
    return true;
  }

  // Minified files (*.min.js, *.min.css) and maps (*.map)
  if (baseName.endsWith(".min.js") || baseName.endsWith(".min.css") || baseName.endsWith(".map")) {
    return true;
  }

  // Sensitive prefix/pattern skips (.env*, id_rsa*, credentials*, certificates*, keys)
  if (
    baseName.startsWith(".env") ||
    baseName.startsWith("id_rsa") ||
    baseName.startsWith("id_ed25519") ||
    baseName.startsWith("id_ecdsa") ||
    baseName.startsWith("credentials") ||
    baseName.startsWith("certificates") ||
    baseName.startsWith("secrets.")
  ) {
    return true;
  }

  // Extension skips
  const ext = path.extname(baseName).toLowerCase();
  if (IGNORED_EXTENSIONS.includes(ext)) {
    return true;
  }

  return false;
}

/**
 * Scrubs secret patterns (private keys, API tokens, password assignments) from file text.
 * Logs counts only, never values.
 *
 * @param {string} text Input text content.
 * @returns {{ text: string, redactedCount: number }} Cleaned text and total count of redacted secrets.
 */
export function scrubSecrets(text) {
  if (!text || typeof text !== "string") {
    return { text: "", redactedCount: 0 };
  }

  let cleaned = text;
  let redactedCount = 0;

  for (const pattern of SENSITIVE_PATTERNS) {
    cleaned = cleaned.replace(pattern, (match) => {
      redactedCount++;
      return "[REDACTED_SECRET]";
    });
  }

  return { text: cleaned, redactedCount };
}
