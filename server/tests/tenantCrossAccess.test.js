import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../models/Repository.js", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("../models/KnowledgeQA.js", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("../models/Report.js", () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../models/CommitMemory.js", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("../models/RepositorySync.js", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("../services/syncQueue.js", () => ({
  enqueueSyncJob: vi.fn().mockResolvedValue("job_123"),
}));

vi.mock("../services/groundingService.js", () => ({
  queryRepositoryKnowledge: vi.fn(),
  INSUFFICIENT_EVIDENCE_MESSAGE: "I couldn't find sufficient evidence in the connected repository.",
}));

vi.mock("../middleware/demoGuard.js", () => ({
  assertExternalLlmAllowed: vi.fn().mockReturnValue(true),
}));

vi.mock("../config/services.js", () => ({
  servicesConfig: {
    demoMode: false,
    llmExternal: false,
    demoRepoAllowlist: [],
    maxQuestionLength: 500,
  },
  validateProductionConfig: vi.fn(),
}));

import Repository from "../models/Repository.js";
import { askQuestion } from "../controllers/chatController.js";
import { employeeChatHandler } from "../routes/employeeDashboardRoutes.js";
import { triggerGenerateReport } from "../controllers/reportController.js";
import { scanRepository } from "../controllers/scanController.js";
import { getRepoTimeline } from "../controllers/timelineController.js";

describe("Tenant Cross-Access Route-Level Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const companyAUser = {
    _id: "user_A",
    id: "user_A",
    company: "company_A",
    companyId: "company_A",
    role: "employee",
  };

  const companyBRepoId = "65000000000000000000000b";

  it("1. /api/chat/:repoId returns 404 when User A queries Company B repository", async () => {
    Repository.findOne.mockImplementation(() => {
      const query = {
        sort: vi.fn().mockResolvedValue(null),
        then: (resolve) => resolve(null),
      };
      return query;
    });

    const req = {
      params: { repoId: companyBRepoId },
      body: { question: "What is the secret architecture?" },
      user: companyAUser,
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    await askQuestion(req, res, () => {});

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe("REPOSITORY_NOT_FOUND");
    expect(Repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: companyBRepoId,
        $or: expect.arrayContaining([{ companyId: "company_A" }, { company: "company_A" }]),
      })
    );
  });

  it("2. /api/employee/chat returns safe refusal when Employee of Company A specifies Company B repoId", async () => {
    Repository.findOne.mockImplementation(() => {
      const query = {
        sort: vi.fn().mockResolvedValue(null),
        then: (resolve) => resolve(null),
      };
      return query;
    });

    const req = {
      body: { question: "Show secrets", repoId: companyBRepoId },
      user: companyAUser,
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    await employeeChatHandler(req, res, () => {});

    expect(res.body.answer).toContain("couldn't find sufficient evidence");
  });

  it("3. /api/reports/generate returns 404 when Company A requests report for Company B repo", async () => {
    Repository.findOne.mockImplementation(() => {
      const query = {
        sort: vi.fn().mockResolvedValue(null),
        then: (resolve) => resolve(null),
      };
      return query;
    });

    const req = {
      body: { repositoryId: companyBRepoId, reportType: "DRIFT" },
      user: companyAUser,
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    await triggerGenerateReport(req, res, () => {});

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain("Repository not found or unauthorized");
  });

  it("4. /api/scan/:repoId returns 404 when Company A initiates sync/scan for Company B repo", async () => {
    Repository.findOne.mockImplementation(() => {
      const query = {
        sort: vi.fn().mockResolvedValue(null),
        then: (resolve) => resolve(null),
      };
      return query;
    });

    const req = {
      params: { repoId: companyBRepoId },
      user: companyAUser,
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    await scanRepository(req, res, () => {});

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain("Repository not found or access denied");
  });

  it("5. /api/timeline/:repoId returns 404 when Company A accesses timeline for Company B repo", async () => {
    Repository.findOne.mockImplementation(() => {
      const query = {
        sort: vi.fn().mockResolvedValue(null),
        then: (resolve) => resolve(null),
      };
      return query;
    });

    const req = {
      params: { repoId: companyBRepoId },
      user: companyAUser,
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    await getRepoTimeline(req, res, () => {});

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain("Repository not found or access denied");
  });
});
