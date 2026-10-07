import { describe, it, expect, vi, beforeEach } from "vitest";
import { askQuestion } from "../controllers/chatController.js";
import Repository from "../models/Repository.js";
import KnowledgeQA from "../models/KnowledgeQA.js";
import * as groundingService from "../services/groundingService.js";

vi.mock("../models/Repository.js");
vi.mock("../models/KnowledgeQA.js");
vi.mock("../services/groundingService.js");

describe("chatController - askQuestion", () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: { repoId: "saavi122/DayOne" },
      body: { question: "How does auth work?" },
      user: {
        id: "user123",
        _id: "user123",
        company: "comp123",
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it("should return 400 if question is missing", async () => {
    req.body.question = "";
    await askQuestion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Question is required",
      code: "BAD_REQUEST",
    });
  });

  it("should return 404 if repository is not found for tenant", async () => {
    Repository.findOne.mockResolvedValueOnce(null);

    await askQuestion(req, res, next);

    expect(Repository.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Repository not found or access denied.",
      code: "REPOSITORY_NOT_FOUND",
    });
  });

  it("should resolve repository by owner/repo string and save KnowledgeQA with ObjectId", async () => {
    const mockRepo = {
      _id: "650000000000000000000001",
      fullName: "saavi122/DayOne",
      companyId: "comp123",
    };
    Repository.findOne.mockResolvedValueOnce(mockRepo);

    groundingService.queryRepositoryKnowledge.mockResolvedValueOnce({
      answer: "Auth uses JWT tokens.",
      citations: [{ path: "server/auth.js", lineRange: [1, 20], url: "http://github.com" }],
      grounded: true,
    });

    KnowledgeQA.create.mockResolvedValueOnce({ _id: "qa123" });

    await askQuestion(req, res, next);

    expect(groundingService.queryRepositoryKnowledge).toHaveBeenCalledWith(
      req.user,
      "650000000000000000000001",
      "How does auth work?",
      expect.any(Object)
    );

    expect(KnowledgeQA.create).toHaveBeenCalledWith({
      repository: mockRepo._id,
      askedBy: "user123",
      question: "How does auth work?",
      answer: "Auth uses JWT tokens.",
      sources: [
        {
          type: "file",
          reference: "server/auth.js#L1-L20",
          excerpt: "http://github.com",
        },
      ],
      confidence: 95,
    });

    expect(res.json).toHaveBeenCalledWith({
      answer: "Auth uses JWT tokens.",
      citations: [{ path: "server/auth.js", lineRange: [1, 20], url: "http://github.com" }],
      grounded: true,
      id: "qa123",
    });
  });

  it("should return insufficient evidence response cleanly without 500", async () => {
    const mockRepo = {
      _id: "650000000000000000000001",
      fullName: "saavi122/DayOne",
      companyId: "comp123",
    };
    Repository.findOne.mockResolvedValueOnce(mockRepo);

    groundingService.queryRepositoryKnowledge.mockResolvedValueOnce({
      answer: groundingService.INSUFFICIENT_EVIDENCE_MESSAGE,
      citations: [],
      grounded: false,
    });

    KnowledgeQA.create.mockResolvedValueOnce({ _id: "qa124" });

    await askQuestion(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      answer: groundingService.INSUFFICIENT_EVIDENCE_MESSAGE,
      citations: [],
      grounded: false,
      id: "qa124",
    });
  });

  it("should return safe JSON 500 error when queryRepositoryKnowledge throws error", async () => {
    const mockRepo = {
      _id: "650000000000000000000001",
      fullName: "saavi122/DayOne",
      companyId: "comp123",
    };
    Repository.findOne.mockResolvedValueOnce(mockRepo);
    groundingService.queryRepositoryKnowledge.mockRejectedValueOnce(new Error("Database connection lost"));

    await askQuestion(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Database connection lost",
      code: "RAG_SERVICE_ERROR",
    });
  });
});
