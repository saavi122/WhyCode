import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryRepositoryKnowledge, mapCitations, INSUFFICIENT_EVIDENCE_MESSAGE } from "../services/groundingService.js";
import { TenantValidationError } from "../services/tenantGuard.js";

// Mock dependent services
vi.mock("../services/qdrantStore.js");
vi.mock("../services/teiService.js");
vi.mock("../services/vllmService.js");

import * as qdrantStore from "../services/qdrantStore.js";
import * as teiService from "../services/teiService.js";
import * as vllmService from "../services/vllmService.js";

describe("GroundingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map cited chunk IDs to server-side metadata with path, line range, commit SHA and URL", () => {
    const retrievedChunks = [
      {
        payload: {
          chunkId: "c-100",
          path: "server/app.js",
          startLine: 12,
          endLine: 45,
          commitSha: "abc123sha",
          url: "https://github.com/repo/blob/abc123sha/server/app.js#L12-L45",
        },
      },
    ];

    const citations = mapCitations(["c-100"], retrievedChunks);

    expect(citations).toHaveLength(1);
    expect(citations[0]).toEqual({
      chunkId: "c-100",
      path: "server/app.js",
      lineRange: [12, 45],
      commitSha: "abc123sha",
      url: "https://github.com/repo/blob/abc123sha/server/app.js#L12-L45",
    });
  });

  it("should throw TenantValidationError if session companyId is missing", async () => {
    const invalidSession = {};

    await expect(queryRepositoryKnowledge(invalidSession, "repo-1", "What does app.js do?")).rejects.toThrow(
      TenantValidationError
    );
  });

  it("should return exact insufficient evidence message and NOT call vLLM if retrieval fails threshold", async () => {
    teiService.getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    qdrantStore.searchChunks.mockResolvedValueOnce([
      { id: "c1", score: 0.1, payload: { content: "unrelated code" } },
    ]);
    teiService.rerank.mockResolvedValueOnce([
      { id: "c1", score: 0.1, payload: { content: "unrelated code" } },
    ]);

    const session = { companyId: "comp-1" };
    const result = await queryRepositoryKnowledge(session, "repo-1", "Where is the payment flow?", {
      minScoreThreshold: 0.5,
    });

    expect(result.answer).toBe("I couldn't find sufficient evidence in the connected repository");
    expect(result.citations).toEqual([]);
    expect(result.sources).toEqual([]);
    expect(result.grounded).toBe(false);

    // CRITICAL GROUNDING REQUIREMENT: vLLM MUST NOT BE CALLED
    expect(vllmService.generateGroundedAnswer).not.toHaveBeenCalled();
  });

  it("should return server-built citations in direct evidence mode without calling LLM", async () => {
    const session = { companyId: "comp-1" };
    const mockChunks = [
      {
        id: "chunk-1",
        score: 0.88,
        payload: {
          chunkId: "chunk-1",
          filePath: "src/auth/jwt.js",
          startLine: 10,
          endLine: 40,
          commitSha: "1111222233334444555566667777888899990000",
          prNumber: 42,
          url: "https://github.com/repo/blob/1111222233334444555566667777888899990000/src/auth/jwt.js#L10-L40",
          documentType: "CODE",
          text: "function verifyJwtToken() { return true; }",
        },
      },
    ];

    teiService.getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    qdrantStore.searchChunks.mockResolvedValueOnce(mockChunks);
    teiService.rerank.mockResolvedValueOnce(mockChunks);

    const result = await queryRepositoryKnowledge(session, "repo-1", "How does auth work?", {
      answerMode: "evidence",
      minScoreThreshold: 0.5,
    });

    expect(result.grounded).toBe(true);
    expect(result.answer).toBe("");
    expect(result.answerMode).toBe("evidence");
    expect(result.banner).toBe("Answer model is offline: showing the most relevant repository evidence");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({
      file: "src/auth/jwt.js",
      filePath: "src/auth/jwt.js",
      lineRange: [10, 40],
      commitSha: "1111222233334444555566667777888899990000",
      prNumber: 42,
      permalink: "https://github.com/repo/blob/1111222233334444555566667777888899990000/src/auth/jwt.js#L10-L40",
      label: "src/auth/jwt.js#L10-L40",
    });
    expect(vllmService.generateGroundedAnswer).not.toHaveBeenCalled();
  });

  it("should automatically fall back to evidence mode when LLM throws 429", async () => {
    const session = { companyId: "comp-1" };
    const mockChunks = [
      {
        id: "chunk-rate-limit",
        score: 0.85,
        payload: {
          chunkId: "c-rl",
          path: "client/src/App.jsx",
          startLine: 1,
          endLine: 20,
          commitSha: "aabbccddeeff00112233445566778899aabbccdd",
          url: "https://github.com/repo/blob/aabbccddeeff00112233445566778899aabbccdd/client/src/App.jsx#L1-L20",
          text: "export default function App() {}",
        },
      },
    ];

    teiService.getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    qdrantStore.searchChunks.mockResolvedValueOnce(mockChunks);
    teiService.rerank.mockResolvedValueOnce(mockChunks);

    const err429 = new Error("Rate limit exceeded");
    err429.code = "HTTP_429";
    err429.status = 429;
    vllmService.generateGroundedAnswer.mockRejectedValueOnce(err429);

    const result = await queryRepositoryKnowledge(session, "repo-1", "Explain App.jsx", {
      answerMode: "generate",
      minScoreThreshold: 0.5,
    });

    expect(result.grounded).toBe(true);
    expect(result.answer).toBe("");
    expect(result.answerMode).toBe("evidence");
    expect(result.banner).toBe("Answer model is offline: showing the most relevant repository evidence");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].file).toBe("client/src/App.jsx");
    expect(result.citations[0].commitSha).toBe("aabbccddeeff00112233445566778899aabbccdd");
  });

  it("should automatically fall back to evidence mode when LLM times out", async () => {
    const session = { companyId: "comp-1" };
    const mockChunks = [
      {
        id: "chunk-timeout",
        score: 0.90,
        payload: {
          chunkId: "c-to",
          filePath: "server/routes/api.js",
          startLine: 15,
          endLine: 50,
          commitSha: "99887766554433221100aabbccddeeff00112233",
          url: "https://github.com/repo/blob/99887766554433221100aabbccddeeff00112233/server/routes/api.js#L15-L50",
          text: "router.get('/health', ...)",
        },
      },
    ];

    teiService.getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    qdrantStore.searchChunks.mockResolvedValueOnce(mockChunks);
    teiService.rerank.mockResolvedValueOnce(mockChunks);

    const timeoutErr = new Error("timeout of 30000ms exceeded");
    timeoutErr.code = "ECONNABORTED";
    vllmService.generateGroundedAnswer.mockRejectedValueOnce(timeoutErr);

    const result = await queryRepositoryKnowledge(session, "repo-1", "What are the routes?", {
      answerMode: "generate",
      minScoreThreshold: 0.5,
    });

    expect(result.grounded).toBe(true);
    expect(result.answer).toBe("");
    expect(result.answerMode).toBe("evidence");
    expect(result.banner).toBe("Answer model is offline: showing the most relevant repository evidence");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].file).toBe("server/routes/api.js");
  });

  it("should automatically fall back to evidence mode when circuit breaker is OPEN", async () => {
    const session = { companyId: "comp-1" };
    const mockChunks = [
      {
        id: "chunk-cb",
        score: 0.92,
        payload: {
          chunkId: "c-cb",
          filePath: "services/circuit.js",
          startLine: 5,
          endLine: 30,
          commitSha: "1234567890abcdef1234567890abcdef12345678",
          url: "https://github.com/repo/blob/1234567890abcdef1234567890abcdef12345678/services/circuit.js#L5-L30",
          text: "class CircuitBreaker {}",
        },
      },
    ];

    teiService.getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    qdrantStore.searchChunks.mockResolvedValueOnce(mockChunks);
    teiService.rerank.mockResolvedValueOnce(mockChunks);

    const cbErr = new Error("Answer model is not running");
    cbErr.code = "CIRCUIT_BREAKER_OPEN";
    vllmService.generateGroundedAnswer.mockRejectedValueOnce(cbErr);

    const result = await queryRepositoryKnowledge(session, "repo-1", "How does circuit breaker work?", {
      answerMode: "generate",
      minScoreThreshold: 0.5,
    });

    expect(result.grounded).toBe(true);
    expect(result.answer).toBe("");
    expect(result.answerMode).toBe("evidence");
    expect(result.banner).toBe("Answer model is offline: showing the most relevant repository evidence");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].file).toBe("services/circuit.js");
  });

  it("should execute grounded generation and map citations when evidence threshold passes in generate mode", async () => {
    const session = { companyId: "comp-1" };
    const mockChunks = [
      {
        payload: {
          chunkId: "chunk-auth",
          path: "server/middleware/auth.js",
          startLine: 5,
          endLine: 25,
          commitSha: "def456sha",
          url: "https://github.com/repo/blob/def456/server/middleware/auth.js#L5-L25",
          content: "export function auth() {}",
        },
        score: 0.85,
      },
    ];

    teiService.getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    qdrantStore.searchChunks.mockResolvedValueOnce(mockChunks);
    teiService.rerank.mockResolvedValueOnce(mockChunks);

    vllmService.generateGroundedAnswer.mockResolvedValueOnce({
      answer: "The authentication function validates JWT tokens as described in [chunk-auth].",
      citedChunkIds: ["chunk-auth"],
    });

    const result = await queryRepositoryKnowledge(session, "repo-1", "How does auth work?", {
      answerMode: "generate",
      minScoreThreshold: 0.5,
    });

    expect(result.grounded).toBe(true);
    expect(result.answer).toContain("validates JWT tokens");
    expect(result.citations).toEqual([
      {
        chunkId: "chunk-auth",
        path: "server/middleware/auth.js",
        lineRange: [5, 25],
        commitSha: "def456sha",
        url: "https://github.com/repo/blob/def456/server/middleware/auth.js#L5-L25",
      },
    ]);
  });
});
