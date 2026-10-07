import { describe, it, expect, vi, beforeEach } from "vitest";
import { indexFile } from "../services/indexingService.js";

// Mock dependent services
vi.mock("../services/teiService.js");
vi.mock("../services/qdrantStore.js");

import * as teiService from "../services/teiService.js";
import * as qdrantStore from "../services/qdrantStore.js";

describe("IndexingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should index a file by chunking, generating embeddings, and upserting points to Qdrant", async () => {
    teiService.getEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    qdrantStore.upsertChunks.mockResolvedValue({ status: "ok" });

    const session = { companyId: "comp-1" };
    const fakeFile = {
      path: "src/utils.js",
      content: "function add(a, b) {\n  return a + b;\n}",
    };

    const result = await indexFile(session, "repo-123", fakeFile, "sha123", "https://github.com/repo/src/utils.js");

    expect(result.indexed).toBe(1);
    expect(result.path).toBe("src/utils.js");

    expect(teiService.getEmbedding).toHaveBeenCalledTimes(1);
    expect(qdrantStore.upsertChunks).toHaveBeenCalledTimes(1);

    const upsertArgs = qdrantStore.upsertChunks.mock.calls[0];
    expect(upsertArgs[0]).toEqual(session);
    expect(upsertArgs[1]).toBe("repo-123");
    expect(upsertArgs[2]).toBe("repository_chunks");
    expect(upsertArgs[3]).toHaveLength(1);

    const point = upsertArgs[3][0];
    expect(point.chunkId).toBe("src/utils.js:0");
    expect(point.payload.path).toBe("src/utils.js");
    expect(point.payload.commitSha).toBe("sha123");
    expect(point.payload.url).toBe("https://github.com/repo/src/utils.js");
    expect(point.payload.content).toContain("function add");
  });

  it("should return 0 indexed chunks for an empty file without calling network services", async () => {
    const session = { companyId: "comp-1" };
    const emptyFile = { path: "empty.txt", content: "" };

    const result = await indexFile(session, "repo-123", emptyFile);

    expect(result.indexed).toBe(0);
    expect(result.path).toBe("empty.txt");
    expect(teiService.getEmbedding).not.toHaveBeenCalled();
    expect(qdrantStore.upsertChunks).not.toHaveBeenCalled();
  });
});
