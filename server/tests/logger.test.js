import { describe, it, expect } from "vitest";
import { createHash, sanitizeLogPayload, logInfo, logError } from "../utils/logger.js";

describe("logger utility", () => {
  it("should create sha256 hash of string content", () => {
    const hash = createHash("const x = 10;");
    expect(hash).toBeTypeOf("string");
    expect(hash.length).toBe(64);
  });

  it("should redact authorization tokens and secrets in metadata", () => {
    const meta = {
      token: "secret-token-123",
      authorization: "Bearer secret-jwt",
      userSecret: "myPassword",
      normalField: "hello",
    };

    const sanitized = sanitizeLogPayload(meta);
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.userSecret).toBe("[REDACTED]");
    expect(sanitized.normalField).toBe("hello");
  });

  it("should convert code and long text fields to hash and size", () => {
    const meta = {
      codeSnippet: "function test() {\n  return 42;\n}\n" + "x".repeat(100),
      normalShort: "abc",
    };

    const sanitized = sanitizeLogPayload(meta);
    expect(sanitized.codeSnippetHash).toBeTypeOf("string");
    expect(sanitized.codeSnippetSize).toBeGreaterThan(100);
    expect(sanitized.normalShort).toBe("abc");
  });

  it("should log info and error payloads safely", () => {
    const infoPayload = logInfo("Test info log", { repositoryId: "repo-1" });
    expect(infoPayload.level).toBe("INFO");
    expect(infoPayload.message).toBe("Test info log");
    expect(infoPayload.repositoryId).toBe("repo-1");

    const errorPayload = logError("Test error log", { token: "secret" });
    expect(errorPayload.level).toBe("ERROR");
    expect(errorPayload.token).toBe("[REDACTED]");
  });
});
