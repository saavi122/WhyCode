import { describe, it, expect, beforeEach, vi } from "vitest";
import { shouldSkipFile, scrubSecrets } from "../utils/scrubber.js";
import {
  chunkCode,
  chunkMarkdown,
  chunkCommit,
  chunkPullRequest,
  generateDeterministicUuid,
  computeContentHash,
} from "../services/chunker.js";

describe("Sync Flow, Scrubbing, Chunking & Vector Hashing Unit Tests", () => {
  describe("File Skipping Rules", () => {
    it("should skip sensitive directories, lockfiles, and binary/oversized files", () => {
      expect(shouldSkipFile("node_modules/express/index.js")).toBe(true);
      expect(shouldSkipFile(".git/config")).toBe(true);
      expect(shouldSkipFile("dist/bundle.js")).toBe(true);
      expect(shouldSkipFile("build/app.js")).toBe(true);
      expect(shouldSkipFile("coverage/lcov.info")).toBe(true);
      expect(shouldSkipFile("package-lock.json")).toBe(true);
      expect(shouldSkipFile("yarn.lock")).toBe(true);
      expect(shouldSkipFile("pnpm-lock.yaml")).toBe(true);
      expect(shouldSkipFile("Cargo.lock")).toBe(true);
      expect(shouldSkipFile("app.min.js")).toBe(true);
      expect(shouldSkipFile("bundle.js.map")).toBe(true);
      expect(shouldSkipFile(".env")).toBe(true);
      expect(shouldSkipFile(".env.local")).toBe(true);
      expect(shouldSkipFile("server.key")).toBe(true);
      expect(shouldSkipFile("cert.pem")).toBe(true);
      expect(shouldSkipFile("id_rsa")).toBe(true);
      expect(shouldSkipFile("credentials.json")).toBe(true);
      expect(shouldSkipFile("image.png")).toBe(true);
      expect(shouldSkipFile("large_file.js", 2 * 1024 * 1024)).toBe(true);
    });

    it("should allow valid source code and documentation files under 1MB", () => {
      expect(shouldSkipFile("src/index.js", 5000)).toBe(false);
      expect(shouldSkipFile("controllers/userController.ts", 12000)).toBe(false);
      expect(shouldSkipFile("README.md", 2000)).toBe(false);
      expect(shouldSkipFile("docs/architecture.rst", 8000)).toBe(false);
    });
  });

  describe("Secret Scrubbing", () => {
    it("should scrub private keys, API tokens, and password assignments inside text", () => {
      const input = `
        const AWS_KEY = "AKIA1234567890ABCDEF";
        const GITHUB_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
        const password = "mysecretpassword123!";
        const pkey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----";
      `;

      const { text, redactedCount } = scrubSecrets(input);

      expect(redactedCount).toBeGreaterThanOrEqual(3);
      expect(text).not.toContain("AKIA1234567890ABCDEF");
      expect(text).not.toContain("ghp_1234567890abcdefghijklmnopqrstuvwxyz");
      expect(text).not.toContain("-----BEGIN RSA PRIVATE KEY-----");
      expect(text).toContain("[REDACTED_SECRET]");
    });
  });

  describe("Deterministic UUID & Content Hashing", () => {
    it("should generate identical stable UUIDs for the exact same seed", () => {
      const seed1 = "companyA:repo1:CODE:src/app.js:1:hash123";
      const seed2 = "companyA:repo1:CODE:src/app.js:1:hash123";
      const uuid1 = generateDeterministicUuid(seed1);
      const uuid2 = generateDeterministicUuid(seed2);

      expect(uuid1).toBe(uuid2);
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("should produce different UUIDs for different line numbers or hashes", () => {
      const uuidA = generateDeterministicUuid("companyA:repo1:CODE:src/app.js:1:hash123");
      const uuidB = generateDeterministicUuid("companyA:repo1:CODE:src/app.js:81:hash123");
      expect(uuidA).not.toBe(uuidB);
    });
  });

  describe("Chunking Logic", () => {
    it("should chunk code by line boundaries and include line numbers and content hashes", () => {
      const code = Array.from({ length: 150 }, (_, i) => `console.log("line ${i + 1}");`).join("\n");
      const chunks = chunkCode(code, "src/main.js");

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].startLine).toBe(1);
      expect(chunks[0].contentHash).toBeDefined();
      expect(chunks[chunks.length - 1].endLine).toBe(150);
    });

    it("should chunk Markdown files by headings", () => {
      const sectionA = "This is a detailed overview section of the WhyCode intelligence platform.\n".repeat(6);
      const sectionB = "Install the project dependencies using standard npm package managers.\n".repeat(6);
      const sectionC = "Start the local server using standard command line scripts.\n".repeat(6);
      const md = `# Overview\n${sectionA}\n## Installation\n${sectionB}\n## Usage\n${sectionC}`;
      const chunks = chunkMarkdown(md, "README.md");

      expect(chunks.length).toBeGreaterThanOrEqual(3);
      expect(chunks[0].text).toContain("Overview");
      expect(chunks[1].text).toContain("Installation");
      expect(chunks[2].text).toContain("Usage");
    });

    it("should chunk commit history and pull requests into single normalized documents", () => {
      const commitChunk = chunkCommit(
        {
          sha: "abc123456789",
          author: "Alex",
          date: "2026-10-04",
          message: "feat: implement sync",
          changedFiles: ["src/app.js"],
        },
        "owner/repo"
      );

      expect(commitChunk.chunkId).toBe("commit:abc123456789");
      expect(commitChunk.url).toBe("https://github.com/owner/repo/commit/abc123456789");

      const prChunk = chunkPullRequest(
        {
          number: 42,
          title: "Feature Sync Pipeline",
          body: "Closes #10",
          author: "Sam",
          state: "closed",
          createdAt: "2026-10-04",
          changedFiles: [],
          comments: [],
        },
        "owner/repo"
      );

      expect(prChunk.chunkId).toBe("pr:42");
      expect(prChunk.url).toBe("https://github.com/owner/repo/pull/42");
    });
  });

  describe("STAGE 2: One Indexing Pipeline & Deterministic Point ID Requirements", () => {
    it("buildPointId should generate stable point UUID independent of contentHash so edits overwrite old points", () => {
      const { buildPointId } = require("../services/chunker.js");
      const pointIdV1 = buildPointId({
        companyId: "comp_123",
        repositoryId: "repo_456",
        documentType: "CODE",
        pathOrSha: "src/utils.js",
        chunkIndex: 0,
      });

      const pointIdV2 = buildPointId({
        companyId: "comp_123",
        repositoryId: "repo_456",
        documentType: "CODE",
        pathOrSha: "src/utils.js",
        chunkIndex: 0,
      });

      expect(pointIdV1).toBe(pointIdV2);
      expect(pointIdV1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("different chunkIndex or documentType should generate distinct point UUIDs", () => {
      const { buildPointId } = require("../services/chunker.js");
      const codePoint0 = buildPointId({
        companyId: "comp_123",
        repositoryId: "repo_456",
        documentType: "CODE",
        pathOrSha: "src/utils.js",
        chunkIndex: 0,
      });

      const codePoint1 = buildPointId({
        companyId: "comp_123",
        repositoryId: "repo_456",
        documentType: "CODE",
        pathOrSha: "src/utils.js",
        chunkIndex: 1,
      });

      const docPoint0 = buildPointId({
        companyId: "comp_123",
        repositoryId: "repo_456",
        documentType: "DOCUMENTATION",
        pathOrSha: "src/utils.js",
        chunkIndex: 0,
      });

      expect(codePoint0).not.toBe(codePoint1);
      expect(codePoint0).not.toBe(docPoint0);
    });

    it("indexFile should format points with buildPointId, embedModel, embedVersion, and documentType", async () => {
      const { indexFile } = await import("../services/indexingService.js");
      const { buildPointId } = await import("../services/chunker.js");
      const qdrantStore = await import("../services/qdrantStore.js");
      const teiService = await import("../services/teiService.js");

      const upsertSpy = vi.spyOn(qdrantStore, "upsertChunks").mockResolvedValue({ status: "acknowledged" });
      const embedSpy = vi.spyOn(teiService, "getEmbedding").mockResolvedValue(new Array(384).fill(0.1));

      const authContext = { user: { company: "comp_test_1" } };
      const commitSha = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
      const file = {
        path: "src/calculator.js",
        content: "export function add(a, b) {\n  return a + b;\n}\n",
      };

      const result = await indexFile(
        authContext,
        "repo_test_1",
        file,
        commitSha,
        "",
        { fullName: "org/calc-repo", author: "dev1" }
      );

      expect(result.indexed).toBeGreaterThanOrEqual(1);
      expect(upsertSpy).toHaveBeenCalled();

      const upsertedPoints = upsertSpy.mock.calls[0][3];
      expect(upsertedPoints.length).toBeGreaterThanOrEqual(1);

      const firstPoint = upsertedPoints[0];
      const expectedPointId = buildPointId({
        companyId: "comp_test_1",
        repositoryId: "repo_test_1",
        documentType: "CODE",
        pathOrSha: "src/calculator.js",
        chunkIndex: 0,
      });

      expect(firstPoint.id).toBe(expectedPointId);
      expect(firstPoint.payload.embedModel).toBe("BAAI/bge-small-en-v1.5");
      expect(firstPoint.payload.embedVersion).toBe("1.0");
      expect(firstPoint.payload.documentType).toBe("CODE");
      expect(firstPoint.payload.commitSha).toBe(commitSha);
      expect(firstPoint.payload.url).toBe(
        `https://github.com/org/calc-repo/blob/${commitSha}/src/calculator.js#L1-L4`
      );

      upsertSpy.mockRestore();
      embedSpy.mockRestore();
    });
  });
});

