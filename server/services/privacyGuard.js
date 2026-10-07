import { servicesConfig } from "../config/services.js";

/**
 * Custom error thrown when a repository query or LLM call is refused by privacy rules.
 */
export class PrivacyRefusalError extends Error {
  /**
   * @param {string} [message="Demo: public repositories only"] Refusal reason.
   */
  constructor(message = "Demo: public repositories only") {
    super(message);
    this.name = "PrivacyRefusalError";
    this.statusCode = 403;
    this.code = "DEMO_PUBLIC_REPOS_ONLY";
  }
}

/**
 * Normalizes allowlist into an array of lowercase strings.
 * @param {Array<string>|string} [allowlistInput]
 * @returns {string[]}
 */
function normalizeAllowlist(allowlistInput) {
  if (Array.isArray(allowlistInput)) {
    return allowlistInput.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof allowlistInput === "string") {
    return allowlistInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

/**
 * Checks whether LLM processing is permitted for the given repository under current configuration.
 *
 * Privacy Rules:
 * 1. When LLM_EXTERNAL is false: Allow all repositories.
 * 2. When LLM_EXTERNAL is true:
 *    - Reject if repo is missing, private, or has private visibility.
 *    - Reject if DEMO_REPO_ALLOWLIST is empty or missing (deny everything by default).
 *    - Reject if repository lowercase fullName is not present in DEMO_REPO_ALLOWLIST.
 *    - Allow ONLY if repository is public AND in DEMO_REPO_ALLOWLIST.
 *
 * @param {Object|string} repo Target repository mongoose document, object, or fullName string.
 * @param {Object} [config=servicesConfig] Optional config override.
 * @returns {boolean} True if allowed, false if denied.
 */
export function isLlmAllowed(repo, config = servicesConfig) {
  const isExternal =
    config?.llmExternal !== undefined
      ? Boolean(config.llmExternal)
      : process.env.LLM_EXTERNAL === "true";

  // When LLM_EXTERNAL is false, allow all operations
  if (!isExternal) {
    return true;
  }

  // When LLM_EXTERNAL is true, repository must exist
  if (!repo) {
    return false;
  }

  // Check if repository is public (missing flag is treated as private for safety)
  if (typeof repo === "object") {
    const hasExplicitPublic =
      repo.isPrivate === false ||
      repo.private === false ||
      repo.visibility === "public";

    if (!hasExplicitPublic) {
      return false;
    }
  }

  // Resolve allowlist
  const rawAllowlist = config?.demoRepoAllowlist ?? process.env.DEMO_REPO_ALLOWLIST;
  const allowlist = normalizeAllowlist(rawAllowlist);

  // Empty or missing allowlist denies everything when LLM_EXTERNAL is true
  if (allowlist.length === 0) {
    return false;
  }

  // Extract fullName
  let fullName = "";
  if (typeof repo === "string") {
    fullName = repo;
  } else if (repo && typeof repo === "object") {
    fullName = repo.fullName || repo.repoName || repo.name || "";
  }

  fullName = fullName.trim().toLowerCase();
  if (!fullName) {
    return false;
  }

  return allowlist.includes(fullName);
}

/**
 * Asserts that LLM processing is allowed for the repository.
 * Throws a PrivacyRefusalError (status 403, "Demo: public repositories only") if denied.
 *
 * @param {Object|string} repo Target repository document, object, or fullName string.
 * @param {Object} [config=servicesConfig] Optional configuration object.
 * @returns {boolean} True if permitted.
 * @throws {PrivacyRefusalError} If denied under LLM_EXTERNAL rules.
 */
export function assertLlmAllowed(repo, config = servicesConfig) {
  if (!isLlmAllowed(repo, config)) {
    throw new PrivacyRefusalError("Demo: public repositories only");
  }
  return true;
}
