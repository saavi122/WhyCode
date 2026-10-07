import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { sanitizeTemperature, formatUntrustedContext, generateGroundedAnswer, getVllmBaseUrl } from "../services/vllmService.js";

vi.mock("axios");

describe("vLLM Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get configured vLLM base URL", () => {
    expect(getVllmBaseUrl()).toBeDefined();
  });

  it("should clamp temperature strictly between 0 and 0.2", () => {
    expect(sanitizeTemperature(-0.5)).toBe(0);
    expect(sanitizeTemperature(0.1)).toBe(0.1);
    expect(sanitizeTemperature(0.5)).toBe(0.2);
    expect(sanitizeTemperature(1.0)).toBe(0.2);
    expect(sanitizeTemperature("invalid")).toBe(0);
  });

  it("should format code chunks inside <untrusted_repository_code> tags with chunk_id", () => {
    const chunks = [
      { chunkId: "chunk-10", payload: { content: "const a = 1;" } },
      { chunkId: "chunk-20", payload: { content: "const b = 2;" } },
    ];

    const formatted = formatUntrustedContext(chunks);
    expect(formatted).toContain('<untrusted_repository_code chunk_id="chunk-10">');
    expect(formatted).toContain("const a = 1;");
    expect(formatted).toContain('<untrusted_repository_code chunk_id="chunk-20">');
  });

  it("should call vLLM endpoint with clamped temperature and parse citations", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: "The function handles auth validation as seen in [chunk-10] and session checks in [chunk-20].",
            },
          },
        ],
      },
    });

    const chunks = [
      { chunkId: "chunk-10", payload: { content: "auth logic" } },
      { chunkId: "chunk-20", payload: { content: "session logic" } },
    ];

    const result = await generateGroundedAnswer("How is auth handled?", chunks, { temperature: 0.8 });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const postBody = axios.post.mock.calls[0][1];
    expect(postBody.temperature).toBe(0.2); // Clamped from 0.8 to 0.2
    expect(result.answer).toContain("handles auth validation");
    expect(result.citedChunkIds).toEqual(["chunk-10", "chunk-20"]);
  });
});
