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

    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_MESSAGE);
    expect(result.citations).toEqual([]);
    expect(result.grounded).toBe(false);

    // CRITICAL GROUNDING REQUIREMENT: vLLM MUST NOT BE CALLED
    expect(vllmService.generateGroundedAnswer).not.toHaveBeenCalled();
  });

  it("should execute grounded generation and map citations when evidence threshold passes", async () => {
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
