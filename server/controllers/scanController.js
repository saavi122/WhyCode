import Repository from "../models/Repository.js";
import RepositorySync from "../models/RepositorySync.js";
import { enqueueSyncJob } from "../services/syncQueue.js";
import { assertExternalLlmAllowed } from "../middleware/demoGuard.js";
import { logInfo, logError } from "../utils/logger.js";

// POST /api/scan/:repoId
export const scanRepository = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const companyId = req.user.company;

    const repo = await Repository.findOne({
      _id: repoId,
      ...(companyId
        ? { $or: [{ companyId }, { company: companyId }, { owner: req.user.id }] }
        : { owner: req.user.id }),
    });

    if (!repo) return res.status(404).json({ message: "Repository not found or access denied." });

    if (!assertExternalLlmAllowed(repo, res)) {
      return;
    }

    // Ensure missing required schema fields are populated on legacy records
    const [ownerName, repoName] = (repo.fullName || "owner/repo").split("/");
    if (!repo.name) repo.name = repoName || "repo";
    if (!repo.repoName) repo.repoName = repo.name;
    if (!repo.githubRepositoryId) repo.githubRepositoryId = repo.githubRepoId || 100000;
    if (!repo.companyId && companyId) repo.companyId = companyId;
    if (!repo.company && companyId) repo.company = companyId;

    repo.status = "scanning";
    repo.syncStatus = "SYNCING";
    await repo.save({ validateModifiedOnly: true });

    logInfo("[SCAN] started via unified sync pipeline", { repoId: repo._id, fullName: repo.fullName });

    // Create a unified RepositorySync job and enqueue for background processing
    const syncRecord = await RepositorySync.create({
      companyId: repo.companyId || companyId,
      repositoryId: repo._id,
      status: "PENDING",
      step: "QUEUED",
      syncType: "MANUAL",
    });

    await enqueueSyncJob(syncRecord._id.toString());

    res.status(202).json({
      message: "Scan initiated",
      repoId: repo._id,
      status: "scanning",
      syncId: syncRecord._id,
    });
  } catch (err) {
    next(err);
  }
};

function extractDocBlock(content, filePath) {
  if (filePath.endsWith(".md")) {
    return content.slice(0, 500);
  }
  const jsMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  if (jsMatch) return jsMatch[0];

  const pyMatch = content.match(/"""[\s\S]*?"""/);
  if (pyMatch) return pyMatch[0];

  return "";
}

// GET /api/scan/:repoId/status
export const getScanStatus = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const companyId = req.user.company;

    const repo = await Repository.findOne({
      _id: repoId,
      ...(companyId
        ? { $or: [{ companyId }, { company: companyId }, { owner: req.user.id }] }
        : { owner: req.user.id }),
    });

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json({
      status: repo.status,
      lastScanAt: repo.lastScanAt,
      docHealthScore: repo.docHealthScore,
      busFactor: repo.busFactor,
      knowledgeCoverage: repo.knowledgeCoverage,
    });
  } catch (err) {
    next(err);
  }
};
