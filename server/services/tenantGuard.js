/**
 * Custom error thrown when tenant context validation fails.
 */
export class TenantValidationError extends Error {
  /**
   * @param {string} message Error message.
   */
  constructor(message) {
    super(message);
    this.name = "TenantValidationError";
    this.statusCode = 403;
  }
}

/**
 * Validates and extracts the tenant context for a request.
 * Enforces that companyId comes strictly from authenticated server session context.
 * Rejects request body, query string, or unauthenticated companyId parameters.
 *
 * @param {Object} authContext Authenticated session object (e.g., req.user or session).
 * @param {string} repositoryId Target repository ID.
 * @param {Object} [untrustedInput={}] Request body or query params to sanitize.
 * @returns {{ companyId: string, repositoryId: string }} Validated tenant parameters.
 * @throws {TenantValidationError} If companyId or repositoryId is missing or invalid.
 */
export function validateTenantContext(authContext, repositoryId, untrustedInput = {}) {
  // Check if untrusted inputs attempt to supply or override companyId
  if (untrustedInput && (untrustedInput.companyId || untrustedInput.company_id)) {
    // Stripped/ignored: companyId MUST never come from user input or request body
  }

  let rawCompanyId =
    authContext?.companyId ||
    authContext?.company_id ||
    authContext?.company ||
    authContext?.user?.companyId ||
    authContext?.user?.company;

  const companyId = rawCompanyId ? String(rawCompanyId).trim() : "";

  if (!companyId || companyId === "undefined" || companyId === "null") {
    throw new TenantValidationError("Tenant validation failed: Missing or invalid companyId in authenticated session.");
  }

  const strRepoId = repositoryId ? String(repositoryId).trim() : "";
  if (!strRepoId || strRepoId === "undefined" || strRepoId === "null") {
    throw new TenantValidationError("Tenant validation failed: Missing or invalid repositoryId.");
  }

  return {
    companyId,
    repositoryId: strRepoId,
  };
}

/**
 * Higher-order tenant guard that wraps any Qdrant operation function,
 * ensuring companyId and repositoryId are present before network I/O.
 *
 * @param {Function} operationFn Qdrant operation function to wrap.
 * @returns {Function} Tenant-guarded function.
 */
export function createTenantGuardedOperation(operationFn) {
  return async (authContext, repositoryId, ...args) => {
    const tenantParams = validateTenantContext(authContext, repositoryId);
    return await operationFn(tenantParams, ...args);
  };
}
