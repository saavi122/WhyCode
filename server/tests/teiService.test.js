import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { getEmbedding, rerank, getTeiEmbeddingsUrl, getTeiRerankUrl } from "../services/teiService.js";

vi.mock("axios");

describe("TEI Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve TEI embeddings URL and rerank URL", () => {
    expect(getTeiEmbeddingsUrl()).toBeDefined();
    expect(getTeiRerankUrl()).toBeDefined();
  });

  it("should call TEI /embed endpoint and return vector array", async () => {
    const mockVector = [0.12, 0.34, 0.56];
    axios.post.mockResolvedValueOnce({ data: [mockVector] });

    const embedding = await getEmbedding("function hello() {}");
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(embedding).toEqual(mockVector);
  });

  it("should throw error for invalid input text in getEmbedding", async () => {
    await expect(getEmbedding(null)).rejects.toThrow("Invalid text input");
  });

  it("should call TEI /rerank endpoint and return candidates sorted by score", async () => {
    axios.post.mockResolvedValueOnce({
      data: [
        { index: 1, score: 0.95 },
        { index: 0, score: 0.40 },
      ],
    });

    const chunks = [
      { chunkId: "c1", payload: { content: "low score chunk" } },
      { chunkId: "c2", payload: { content: "high score chunk" } },
    ];

    const reranked = await rerank("how to auth?", chunks);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(reranked[0].chunkId).toBe("c2");
    expect(reranked[0].score).toBe(0.95);
    expect(reranked[1].chunkId).toBe("c1");
    expect(reranked[1].score).toBe(0.40);
  });
});
