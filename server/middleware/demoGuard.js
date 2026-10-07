import { servicesConfig } from "../config/services.js";
import { assertLlmAllowed, isLlmAllowed, PrivacyRefusalError } from "../services/privacyGuard.js";

export { assertLlmAllowed, isLlmAllowed, PrivacyRefusalError };

/**
 * Middleware that blocks destructive mutations (DELETE, certain POST/PUT) when DEMO_READ_ONLY=true or DEMO_MODE=true.
 */
export function demoReadOnlyGuard(req, res, next) {
  if (!servicesConfig.demoReadOnly) {
    return next();
  }

  // Block DELETE operations
  if (req.method === "DELETE") {
    return res.status(403).json({
      message: "Action restricted: System is running in demo read-only mode.",
      code: "DEMO_READ_ONLY",
    });
  }

  // Block adding arbitrary repositories if not in allowlist
  if (req.method === "POST" && req.path.includes("/repositories")) {
    const fullName = req.body?.fullName || req.body?.repoName || "";
    const allowlist = servicesConfig.demoRepoAllowlist;
    if (allowlist.length > 0 && fullName && !allowlist.includes(fullName.toLowerCase())) {
      return res.status(403).json({
        message: `Action restricted: Repository '${fullName}' is not in the demo allowlist.`,
        code: "DEMO_REPO_NOT_ALLOWED",
      });
    }
  }

  next();
}

/**
 * Asserts that a repository is eligible for LLM processing when LLM_EXTERNAL=true.
 * Returns { allowed: boolean, error?: string }.
 *
 * @param {Object} repo Repository mongoose document or plain object.
 * @returns {{ allowed: boolean, error?: string }}
 */
export function checkExternalLlmAccess(repo) {
  const allowed = isLlmAllowed(repo, servicesConfig);
  if (!allowed) {
    return { allowed: false, error: "Demo: public repositories only" };
  }
  return { allowed: true };
}

/**
 * Express route helper: Sends 403 response if external LLM access is denied.
 * @param {Object} repo Target repository document.
 * @param {Object} res Express response object.
 * @returns {boolean} True if allowed to proceed, false if 403 was sent.
 */
export function assertExternalLlmAllowed(repo, res) {
  const check = checkExternalLlmAccess(repo);
  if (!check.allowed) {
    res.status(403).json({ message: "Demo: public repositories only" });
    return false;
  }
  return true;
}
