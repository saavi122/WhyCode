import Repository from "../models/Repository.js";
import Drift from "../models/Drift.js";
import CommitMemory from "../models/CommitMemory.js";
import KnowledgeQA from "../models/KnowledgeQA.js";
import RepositorySync from "../models/RepositorySync.js";
import RepositoryChunk from "../models/RepositoryChunk.js";
import PullRequest from "../models/PullRequest.js";
import { deleteRepositoryChunks } from "../services/qdrantStore.js";
import * as githubService from "../services/githubService.js";

// GET /api/repositories
export const getRepositories = async (req, res, next) => {
  try {
    const companyId = req.user.company || req.user.companyId;
    const filter = companyId
      ? {
          $or: [
            { companyId },
            { company: companyId },
            { owner: req.user.id },
          ],
        }
      : { owner: req.user.id };

    const repos = await Repository.find(filter).sort({ createdAt: -1 });

    // Add openDriftCount to each repository object
    const reposWithDriftCount = await Promise.all(
      repos.map(async (repo) => {
        const openDriftCount = await Drift.countDocuments({
          repository: repo._id,
          status: "open",
        });
        return {
          ...repo.toObject(),
          repoName: repo.repoName || repo.name,
          openDriftCount,
        };
      })
    );

    res.json(reposWithDriftCount);
  } catch (err) {
    next(err);
  }
};

// POST /api/repositories
export const registerRepository = async (req, res, next) => {
  try {
    const { fullName } = req.body; // e.g. "octocat/Hello-World"
    if (!fullName) {
      return res.status(400).json({ message: "fullName is required" });
    }
    const [ownerName, repoName] = fullName.split("/");
    if (!ownerName || !repoName) {
      return res.status(400).json({ message: "Invalid fullName format, must be owner/repo" });
    }

    const token = req.user.githubAccessToken || "mock-token-xyz";
    const meta = await githubService.fetchRepoMeta(token, ownerName, repoName);
    if (!meta) {
      return res.status(400).json({ message: "Repo not found or no access" });
    }

    const companyId = req.user.company;

    // Check duplicate
    const duplicate = await Repository.findOne({
      fullName: meta.full_name,
      ...(companyId
        ? { $or: [{ companyId }, { company: companyId }, { owner: req.user.id }] }
        : { owner: req.user.id }),
    });
    if (duplicate) {
      return res.status(409).json({ message: "Repository already connected" });
    }

    const repo = await Repository.create({
      companyId,
      company: companyId,
      owner: ownerName,
      name: repoName,
      repoName: repoName,
      fullName: meta.full_name,
      githubRepositoryId: meta.id,
      htmlUrl: meta.html_url || `https://github.com/${meta.full_name}`,
      defaultBranch: meta.default_branch || "main",
      language: meta.language || "JavaScript",
      private: Boolean(meta.private),
      description: meta.description || "",
      status: "active",
      syncStatus: "NOT_SYNCED",
    });

    res.status(201).json(repo);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/repositories/:repoId
export const deleteRepository = async (req, res, next) => {
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
      return res.status(404).json({ message: "Repository not found or unauthorized" });
    }

    const resolvedCompanyId = repo.companyId?.toString() || repo.company?.toString() || companyId?.toString();

    // 1. Delete Qdrant vectors
    if (resolvedCompanyId) {
      try {
        await deleteRepositoryChunks(
          { companyId: resolvedCompanyId },
          repo._id.toString(),
          "repository_chunks"
        );
      } catch (qErr) {
        // Log but continue DB cleanup
      }
    }

    // 2. Cascade delete all MongoDB records and background jobs
    await Promise.all([
      Repository.deleteOne({ _id: repoId }),
      RepositorySync.deleteMany({ repositoryId: repoId }),
      RepositoryChunk.deleteMany({ repositoryId: repoId }),
      PullRequest.deleteMany({ repositoryId: repoId }),
      Drift.deleteMany({ repository: repoId }),
      CommitMemory.deleteMany({ repository: repoId }),
      KnowledgeQA.deleteMany({ repository: repoId }),
    ]);

    res.json({ message: "Repository and all associated vector chunks and records deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/repositories/risk/:repoId (legacy / compatibility)
export const getRepoRisk = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json({
      repoId: repo._id,
      fullName: repo.fullName,
      docHealthScore: repo.docHealthScore,
      knowledgeCoverage: repo.knowledgeCoverage,
      busFactor: repo.busFactor,
      riskMetrics: {
        undocumentedFilesRisk: repo.docHealthScore < 50 ? "high" : repo.docHealthScore < 80 ? "medium" : "low",
        keyPersonDependency: repo.busFactor <= 2 ? "high" : repo.busFactor <= 4 ? "medium" : "low",
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/repositories/github-list — fetch real GitHub repos for connected account
export const getGitHubRepos = async (req, res, next) => {
  try {
    const token = req.user.githubAccessToken;
    if (!token) {
      return res.status(400).json({
        message: "GitHub account not connected. Click 'Connect GitHub' to link your account first.",
        notConnected: true,
      });
    }

    // Fetch all user repos (including org repos) from GitHub API
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CodeMemory-App",
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(400).json({
        message: errData.message || "Failed to fetch GitHub repositories. Token may be expired.",
        notConnected: true,
      });
    }

    const repos = await response.json();

    const companyId = req.user.company;
    const connectedRepos = await Repository.find(
      companyId
        ? { $or: [{ companyId }, { company: companyId }, { owner: req.user.id }] }
        : { owner: req.user.id }
    ).select("fullName");
    const connectedSet = new Set(connectedRepos.map((r) => r.fullName));

    const simplified = repos.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      private: r.private,
      language: r.language,
      defaultBranch: r.default_branch,
      description: r.description,
      updatedAt: r.updated_at,
      stargazersCount: r.stargazers_count,
      isConnected: connectedSet.has(r.full_name),
    }));

    res.json(simplified);
  } catch (err) {
    next(err);
  }
};

// GET /api/repositories/:repoId/activity
export const getRepoActivity = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const companyId = req.user.company || req.user.companyId;
    const repo = await Repository.findOne({
      _id: repoId,
      ...(companyId
        ? { $or: [{ companyId }, { company: companyId }, { owner: req.user.id }] }
        : { owner: req.user.id }),
    });

    if (!repo) {
      return res.status(404).json({ message: "Repository not found or unauthorized" });
    }

    const filter = { repository: repo._id };
    const total = await CommitMemory.countDocuments(filter);
    const commits = await CommitMemory.find(filter)
      .sort({ committedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      commits: commits.map((c) => {
        const displayAuthor = (c.authorLogin && c.authorLogin !== "unknown")
          ? c.authorLogin
          : ((c.authorName && c.authorName !== "unknown")
            ? c.authorName
            : (c.author && c.author !== "unknown" ? c.author : "unknown"));

        return {
          _id: c._id,
          sha: c.commitSha,
          commitSha: c.commitSha,
          message: c.message || c.summary || "",
          authorName: displayAuthor,
          authorLogin: c.authorLogin || null,
          authorEmail: c.authorEmail || null,
          avatarUrl: c.avatarUrl || null,
          committedAt: c.committedAt || c.createdAt,
          htmlUrl: c.htmlUrl || (repo.htmlUrl ? `${repo.htmlUrl}/commit/${c.commitSha}` : ""),
          filesChanged: c.filesChanged || [],
          linesAdded: c.linesAdded,
          linesDeleted: c.linesDeleted,
          summary: c.summary,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      syncStatus: repo.syncStatus,
      repoStatus: repo.status,
    });
  } catch (err) {
    next(err);
  }
};

