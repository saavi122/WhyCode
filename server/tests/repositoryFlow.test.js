import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

// Mocks
vi.mock("../models/GitHubConnection.js", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("../models/Repository.js", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../services/githubApp.js", () => ({
  createAppJwt: vi.fn().mockReturnValue("mock_jwt"),
  getInstallationToken: vi.fn().mockResolvedValue("mock_inst_token"),
}));

vi.mock("../models/RepositorySync.js", () => ({
  default: {
    create: vi.fn().mockResolvedValue({ _id: "sync_123", status: "PENDING", step: "QUEUED" }),
    findOne: vi.fn(),
  },
}));

vi.mock("../services/syncQueue.js", () => ({
  enqueueSyncJob: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));
import axios from "axios";
import GitHubConnection from "../models/GitHubConnection.js";
import Repository from "../models/Repository.js";
import {
  getRepositories,
  getConnectedRepositories,
  connectRepositoryById,
} from "../controllers/githubAppController.js";

describe("Repository Listing and Connection Flow", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        company: new mongoose.Types.ObjectId().toString(),
        role: "company",
      },
      query: {},
      params: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    Repository.find.mockImplementation(() => ({ select: vi.fn().mockResolvedValue([]) }));
  });

  describe("GET /api/github/repositories", () => {
    it("should return 403 if user is not a company admin", async () => {
      req.user.role = "employee";
      await getRepositories(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Access denied") })
      );
    });

    it("should return 400 if GitHub App connection is not found", async () => {
      GitHubConnection.findOne.mockResolvedValue(null);
      await getRepositories(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should list repositories from GitHub and indicate alreadyConnected status", async () => {
      const companyId = req.user.company;
      GitHubConnection.findOne.mockResolvedValue({
        companyId,
        installationId: "12345",
        status: "CONNECTED",
      });

      axios.get.mockResolvedValue({
        data: {
          repositories: [
            {
              id: 101,
              name: "repo-a",
              full_name: "org/repo-a",
              private: false,
              description: "Repo A desc",
              default_branch: "main",
              html_url: "https://github.com/org/repo-a",
              owner: { login: "org" },
            },
            {
              id: 102,
              name: "repo-b",
              full_name: "org/repo-b",
              private: true,
              description: "Repo B desc",
              default_branch: "main",
              html_url: "https://github.com/org/repo-b",
              owner: { login: "org" },
            },
          ],
        },
      });

      Repository.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([{ githubRepositoryId: 101, fullName: "org/repo-a" }]),
      });

      await getRepositories(req, res, next);

      expect(res.json).toHaveBeenCalledWith([
        {
          id: 101,
          owner: "org",
          name: "repo-a",
          fullName: "org/repo-a",
          private: false,
          description: "Repo A desc",
          defaultBranch: "main",
          htmlUrl: "https://github.com/org/repo-a",
          alreadyConnected: true,
        },
        {
          id: 102,
          owner: "org",
          name: "repo-b",
          fullName: "org/repo-b",
          private: true,
          description: "Repo B desc",
          defaultBranch: "main",
          htmlUrl: "https://github.com/org/repo-b",
          alreadyConnected: false,
        },
      ]);
    });

    it("should filter repositories by search query server-side", async () => {
      req.query.search = "repo-b";
      GitHubConnection.findOne.mockResolvedValue({
        companyId: req.user.company,
        installationId: "12345",
        status: "CONNECTED",
      });

      axios.get.mockResolvedValue({
        data: {
          repositories: [
            { id: 101, name: "repo-a", full_name: "org/repo-a", owner: { login: "org" } },
            { id: 102, name: "repo-b", full_name: "org/repo-b", owner: { login: "org" } },
          ],
        },
      });

      Repository.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      });

      await getRepositories(req, res, next);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(102);
    });
  });

  describe("POST /api/github/repositories/:githubRepositoryId/connect", () => {
    it("should return 403 if user is not a company admin", async () => {
      req.user.role = "employee";
      req.params.githubRepositoryId = "101";
      await connectRepositoryById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should reject made-up/inaccessible repository ID with 404/403", async () => {
      req.params.githubRepositoryId = "999999";
      GitHubConnection.findOne.mockResolvedValue({
        companyId: req.user.company,
        installationId: "12345",
        status: "CONNECTED",
      });

      axios.get.mockRejectedValue({
        response: { status: 404, data: { message: "Not Found" } },
      });

      Repository.findOne.mockResolvedValue(null);

      await connectRepositoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("WhyCode no longer has access") })
      );
    });

    it("should return existing record on duplicate connect without creating a new record", async () => {
      req.params.githubRepositoryId = "101";
      GitHubConnection.findOne.mockResolvedValue({
        companyId: req.user.company,
        installationId: "12345",
        status: "CONNECTED",
      });

      axios.get.mockResolvedValue({
        data: {
          id: 101,
          name: "repo-a",
          full_name: "org/repo-a",
          private: false,
          description: "Repo A",
          default_branch: "main",
          owner: { login: "org" },
        },
      });

      const existingRecord = {
        _id: "repo_db_id",
        companyId: req.user.company,
        githubRepositoryId: 101,
        fullName: "org/repo-a",
        status: "active",
        save: vi.fn(),
      };
      Repository.findOne.mockResolvedValue(existingRecord);

      await connectRepositoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(existingRecord);
      expect(Repository.create).not.toHaveBeenCalled();
    });

    it("should create new repository with data fetched from GitHub", async () => {
      req.params.githubRepositoryId = "101";
      GitHubConnection.findOne.mockResolvedValue({
        _id: "conn_1",
        companyId: req.user.company,
        installationId: "12345",
        status: "CONNECTED",
      });

      axios.get.mockResolvedValue({
        data: {
          id: 101,
          name: "repo-a",
          full_name: "org/repo-a",
          private: true,
          description: "Real Repo A",
          default_branch: "main",
          html_url: "https://github.com/org/repo-a",
          owner: { login: "org" },
          language: "TypeScript",
        },
      });

      Repository.findOne.mockResolvedValue(null);
      const createdRecord = {
        _id: "new_repo_id",
        companyId: req.user.company,
        githubRepositoryId: 101,
        fullName: "org/repo-a",
        status: "active",
      };
      Repository.create.mockResolvedValue(createdRecord);

      await connectRepositoryById(req, res, next);

      expect(Repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: req.user.company,
          githubRepositoryId: 101,
          owner: "org",
          name: "repo-a",
          fullName: "org/repo-a",
          private: true,
          status: "active",
          syncStatus: "NOT_SYNCED",
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdRecord);
    });
  });

  describe("GET /api/github/repositories/connected", () => {
    it("should list connected repositories for requesting company only (multi-tenant isolation)", async () => {
      const companyId = req.user.company;
      const repos = [
        { _id: "r1", companyId, fullName: "org/repo-1" },
        { _id: "r2", companyId, fullName: "org/repo-2" },
      ];
      Repository.find.mockResolvedValue(repos);

      await getConnectedRepositories(req, res, next);

      expect(Repository.find).toHaveBeenCalledWith({ companyId });
      expect(res.json).toHaveBeenCalledWith(repos);
    });
  });

  describe("POST /api/github/repositories/:owner/:repo/sync", () => {
    it("should resolve repository by owner and repo params and enqueue sync job", async () => {
      req.params = { owner: "saavi122", repo: "DayOne" };
      const companyId = req.user.company;
      const targetRepo = {
        _id: "repo_object_id_123",
        fullName: "saavi122/DayOne",
        companyId,
      };

      Repository.findOne.mockResolvedValue(targetRepo);

      const { triggerRepositorySync } = await import("../controllers/githubAppController.js");
      await triggerRepositorySync(req, res, next);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Sync job enqueued successfully.",
        })
      );
    });
  });
});
