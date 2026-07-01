import Repository from "../models/Repository.js";
import Drift from "../models/Drift.js";
import CommitMemory from "../models/CommitMemory.js";
import KnowledgeQA from "../models/KnowledgeQA.js";
import * as githubService from "../services/githubService.js";

// GET /api/repositories
export const getRepositories = async (req, res, next) => {
  try {
    const repos = await Repository.find({ owner: req.user.id });
    
    // Add openDriftCount to each repository object
    const reposWithDriftCount = await Promise.all(
      repos.map(async (repo) => {
        const openDriftCount = await Drift.countDocuments({
          repository: repo._id,
          status: "open",
        });
        return {
          ...repo.toObject(),
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

    // Check duplicate
    const duplicate = await Repository.findOne({ fullName: meta.full_name, owner: req.user.id });
    if (duplicate) {
      return res.status(409).json({ message: "Repository already connected" });
    }

    const repo = await Repository.create({
      owner: req.user.id,
      company: req.user.company,
      repoName: meta.name,
      fullName: meta.full_name,
      githubRepoId: meta.id,
      defaultBranch: meta.default_branch || "main",
      language: meta.language || "JavaScript",
      status: "idle",
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
    const repo = await Repository.findOne({ _id: repoId, owner: req.user.id });
    if (!repo) {
      return res.status(404).json({ message: "Repository not found or unauthorized" });
    }

    await Promise.all([
      Repository.deleteOne({ _id: repoId }),
      Drift.deleteMany({ repository: repoId }),
      CommitMemory.deleteMany({ repository: repoId }),
      KnowledgeQA.deleteMany({ repository: repoId }),
    ]);

    res.json({ message: "Repository deleted" });
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

    // Get already-connected repo fullNames for this user
    const connectedRepos = await Repository.find({ owner: req.user.id }).select("fullName");
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
