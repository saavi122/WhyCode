import Repository from "../models/Repository.js";
import CommitMemory from "../models/CommitMemory.js";
import * as githubService from "../services/githubService.js";
import * as aiService from "../services/aiService.js";

// GET /api/timeline/:repoId
export const getRepoTimeline = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const commits = await CommitMemory.find({ repository: repoId })
      .sort({ date: -1 })
      .limit(50);
    res.json(commits);
  } catch (err) {
    next(err);
  }
};

// GET /api/timeline/:repoId/file (legacy / specific file timeline)
export const getFileTimeline = async (req, res, next) => {
  try {
    const repoId = req.params.repoId;
    const filePath = req.params.filePath || req.query.filePath;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const token = req.user.githubAccessToken || "mock-token-xyz";
    const [owner, name] = repo.fullName.split("/");

    const commits = await githubService.fetchFileCommits(token, owner, name, filePath);

    let blame = [];
    try {
      blame = await githubService.fetchBlame(token, owner, name, filePath, repo.defaultBranch);
    } catch (err) {
      console.warn("Could not fetch blame info, skipping:", err.message);
    }

    const content = await githubService.fetchFileContent(token, owner, name, filePath);

    let prContext = "";
    if (commits && commits.length > 0) {
      try {
        const pr = await githubService.fetchLinkedPR(token, owner, name, commits[0].sha);
        if (pr) {
          prContext = `PR Title: ${pr.title}\nPR Description: ${pr.body || ""}`;
        }
      } catch (err) {
        console.warn("Could not fetch linked PR:", err.message);
      }
    }

    const intent = await aiService.reconstructIntent(
      content.slice(0, 1000),
      commits.slice(0, 5).map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
      })),
      prContext
    );

    res.json({
      filePath,
      commits: commits.slice(0, 10).map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
      })),
      blame,
      intent,
    });
  } catch (err) {
    next(err);
  }
};
