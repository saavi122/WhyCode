import Repository from "../models/Repository.js";
import Drift from "../models/Drift.js";
import CommitMemory from "../models/CommitMemory.js";
import * as githubService from "../services/githubService.js";
import * as aiService from "../services/aiService.js";

export const scanRepository = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (repo.status === "scanning") {
      return res.status(400).json({ message: "Scan already in progress" });
    }

    repo.status = "scanning";
    await repo.save();

    // Trigger async background scan
    runBackgroundScan(repo, req.user.githubAccessToken).catch((err) => {
      console.error(`Background scan error for ${repo.fullName}:`, err);
    });

    res.status(202).json({ message: "Scan initiated", repoId: repo._id, status: "scanning" });
  } catch (err) {
    next(err);
  }
};

const runBackgroundScan = async (repo, token) => {
  try {
    const [owner, name] = repo.fullName.split("/");

    const files = await githubService.fetchRepoTree(token, owner, name, repo.defaultBranch);
    // Filter for code and documentation files
    const docFiles = files.filter((f) => /\.(js|ts|py|md|jsx|tsx)$/.test(f.path)).slice(0, 10); // cap to 10 for speed/token limits

    const totalFiles = docFiles.length;
    let cleanFilesCount = 0;
    let totalDriftsCount = 0;

    // Clear old scans for this repository
    await Drift.deleteMany({ repository: repo._id });
    await CommitMemory.deleteMany({ repository: repo._id });

    // Authors tracking for Bus Factor calculation
    const authorsSet = new Set();

    for (const file of docFiles) {
      try {
        const content = await githubService.fetchFileContent(token, owner, name, file.path);
        
        // 1. Detect Drift
        const docBlock = extractDocBlock(content, file.path);
        const driftResult = await aiService.detectDrift(content, docBlock);

        if (driftResult && driftResult.driftDetected) {
          totalDriftsCount++;
          await Drift.create({
            repository: repo._id,
            filePath: file.path,
            type: file.path.endsWith(".md") ? "readme_drift" : "docstring_drift",
            severity: driftResult.severity || "medium",
            currentDocText: docBlock || "None",
            currentCodeSnippet: content.slice(0, 800),
            suggestion: driftResult.suggestedDocumentation,
            confidence: driftResult.confidence || 70,
            status: "open",
          });
        } else {
          cleanFilesCount++;
        }

        // 2. Fetch commits and save CommitMemory
        const commits = await githubService.fetchFileCommits(token, owner, name, file.path);
        
        for (const c of commits.slice(0, 5)) {
          if (c.commit && c.commit.author) {
            authorsSet.add(c.commit.author.name);
          }
          await CommitMemory.create({
            repository: repo._id,
            commitSha: c.sha,
            author: c.commit?.author?.name || "unknown",
            message: c.commit?.message || "",
            filesChanged: [file.path],
            date: c.commit?.author?.date ? new Date(c.commit.author.date) : new Date(),
          });
        }
      } catch (fileErr) {
        console.error(`Error scanning file ${file.path}:`, fileErr);
      }
    }

    // Calculate metrics
    const docHealthScore = totalFiles > 0 ? Math.round((cleanFilesCount / totalFiles) * 100) : 100;
    const knowledgeCoverage = totalFiles > 0 ? Math.round(((totalFiles - totalDriftsCount) / totalFiles) * 100) : 100;
    const busFactor = authorsSet.size > 0 ? authorsSet.size : 1;

    repo.docHealthScore = docHealthScore;
    repo.knowledgeCoverage = knowledgeCoverage;
    repo.busFactor = busFactor;
    repo.status = "completed";
    repo.lastScanAt = new Date();
    await repo.save();
  } catch (err) {
    repo.status = "failed";
    await repo.save();
    throw err;
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
    const repo = await Repository.findById(repoId);
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
