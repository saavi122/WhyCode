import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { buildTenantFilter, upsertChunks, searchChunks, deleteRepositoryChunks, getQdrantUrl } from "../services/qdrantStore.js";
import { TenantValidationError } from "../services/tenantGuard.js";

vi.mock("axios");

describe("QdrantStore multi-tenant wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get configured Qdrant URL", () => {
    expect(getQdrantUrl()).toBeDefined();
  });

  it("should construct Qdrant filter forcing companyId and repositoryId", () => {
    const filter = buildTenantFilter("comp-abc", "repo-xyz");
    expect(filter).toEqual({
      must: [
        { key: "companyId", match: { value: "comp-abc" } },
        { key: "repositoryId", match: { value: "repo-xyz" } },
      ],
    });
  });

  it("should throw TenantValidationError before network call if session is invalid", async () => {
    const invalidSession = {};

    await expect(upsertChunks(invalidSession, "repo-1", "col", [])).rejects.toThrow(TenantValidationError);
    await expect(searchChunks(invalidSession, "repo-1", "col", [0.1, 0.2])).rejects.toThrow(TenantValidationError);
    await expect(deleteRepositoryChunks(invalidSession, "repo-1", "col")).rejects.toThrow(TenantValidationError);

    expect(axios.put).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should attach companyId and repositoryId to every point payload in upsertChunks", async () => {
    axios.put.mockResolvedValueOnce({ data: { result: { status: "completed" } } });

    const session = { companyId: "comp-1" };
    const points = [
      {
        chunkId: "c1",
        vector: [0.1, 0.2],
        payload: { path: "src/index.js", startLine: 1, endLine: 10 },
      },
    ];

    await upsertChunks(session, "repo-1", "test_collection", points);

    expect(axios.put).toHaveBeenCalledTimes(1);
    const calledPayload = axios.put.mock.calls[0][1];
    expect(calledPayload.points[0].payload.companyId).toBe("comp-1");
    expect(calledPayload.points[0].payload.repositoryId).toBe("repo-1");
  });

  it("should send tenant filter when searching points", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        result: [
          { id: "c1", score: 0.9, payload: { companyId: "comp-1", repositoryId: "repo-1", content: "code..." } },
        ],
      },
    });

    const session = { companyId: "comp-1" };
    const results = await searchChunks(session, "repo-1", "test_collection", [0.1, 0.2], 3);

    expect(axios.post).toHaveBeenCalledTimes(1);
    const calledBody = axios.post.mock.calls[0][1];
    expect(calledBody.filter).toEqual(buildTenantFilter("comp-1", "repo-1"));
    expect(results).toHaveLength(1);
  });

  it("should send tenant filter when deleting repository chunks", async () => {
    axios.post.mockResolvedValueOnce({ data: { result: { status: "completed" } } });
    const session = { companyId: "comp-1" };
    await deleteRepositoryChunks(session, "repo-1", "test_collection");

    expect(axios.post).toHaveBeenCalledTimes(1);
    const calledBody = axios.post.mock.calls[0][1];
    expect(calledBody.filter).toEqual(buildTenantFilter("comp-1", "repo-1"));
  });

  it("should refuse writes to remote non-test collections when ALLOW_REAL_QDRANT_WRITES is not true", async () => {
    const { assertQdrantWriteAllowed } = await import("../services/qdrantStore.js");
    const { servicesConfig } = await import("../config/services.js");

    const originalUrl = servicesConfig.qdrantUrl;
    const originalEnv = process.env.ALLOW_REAL_QDRANT_WRITES;

    try {
      servicesConfig.qdrantUrl = "https://cloud-cluster.qdrant.io:6333";
      process.env.ALLOW_REAL_QDRANT_WRITES = "false";

      expect(() => assertQdrantWriteAllowed("repository_chunks")).toThrow(/Remote Qdrant write rejected/);

      // Should permit writes if collection name includes 'test'
      expect(() => assertQdrantWriteAllowed("repository_chunks_test")).not.toThrow();

      // Should permit writes if ALLOW_REAL_QDRANT_WRITES=true
      process.env.ALLOW_REAL_QDRANT_WRITES = "true";
      expect(() => assertQdrantWriteAllowed("repository_chunks")).not.toThrow();
    } finally {
      servicesConfig.qdrantUrl = originalUrl;
      process.env.ALLOW_REAL_QDRANT_WRITES = originalEnv;
    }
  });
});
