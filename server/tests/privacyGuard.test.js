import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isLlmAllowed, assertLlmAllowed, PrivacyRefusalError } from "../services/privacyGuard.js";
import { servicesConfig } from "../config/services.js";
import { askQuestion } from "../controllers/chatController.js";
import { employeeChatHandler } from "../routes/employeeDashboardRoutes.js";
import { analyzeCommit, analyzeRepo } from "../controllers/githubAnalyzeController.js";
import { scanRepository } from "../controllers/scanController.js";
import { triggerGenerateReport } from "../controllers/reportController.js";
import { generateGroundedAnswer } from "../services/vllmService.js";
import { generateDriftReport } from "../services/reportService.js";
import { getFileTimeline } from "../controllers/timelineController.js";
import Repository from "../models/Repository.js";
import RepositorySync from "../models/RepositorySync.js";
import KnowledgeQA from "../models/KnowledgeQA.js";
import * as syncQueue from "../services/syncQueue.js";
import * as groundingService from "../services/groundingService.js";
import * as aiService from "../services/aiService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../services/groundingService.js");
vi.mock("../services/qdrantStore.js");
vi.mock("../services/syncQueue.js");

describe("STAGE 1: PRIVACY - Privacy Guard & LLM Access Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(KnowledgeQA, "create").mockResolvedValue({ _id: "qa123" });
  });

  describe("assertLlmAllowed & isLlmAllowed Core Unit Matrix", () => {
    it("1. [DENIED] Private repo is denied when LLM_EXTERNAL=true even if in allowlist", () => {
      const config = { llmExternal: true, demoRepoAllowlist: ["org/private-repo"] };
      const privateRepo = { fullName: "org/private-repo", isPrivate: true };

      expect(isLlmAllowed(privateRepo, config)).toBe(false);
      expect(() => assertLlmAllowed(privateRepo, config)).toThrow(PrivacyRefusalError);
      expect(() => assertLlmAllowed(privateRepo, config)).toThrow("Demo: public repositories only");
    });

    it("2. [DENIED] Public repo not in allowlist is denied when LLM_EXTERNAL=true", () => {
      const config = { llmExternal: true, demoRepoAllowlist: ["org/allowed-repo"] };
      const publicUnlistedRepo = { fullName: "org/unlisted-repo", isPrivate: false };

      expect(isLlmAllowed(publicUnlistedRepo, config)).toBe(false);
      expect(() => assertLlmAllowed(publicUnlistedRepo, config)).toThrow(PrivacyRefusalError);
      expect(() => assertLlmAllowed(publicUnlistedRepo, config)).toThrow("Demo: public repositories only");
    });

    it("3. [DENIED] Empty DEMO_REPO_ALLOWLIST denies everything when LLM_EXTERNAL=true", () => {
      const config = { llmExternal: true, demoRepoAllowlist: [] };
      const publicRepo = { fullName: "saavi122/gigsure", isPrivate: false };

      expect(isLlmAllowed(publicRepo, config)).toBe(false);
      expect(() => assertLlmAllowed(publicRepo, config)).toThrow(PrivacyRefusalError);
      expect(() => assertLlmAllowed(publicRepo, config)).toThrow("Demo: public repositories only");
    });

    it("4. [DENIED] Missing or undefined DEMO_REPO_ALLOWLIST denies everything when LLM_EXTERNAL=true", () => {
      const config = { llmExternal: true, demoRepoAllowlist: undefined };
      const publicRepo = { fullName: "saavi122/gigsure", isPrivate: false };

      expect(isLlmAllowed(publicRepo, config)).toBe(false);
      expect(() => assertLlmAllowed(publicRepo, config)).toThrow(PrivacyRefusalError);
    });

    it("5. [DENIED] Missing privacy flag defaults to private (safe default)", () => {
      const config = { llmExternal: true, demoRepoAllowlist: ["saavi122/gigsure"] };
      const unflaggedRepo = { fullName: "saavi122/gigsure" }; // missing isPrivate

      expect(isLlmAllowed(unflaggedRepo, config)).toBe(false);
      expect(() => assertLlmAllowed(unflaggedRepo, config)).toThrow(PrivacyRefusalError);
    });

    it("6. [PERMITTED] Allowlist parser normalizes trim, lowercase and ignores trailing commas ('Owner/Name, other/repo,')", () => {
      const rawInput = "  Owner/Name ,  other/repo,  ";
      const config = {
        llmExternal: true,
        demoRepoAllowlist: rawInput.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
      };

      expect(config.demoRepoAllowlist).toEqual(["owner/name", "other/repo"]);
      expect(isLlmAllowed({ fullName: "owner/name", isPrivate: false }, config)).toBe(true);
      expect(isLlmAllowed({ fullName: "OTHER/REPO", isPrivate: false }, config)).toBe(true);
      expect(isLlmAllowed({ fullName: "unlisted/repo", isPrivate: false }, config)).toBe(false);
    });

    it("7. [PERMITTED] Any repository is permitted when LLM_EXTERNAL=false", () => {
      const config = { llmExternal: false, demoRepoAllowlist: [] };
      const privateRepo = { fullName: "enterprise/secret-core", isPrivate: true };

      expect(isLlmAllowed(privateRepo, config)).toBe(true);
      expect(() => assertLlmAllowed(privateRepo, config)).not.toThrow();
    });
  });

  describe("Route Enforcement: chatController.askQuestion", () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        params: { repoId: "saavi122/PrivateRepo" },
        body: { question: "Explain auth architecture" },
        user: { id: "u1", company: "comp1" },
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      next = vi.fn();
    });

    it("8. chatController denies private repository with 403 'Demo: public repositories only' and no LLM call", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/privaterepo"];

      vi.spyOn(Repository, "findOne").mockResolvedValueOnce({
        _id: "r1",
        fullName: "saavi122/PrivateRepo",
        isPrivate: true,
      });

      await askQuestion(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Demo: public repositories only",
      });
      expect(groundingService.queryRepositoryKnowledge).not.toHaveBeenCalled();

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });

    it("9. chatController denies unallowlisted public repository with 403 and no LLM call", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/other-repo"];

      vi.spyOn(Repository, "findOne").mockResolvedValueOnce({
        _id: "r1",
        fullName: "saavi122/PublicUnlisted",
        isPrivate: false,
      });

      req.params.repoId = "saavi122/PublicUnlisted";
      await askQuestion(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Demo: public repositories only",
      });
      expect(groundingService.queryRepositoryKnowledge).not.toHaveBeenCalled();

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });
  });

  describe("Route Enforcement: POST /api/employee/chat", () => {
    it("10. employeeChatHandler denies unallowlisted repository with 403 and makes NO LLM call", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/allowed-repo"];

      const req = {
        body: { question: "What is the auth flow?", repoId: "r_unlisted" },
        user: { id: "emp1", company: "comp1" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      vi.spyOn(Repository, "findOne").mockResolvedValueOnce({
        _id: "r_unlisted",
        fullName: "saavi122/unlisted-repo",
        isPrivate: false,
      });

      await employeeChatHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Demo: public repositories only",
      });
      expect(groundingService.queryRepositoryKnowledge).not.toHaveBeenCalled();

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });
  });

  describe("Route Enforcement: POST /api/github/analyze-commit & analyze-repo", () => {
    it("11. analyzeCommit denies unallowlisted repository with 403 and makes NO LLM call", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/allowed-repo"];

      const req = {
        body: { username: "saavi122", repoName: "forbidden-repo", commitSha: "abc1234" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await analyzeCommit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Demo: public repositories only",
      });

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });

    it("12. analyzeRepo denies unallowlisted repository with 403 and makes NO LLM call", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/allowed-repo"];

      const req = {
        body: { username: "saavi122", repoName: "forbidden-repo" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await analyzeRepo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Demo: public repositories only",
      });

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });
  });

  describe("Route Enforcement: POST /api/scan/:repoId", () => {
    it("13. scanRepository denies unallowlisted repository with 403 and does not enqueue sync", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/allowed-repo"];

      const req = {
        params: { repoId: "650000000000000000000001" },
        user: { id: "u1", company: "comp1" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      vi.spyOn(Repository, "findOne").mockResolvedValueOnce({
        _id: "650000000000000000000001",
        fullName: "saavi122/unlisted-repo",
        isPrivate: false,
        save: vi.fn(),
      });

      await scanRepository(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Demo: public repositories only",
      });
      expect(syncQueue.enqueueSyncJob).not.toHaveBeenCalled();

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });
  });

  describe("Route Enforcement: reportController & reportService", () => {
    it("14. reportController.triggerGenerateReport denies unallowlisted repository with 403", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/allowed-repo"];

      const req = {
        user: { company: "comp1" },
        body: { repositoryId: "650000000000000000000001", reportType: "DRIFT" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      vi.spyOn(Repository, "findOne").mockResolvedValueOnce({
        _id: "650000000000000000000001",
        fullName: "saavi122/unlisted-repo",
        isPrivate: false,
      });

      await triggerGenerateReport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Demo: public repositories only",
      });

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });

    it("15. reportService.generateDriftReport throws PrivacyRefusalError for unallowlisted repo", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/allowed-repo"];

      vi.spyOn(Repository, "findById").mockResolvedValueOnce({
        _id: "650000000000000000000001",
        fullName: "saavi122/unlisted-repo",
        isPrivate: false,
      });

      const authContext = { companyId: "comp1" };
      await expect(
        generateDriftReport({ authContext, repositoryId: "650000000000000000000001", targetPath: "README.md" })
      ).rejects.toThrow("Demo: public repositories only");

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });
  });

  describe("Last Line of Defense: vllmService.generateGroundedAnswer", () => {
    it("16. vllmService refuses generation when passed unallowlisted repo identity", async () => {
      const originalExternal = servicesConfig.llmExternal;
      const originalList = servicesConfig.demoRepoAllowlist;
      servicesConfig.llmExternal = true;
      servicesConfig.demoRepoAllowlist = ["saavi122/allowed-repo"];

      await expect(
        generateGroundedAnswer("How does this work?", [], {
          repo: { fullName: "saavi122/unlisted-repo", isPrivate: false },
        })
      ).rejects.toThrow("Demo: public repositories only");

      servicesConfig.llmExternal = originalExternal;
      servicesConfig.demoRepoAllowlist = originalList;
    });

    it("17. vllmService refuses generation when LLM_EXTERNAL=true and no repo identity is provided", async () => {
      const originalExternal = servicesConfig.llmExternal;
      servicesConfig.llmExternal = true;

      await expect(
        generateGroundedAnswer("How does this work?", [])
      ).rejects.toThrow("Demo: public repositories only");

      servicesConfig.llmExternal = originalExternal;
    });
  });

  describe("Static Architectural Guard: LLM Import Whitelist", () => {
    it("18. No unwhitelisted module under server/ may import vllmService or aiService directly", () => {
      const serverDir = path.resolve(__dirname, "..");
      const ALLOWED_MODULES = [
        "services/groundingService.js",
        "services/reportService.js",
        "services/aiService.js",
        "services/vllmService.js",
        "controllers/timelineController.js",
        "controllers/githubAnalyzeController.js",
        "controllers/scanController.js",
      ];

      function scanDir(dir) {
        let violations = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(serverDir, fullPath).replace(/\\/g, "/");

          if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== "tests" && entry.name !== "scripts") {
              violations = violations.concat(scanDir(fullPath));
            }
          } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const importsLlm =
              /import\s+.*?from\s+["'].*?(vllmService|aiService)["']/i.test(content) ||
              /require\(["'].*?(vllmService|aiService)["']\)/i.test(content);

            if (importsLlm && !ALLOWED_MODULES.includes(relPath)) {
              violations.push(relPath);
            }
          }
        }
        return violations;
      }

      const violations = scanDir(serverDir);
      expect(violations).toEqual([]);
    });
  });
});
