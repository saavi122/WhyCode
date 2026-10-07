import { describe, it, expect } from "vitest";
import { chunkCode, chunkMarkdown, formatEmbeddingText } from "../services/chunker.js";

describe("Code Chunker service", () => {
  it("should chunk a 300-line file into overlapping chunks", () => {
    const lines = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`);
    const content = lines.join("\n");

    const chunks = chunkCode(content, "file.js", { chunkSize: 80, overlap: 15 });

    expect(chunks.length).toBe(5);

    expect(chunks[0]).toMatchObject({
      chunkId: "file.js:0",
      path: "file.js",
      startLine: 1,
      endLine: 80,
    });

    expect(chunks[1]).toMatchObject({
      chunkId: "file.js:1",
      path: "file.js",
      startLine: 66,
      endLine: 145,
    });

    expect(chunks[4]).toMatchObject({
      chunkId: "file.js:4",
      path: "file.js",
      startLine: 261,
      endLine: 300,
    });
  });

  it("should detect functions, classes, and format embedding text with symbol headers", () => {
    const jsCode = `export async function authenticateUser(req, res) {
  const token = req.headers.authorization;
  return token;
}`;
    const chunks = chunkCode(jsCode, "src/auth.js");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].symbol).toBe("authenticateUser");

    const embeddingText = formatEmbeddingText(chunks[0]);
    expect(embeddingText).toBe("File: src/auth.js | Symbol: authenticateUser\n\n" + chunks[0].text);
    // Raw chunk text does not have header
    expect(chunks[0].text).not.toContain("File: src/auth.js");
  });

  it("should chunk markdown by headings and extract section symbols", () => {
    const mdContent = `# Getting Started\n\nInstall the project using npm.\n\n## Configuration\n\nSet environment variables in .env file.`;
    const chunks = chunkMarkdown(mdContent, "README.md");
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].symbol).toBe("Getting Started");
    expect(chunks[1].symbol).toBe("Configuration");

    const embeddingText = formatEmbeddingText(chunks[0]);
    expect(embeddingText).toContain("File: README.md | Symbol: Getting Started");
  });
});
