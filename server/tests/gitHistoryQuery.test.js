import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  queryRepositoryKnowledge,
  detectStructuredGitIntent,
  cleanQueryText,
  resolveStructuredGitAnswer,
  toDisplayName,
  INSUFFICIENT_EVIDENCE_MESSAGE,
} from "../services/groundingService.js";
import CommitMemory from "../models/CommitMemory.js";
import Repository from "../models/Repository.js";

// Mock external services so tests run fast and isolated
vi.mock("../services/qdrantStore.js");
vi.mock("../services/teiService.js");
vi.mock("../services/vllmService.js");

import * as qdrantStore from "../services/qdrantStore.js";
import * as teiService from "../services/teiService.js";
import * as vllmService from "../services/vllmService.js";

describe("Git History & Query Router Test Suite", () => {
  const session = {
    companyId: "comp-1",
    user: { id: "user-1", companyId: "comp-1" },
  };

  const sampleRepoId = "650000000000000000000001";
  const sampleRepoDoc = {
    _id: new mongoose.Types.ObjectId(sampleRepoId),
    name: "DayOne",
    fullName: "saavi122/DayOne",
    owner: "saavi122",
  };

  const sampleCommits = [
    {
      _id: new mongoose.Types.ObjectId(),
      repository: sampleRepoDoc._id,
      commitSha: "1111111111111111111111111111111111111111",
      author: "Saavi",
      authorName: "Saavi",
      authorEmail: "saavi@example.com",
      authorLogin: "saavi122",
      message: "Initial commit: scaffold project structure",
      parentShas: [],
      filesChanged: ["README.md", "package.json"],
      diffSummary: "Initial project setup with basic package configuration",
      date: new Date("2024-01-01T10:00:00Z"),
      committedAt: new Date("2024-01-01T10:00:00Z"),
      htmlUrl: "https://github.com/saavi122/DayOne/commit/1111111111111111111111111111111111111111",
    },
    {
      _id: new mongoose.Types.ObjectId(),
      repository: sampleRepoDoc._id,
      commitSha: "2222222222222222222222222222222222222222",
      author: "Saavi",
      authorName: "Saavi",
      authorEmail: "saavi@example.com",
      authorLogin: "saavi122",
      message: "feat: add user authentication with JWT and bcrypt",
      parentShas: ["1111111111111111111111111111111111111111"],
      filesChanged: ["server/auth.js", "server/routes/authRoutes.js"],
      diffSummary: "Added JWT token issuance and password hashing",
      date: new Date("2024-01-02T12:00:00Z"),
      committedAt: new Date("2024-01-02T12:00:00Z"),
      htmlUrl: "https://github.com/saavi122/DayOne/commit/2222222222222222222222222222222222222222",
    },
    {
      _id: new mongoose.Types.ObjectId(),
      repository: sampleRepoDoc._id,
      commitSha: "3333333333333333333333333333333333333333",
      author: "Alex",
      authorName: "Alex Developer",
      authorEmail: "alex@example.com",
      authorLogin: "alexdev",
      message: "fix: update rate limiter configuration in server.js",
      parentShas: ["2222222222222222222222222222222222222222"],
      filesChanged: ["server/server.js", "server/middleware/rateLimit.js"],
      diffSummary: "Increased burst limits for employee endpoints",
      date: new Date("2024-01-03T15:00:00Z"),
      committedAt: new Date("2024-01-03T15:00:00Z"),
      htmlUrl: "https://github.com/saavi122/DayOne/commit/3333333333333333333333333333333333333333",
    },
    {
      _id: new mongoose.Types.ObjectId(),
      repository: sampleRepoDoc._id,
      commitSha: "4444444444444444444444444444444444444444",
      author: "Saavi",
      authorName: "Saavi",
      authorEmail: "saavi@example.com",
      authorLogin: "saavi122",
      message: "feat: add telemetry metrics endpoint",
      parentShas: ["3333333333333333333333333333333333333333"],
      filesChanged: ["server/routes/metrics.js"],
      diffSummary: "Added Prometheus counter for RAG queries",
      date: new Date("2024-01-04T09:30:00Z"),
      committedAt: new Date("2024-01-04T09:30:00Z"),
      htmlUrl: "https://github.com/saavi122/DayOne/commit/4444444444444444444444444444444444444444",
    },
    {
      _id: new mongoose.Types.ObjectId(),
      repository: sampleRepoDoc._id,
      commitSha: "5555555555555555555555555555555555555555",
      author: "Saavi",
      authorName: "Saavi",
      authorEmail: "saavi@example.com",
      authorLogin: "saavi122",
      message: "chore: update documentation and dependencies",
      parentShas: ["4444444444444444444444444444444444444444"],
      filesChanged: ["README.md", "package.json"],
      diffSummary: "Updated readme usage section",
      date: new Date("2024-01-05T18:00:00Z"),
      committedAt: new Date("2024-01-05T18:00:00Z"),
      htmlUrl: "https://github.com/saavi122/DayOne/commit/5555555555555555555555555555555555555555",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(CommitMemory, "find").mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(sampleCommits),
      }),
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
      lean: vi.fn().mockResolvedValue(sampleCommits),
    });
  });

  describe("Query Cleaning (cleanQueryText)", () => {
    it("should strip repository name and scoping phrases from query", () => {
      const q = "What initial commits exist in the git history of DayOne?";
      const cleaned = cleanQueryText(q, sampleRepoDoc);
      expect(cleaned).toBe("What initial commits exist?");
      expect(cleaned).not.toContain("DayOne");
      expect(detectStructuredGitIntent(cleaned)).toMatchObject({ type: "INITIAL_COMMITS" });
    });

    it("should strip full repo name saavi122/DayOne", () => {
      const q = "Show me the last 5 commits for saavi122/DayOne";
      const cleaned = cleanQueryText(q, sampleRepoDoc);
      expect(cleaned).toBe("Show me the last 5 commits");
      expect(cleaned).not.toContain("saavi122/DayOne");
    });

    it("should preserve query if repoDoc is not provided", () => {
      const q = "What does server.js do?";
      const cleaned = cleanQueryText(q, null);
      expect(cleaned).toBe(q);
    });
  });

  describe("Intent Detection (detectStructuredGitIntent)", () => {
    it("should classify initial commits queries", () => {
      expect(detectStructuredGitIntent("What initial commits exist in the git history?")).toMatchObject({
        type: "INITIAL_COMMITS",
      });
      expect(detectStructuredGitIntent("Show the first commit")).toMatchObject({
        type: "INITIAL_COMMITS",
      });
      expect(detectStructuredGitIntent("What was the earliest commit?")).toMatchObject({
        type: "INITIAL_COMMITS",
      });
    });

    it("should classify latest commits queries", () => {
      expect(detectStructuredGitIntent("Show me the latest commits")).toMatchObject({
        type: "LATEST_COMMITS",
      });
      expect(detectStructuredGitIntent("What are the last 5 commits?")).toMatchObject({
        type: "LATEST_COMMITS",
        limit: 5,
      });
    });

    it("should classify total commit count queries", () => {
      expect(detectStructuredGitIntent("How many commits are in this repo?")).toMatchObject({
        type: "COMMIT_COUNT",
      });
      expect(detectStructuredGitIntent("What is the total commit count?")).toMatchObject({
        type: "COMMIT_COUNT",
      });
    });

    it("should classify author queries", () => {
      const intent = detectStructuredGitIntent("Show commits by Saavi");
      expect(intent).toMatchObject({
        type: "COMMITS_BY_AUTHOR",
        author: "Saavi",
      });
    });

    it("should classify file history queries", () => {
      const intent = detectStructuredGitIntent("Show commits touching server.js");
      expect(intent).toMatchObject({
        type: "COMMITS_TOUCHING_FILE",
        file: "server.js",
      });
    });

    it("should return null for semantic 'why/how' questions", () => {
      expect(detectStructuredGitIntent("Why was auth changed?")).toBeNull();
      expect(detectStructuredGitIntent("How does the payment flow work?")).toBeNull();
    });
  });

  describe("Structured Git Queries Execution (queryRepositoryKnowledge)", () => {
    beforeEach(() => {
      // Mock mongoose readyState as connected
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1);
    });

    it("1. should answer initial commits query directly from CommitMemory without calling vLLM", async () => {
      // Mock CommitMemory find query for initial commits (sort asc)
      vi.spyOn(CommitMemory, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([sampleCommits[0], sampleCommits[1]]),
          }),
        }),
      });

      const result = await queryRepositoryKnowledge(session, sampleRepoId, "What initial commits exist in the git history of DayOne?", {
        repo: sampleRepoDoc,
      });

      expect(result.grounded).toBe(true);
      expect(result.answer).toContain("initial commits");
      expect(result.answer).toContain("1111111");
      expect(result.answer).toContain("Initial commit: scaffold project structure");
      expect(result.answer).toContain("Saavi");
      expect(result.citations).toHaveLength(2);
      expect(result.citations[0].commitSha).toBe("1111111111111111111111111111111111111111");

      // Structured queries bypass external LLM & vector threshold gates
      expect(vllmService.generateGroundedAnswer).not.toHaveBeenCalled();
    });

    it("2. should answer latest 5 commits query directly from CommitMemory", async () => {
      vi.spyOn(CommitMemory, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([sampleCommits[4], sampleCommits[3], sampleCommits[2], sampleCommits[1], sampleCommits[0]]),
          }),
        }),
      });

      const result = await queryRepositoryKnowledge(session, sampleRepoId, "Show me the last 5 commits for DayOne", {
        repo: sampleRepoDoc,
      });

      expect(result.grounded).toBe(true);
      expect(result.answer).toContain("latest 5 commits");
      expect(result.answer).toContain("5555555");
      expect(result.citations).toHaveLength(5);
      expect(vllmService.generateGroundedAnswer).not.toHaveBeenCalled();
    });

    it("3. should answer total commit count query accurately", async () => {
      vi.spyOn(CommitMemory, "countDocuments").mockResolvedValue(42);
      vi.spyOn(CommitMemory, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([sampleCommits[4]]),
          }),
        }),
      });

      const result = await queryRepositoryKnowledge(session, sampleRepoId, "How many commits exist in DayOne?", {
        repo: sampleRepoDoc,
      });

      expect(result.grounded).toBe(true);
      expect(result.answer).toContain("42");
      expect(result.answer).toContain("recorded commits in its Git history");
      expect(result.citations).toHaveLength(1);
    });

    it("4. should answer commits by author query", async () => {
      const alexCommits = [sampleCommits[2]];
      vi.spyOn(CommitMemory, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(alexCommits),
          }),
        }),
      });

      const result = await queryRepositoryKnowledge(session, sampleRepoId, "Show commits by Alex in DayOne", {
        repo: sampleRepoDoc,
      });

      expect(result.grounded).toBe(true);
      expect(result.answer).toContain("Alex");
      expect(result.answer).toContain("3333333");
      expect(result.answer).toContain("fix: update rate limiter configuration");
      expect(result.citations).toHaveLength(1);
    });

    it("5. should answer semantic 'why was file X changed' with hybrid retrieval and cited commits", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      teiService.getEmbedding.mockResolvedValue(mockEmbedding);

      // Qdrant vector match
      const vectorMatches = [
        {
          id: "c-auth-1",
          score: 0.85,
          payload: {
            chunkId: "c-auth-1",
            path: "server/auth.js",
            filePath: "server/auth.js",
            startLine: 1,
            endLine: 30,
            commitSha: "2222222222222222222222222222222222222222",
            documentType: "CODE",
            text: "import jwt from 'jsonwebtoken'; export function signToken() { ... }",
          },
        },
      ];
      qdrantStore.searchChunks.mockResolvedValue(vectorMatches);
      teiService.rerank.mockResolvedValue(vectorMatches);

      // LLM generates grounded answer citing chunk
      vllmService.generateGroundedAnswer.mockResolvedValue({
        answer: "Authentication was added in commit 2222222 to introduce JWT tokens and password hashing [C1].",
        citedChunkIds: ["C1"],
      });

      const result = await queryRepositoryKnowledge(session, sampleRepoId, "Why was auth changed in DayOne?", {
        repo: sampleRepoDoc,
      });

      expect(result.grounded).toBe(true);
      expect(result.answer).toContain("Authentication was added");
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].path).toBe("server/auth.js");
      expect(result.citations[0].commitSha).toBe("2222222222222222222222222222222222222222");
    });

    it("6. should answer 'Show the main contributor analytics' with contributor share and breakdown", async () => {
      vi.spyOn(CommitMemory, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(sampleCommits),
        }),
      });

      const result = await queryRepositoryKnowledge(session, sampleRepoId, "Show the main contributor analytics.", {
        repo: sampleRepoDoc,
      });

      expect(result.grounded).toBe(true);
      expect(result.type).toBe("contributors");
      expect(result.status).toBe("ok");
      expect(result.answer).toContain("contributor analytics");
      expect(result.answer).toContain("Total Commits: **5**");
      expect(result.answer).toContain("Saavi");
      expect(result.answer).toContain("Alex");
      expect(result.data).toHaveLength(2); // Saavi (4 commits, 80%), Alex (1 commit, 20%)

      const saavi = result.data.find((c) => c.name === "Saavi");
      expect(saavi).toBeDefined();
      expect(saavi.commits).toBe(4);
      expect(saavi.percentage).toBe(80);

      const alex = result.data.find((c) => c.name.includes("Alex"));
      expect(alex).toBeDefined();
      expect(alex.commits).toBe(1);
      expect(alex.percentage).toBe(20);
    });

    it("7. should answer 'Who contributed the most?' by identifying the top contributor", async () => {
      vi.spyOn(CommitMemory, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(sampleCommits),
        }),
      });

      const result = await queryRepositoryKnowledge(session, sampleRepoId, "Who contributed the most?", {
        repo: sampleRepoDoc,
      });

      expect(result.grounded).toBe(true);
      expect(result.type).toBe("contributors");
      expect(result.answer).toContain("Top Contributor: **Saavi**");
    });

    it("8. should handle contributors with null/undefined/object/missing names without throwing error", async () => {
      const anomalousCommits = [
        {
          _id: new mongoose.Types.ObjectId(),
          repository: sampleRepoDoc._id,
          commitSha: "9999999999999999999999999999999999999999",
          author: null,
          authorName: undefined,
          authorEmail: "ghost@example.com",
          authorLogin: null,
          message: "ghost commit without name",
          stats: { additions: 10, deletions: 5, total: 15 },
          committedAt: new Date("2024-01-10T10:00:00Z"),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          repository: sampleRepoDoc._id,
          commitSha: "8888888888888888888888888888888888888888",
          author: { username: "objdev" },
          authorName: null,
          authorEmail: null,
          message: "object author commit",
          stats: { additions: 2, deletions: 1, total: 3 },
          committedAt: new Date("2024-01-11T10:00:00Z"),
        },
      ];

      vi.spyOn(CommitMemory, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(anomalousCommits),
        }),
      });

      // Must NOT throw 'name.replace is not a function' or any TypeError
      const result = await queryRepositoryKnowledge(session, sampleRepoId, "Show the main contributor analytics", {
        repo: { name: { invalid: "objectName" } }, // anomalous repo name as object
      });

      expect(result.grounded).toBe(true);
      expect(result.type).toBe("contributors");
      expect(result.status).toBe("ok");
      expect(result.data).toHaveLength(2);
      expect(result.data.some((c) => c.name === "ghost" || c.name === "objdev" || c.name === "Unknown")).toBe(true);
    });
  });

  describe("Type Handling & toDisplayName Helper", () => {
    it("should safely handle string inputs", () => {
      expect(toDisplayName("Saavi")).toBe("Saavi");
      expect(toDisplayName("  Jane Doe  ")).toBe("Jane Doe");
      expect(toDisplayName("")).toBe("Unknown");
    });

    it("should safely handle null and undefined", () => {
      expect(toDisplayName(null)).toBe("Unknown");
      expect(toDisplayName(undefined)).toBe("Unknown");
      expect(toDisplayName(null, "Anonymous")).toBe("Anonymous");
    });

    it("should safely handle number and boolean inputs", () => {
      expect(toDisplayName(12345)).toBe("12345");
      expect(toDisplayName(0)).toBe("0");
    });

    it("should safely handle object inputs with name, login, email, or author", () => {
      expect(toDisplayName({ name: "Alice" })).toBe("Alice");
      expect(toDisplayName({ authorName: "Bob" })).toBe("Bob");
      expect(toDisplayName({ login: "alicedev" })).toBe("alicedev");
      expect(toDisplayName({ email: "user@domain.com" })).toBe("user@domain.com");
      expect(toDisplayName({ author: "Charlie" })).toBe("Charlie");
    });

    it("should safely fallback for empty or anomalous objects", () => {
      expect(toDisplayName({})).toBe("Unknown");
      expect(toDisplayName({ name: null, login: undefined })).toBe("Unknown");
    });
  });
});
