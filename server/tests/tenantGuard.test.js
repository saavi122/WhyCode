import { describe, it, expect } from "vitest";
import { validateTenantContext, TenantValidationError, createTenantGuardedOperation } from "../services/tenantGuard.js";

describe("TenantGuard service", () => {
  it("should extract companyId strictly from session context", () => {
    const session = { companyId: "comp-123", userId: "user-456" };
    const result = validateTenantContext(session, "repo-789");

    expect(result.companyId).toBe("comp-123");
    expect(result.repositoryId).toBe("repo-789");
  });

  it("should ignore companyId passed in untrusted body/query params", () => {
    const session = { companyId: "authenticated-comp-id" };
    const untrustedBody = { companyId: "hacked-company-id", otherParam: "abc" };

    const result = validateTenantContext(session, "repo-1", untrustedBody);
    expect(result.companyId).toBe("authenticated-comp-id");
  });

  it("should throw TenantValidationError if session companyId is missing", () => {
    const invalidSession = { userId: "user-1" }; // No companyId

    expect(() => validateTenantContext(invalidSession, "repo-1")).toThrow(TenantValidationError);
    expect(() => validateTenantContext(null, "repo-1")).toThrow(TenantValidationError);
  });

  it("should throw TenantValidationError if repositoryId is missing or empty", () => {
    const session = { companyId: "comp-1" };

    expect(() => validateTenantContext(session, "")).toThrow(TenantValidationError);
    expect(() => validateTenantContext(session, null)).toThrow(TenantValidationError);
  });

  it("should execute wrapped operation when tenant parameters are valid", async () => {
    const session = { companyId: "comp-99" };
    const mockOperation = async (tenantParams, extraArg) => {
      return { ...tenantParams, extraArg };
    };

    const guardedOp = createTenantGuardedOperation(mockOperation);
    const res = await guardedOp(session, "repo-88", "test-value");

    expect(res.companyId).toBe("comp-99");
    expect(res.repositoryId).toBe("repo-88");
    expect(res.extraArg).toBe("test-value");
  });

  it("should throw before invoking wrapped operation if tenant parameters are invalid", async () => {
    let invoked = false;
    const mockOp = async () => {
      invoked = true;
    };

    const guardedOp = createTenantGuardedOperation(mockOp);
    await expect(guardedOp(null, "repo-1")).rejects.toThrow(TenantValidationError);
    expect(invoked).toBe(false);
  });
});
