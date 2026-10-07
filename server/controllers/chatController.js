import KnowledgeQA from "../models/KnowledgeQA.js";
import Repository from "../models/Repository.js";
import mongoose from "mongoose";
import { servicesConfig } from "../config/services.js";
import { assertExternalLlmAllowed } from "../middleware/demoGuard.js";
import { queryRepositoryKnowledge } from "../services/groundingService.js";
import { getCachedDemoAnswer } from "../services/demoCacheService.js";
import { validateTenantContext } from "../services/tenantGuard.js";
import { countPoints } from "../services/qdrantStore.js";
import { logInfo, logError } from "../utils/logger.js";

/**
 * Handles RAG knowledge question queries for a repository under strict multi-tenant context.
 */
export const askQuestion = async (req, res, next) => {
  const { repoId } = req.params;
  const { question } = req.body;

  logInfo("[CHAT] request received", { repoId, question: question ? question.slice(0, 100) : "" });
  console.log("[CHAT] request received");

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ message: "Question is required", code: "BAD_REQUEST" });
  }

  // Question length cap (default: 500 characters)
  const maxLen = Number(process.env.MAX_QUESTION_LENGTH) || 500;
  if (question.trim().length > maxLen) {
    return res.status(400).json({
      message: `Question exceeds maximum allowed length of ${maxLen} characters.`,
      code: "QUESTION_TOO_LONG",
    });
  }

  const companyId = req.user?.company || req.user?.companyId;

  // Resolve repository from MongoDB under tenant isolation
  const tenantFilter = companyId
    ? { $or: [{ companyId }, { company: companyId }, { owner: req.user.id || req.user._id }] }
    : { owner: req.user.id || req.user._id };

  let repo = null;
  if (mongoose.Types.ObjectId.isValid(repoId)) {
    repo = await Repository.findOne({ _id: repoId, ...tenantFilter });
  }
  if (!repo) {
    repo = await Repository.findOne({ fullName: repoId, ...tenantFilter });
  }
  if (!repo) {
    repo = await Repository.findOne({ name: repoId, ...tenantFilter });
  }
  if (!repo) {
    repo = await Repository.findOne({ repoName: repoId, ...tenantFilter });
  }

  if (!repo) {
    logError("[CHAT] repository resolution failed", { repoId, companyId });
    console.log("[CHAT] repository resolution failed");
    return res.status(404).json({ message: "Repository not found or access denied.", code: "REPOSITORY_NOT_FOUND" });
  }

  const resolvedRepoId = repo._id.toString();
  logInfo("[CHAT] repository resolved", { repositoryId: resolvedRepoId, fullName: repo.fullName });
  console.log("[CHAT] repository resolved");

  // Privacy Policy: when LLM_EXTERNAL=true refuse to answer for private repositories or repos not in allowlist
  if (!assertExternalLlmAllowed(repo, res)) {
    logInfo("[PRIVACY] External LLM refusal triggered for repository", {
      repoId: repo._id,
      fullName: repo.fullName,
    });
    return;
  }

  try {
    // Auth session context (req.user carries company / companyId)
    validateTenantContext(req.user, resolvedRepoId);
    console.log("[CHAT] tenant validated");

    let result = null;

    // Check demo cache if DEMO_MODE or as instant suggested answer
    if (servicesConfig.demoMode || process.env.ENABLE_DEMO_CACHE === "true") {
      const cached = getCachedDemoAnswer(question);
      if (cached) {
        result = { ...cached, cached: true };
      }
    }

    if (!result) {
      result = await queryRepositoryKnowledge(req.user, resolvedRepoId, question, {
        temperature: 0,
        minScoreThreshold: 0.3,
      });
    }

    console.log("[CHAT] KnowledgeQA save");
    const saved = await KnowledgeQA.create({
      repository: repo._id,
      askedBy: req.user._id || req.user.id,
      question,
      answer: result.answer,
      sources: (result.citations || result.sources || []).map((c) => ({
        type: c.type || "file",
        reference: c.reference || (c.path ? `${c.path}#L${c.lineRange?.[0] || 1}-L${c.lineRange?.[1] || 1}` : (c.commitSha || "")),
        excerpt: c.url || c.excerpt || "",
      })),
      confidence: result.grounded ? 95 : 0,
    });

    res.json({
      ...result,
      id: saved._id,
    });
  } catch (err) {
    const errorCompanyId = companyId ? String(companyId) : (req.user?.company ? String(req.user.company) : undefined);
    logError("[CHAT] Error asking question", {
      errorMessage: err.message,
      stack: err.stack,
      repositoryId: resolvedRepoId,
      companyId: errorCompanyId,
    });

    // If answer model, TEI, or Qdrant is unreachable or timed out, return friendly 503 without hallucinating
    if (
      err.message?.includes("Answer model is not running") ||
      err.message?.includes("timeout") ||
      err.message?.includes("unreachable") ||
      err.code === "ECONNREFUSED" ||
      err.code === "CIRCUIT_BREAKER_OPEN" ||
      err.code === "LLM_UNREACHABLE"
    ) {
      return res.status(503).json({
        message: "Inference or search service is temporarily unavailable. Please try again shortly.",
        code: "SERVICE_UNAVAILABLE",
        grounded: false,
      });
    }

    res.status(500).json({
      message: err.message || "An error occurred while querying repository knowledge.",
      code: "RAG_SERVICE_ERROR",
    });
  }
};

