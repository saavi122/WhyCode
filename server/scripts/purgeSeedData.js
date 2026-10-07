import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { getInstallationToken } from "../services/githubApp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isApply = process.argv.includes("--apply");

async function purgeSeedData() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB Atlas\n");
  console.log(`MODE: ${isApply ? ">>> APPLY (Executing permanent deletions and dedupes) <<<" : ">>> DRY RUN (No records deleted. Pass --apply to execute) <<<\n"}`);

  const Repositories = mongoose.connection.db.collection("repositories");
  const CommitMemories = mongoose.connection.db.collection("commitmemories");
  const GitHubConnections = mongoose.connection.db.collection("githubconnections");

  // 1. Identify real connected repositories vs demo/fake repositories
  const activeConnections = await GitHubConnections.find({ status: "CONNECTED" }).toArray();
  console.log(`Found ${activeConnections.length} active GitHub App connection(s).`);

  let githubToken = null;
  if (activeConnections.length > 0 && activeConnections[0].installationId) {
    try {
      githubToken = await getInstallationToken(activeConnections[0].installationId);
    } catch (e) {
      console.warn("Could not generate GitHub installation token:", e.message);
    }
  }

  const allRepos = await Repositories.find({}).toArray();
  const fakeReposToDelete = [];
  const realRepoMap = new Map(); // id -> repo

  for (const repo of allRepos) {
    // Check if repository exists on GitHub
    let isReal = false;
    if (repo.fullName && githubToken) {
      try {
        const [owner, name] = repo.fullName.split("/");
        if (owner && name) {
          const res = await axios.get(`https://api.github.com/repos/${owner}/${name}`, {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "WhyCode-App",
            },
            timeout: 5000,
          });
          if (res.data && res.data.id) {
            isReal = true;
          }
        }
      } catch (err) {
        // 404 or unauthenticated means fake/demo repo
        isReal = false;
      }
    }

    if (isReal) {
      realRepoMap.set(String(repo._id), repo);
      console.log(`[REAL REPOSITORY] ID: ${repo._id} | fullName: ${repo.fullName}`);
    } else {
      fakeReposToDelete.push(repo);
    }
  }

  console.log(`\n--- FAKE / DEMO REPOSITORIES IDENTIFIED (${fakeReposToDelete.length}) ---`);
  for (const r of fakeReposToDelete) {
    console.log(`  [DEMO REPO] ID: ${r._id} | fullName: ${r.fullName || r.name || "unnamed"} | company: ${r.companyId || r.company}`);
  }

  // 2. For all real repositories, fetch known real commit SHAs from GitHub
  const realRepoCommitShas = new Map(); // repoId -> Set of SHAs
  for (const [repoId, repo] of realRepoMap.entries()) {
    const shas = new Set();
    if (githubToken && repo.fullName) {
      try {
        const [owner, name] = repo.fullName.split("/");
        let page = 1;
        while (page <= 5) {
          const res = await axios.get(`https://api.github.com/repos/${owner}/${name}/commits?per_page=100&page=${page}`, {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "WhyCode-App",
            },
            timeout: 8000,
          });
          const list = res.data || [];
          if (!Array.isArray(list) || list.length === 0) break;
          list.forEach((c) => shas.add(c.sha.toLowerCase()));
          if (list.length < 100) break;
          page++;
        }
      } catch (e) {
        console.warn(`Could not fetch GitHub commits for ${repo.fullName}:`, e.message);
      }
    }
    realRepoCommitShas.set(repoId, shas);
  }

  // 3. Identify fake/demo commits and duplicate commits
  const allCommits = await CommitMemories.find({}).toArray();
  const fakeCommitsToDelete = [];
  const duplicateCommitsToDelete = [];
  const seenRepoSha = new Set();

  for (const c of allCommits) {
    const isFakeAuthor = /alex|sarah|mock developer/i.test(c.author || "");
    const isFakeSha = /1491a2d|mocksha|bb3667c|d7bd7d4|d122de4|15777dc|0c744f4/i.test(c.commitSha || "");
    const repoIdStr = String(c.repository || c.repositoryId || "");
    const isFakeRepo = !realRepoMap.has(repoIdStr);

    const knownShas = realRepoCommitShas.get(repoIdStr);
    const shaExistsOnGitHub = knownShas && c.commitSha ? knownShas.has(c.commitSha.toLowerCase()) : true;

    if (isFakeAuthor || isFakeSha || isFakeRepo || !shaExistsOnGitHub) {
      fakeCommitsToDelete.push(c);
      continue;
    }

    // Check duplicate real commits
    const key = `${c.repository}:${c.commitSha}`;
    if (seenRepoSha.has(key)) {
      duplicateCommitsToDelete.push(c);
    } else {
      seenRepoSha.add(key);
    }
  }

  console.log(`\n--- FAKE COMMITS IDENTIFIED (${fakeCommitsToDelete.length}) ---`);
  for (const c of fakeCommitsToDelete) {
    console.log(`  [FAKE COMMIT] ID: ${c._id} | SHA: ${c.commitSha?.slice(0, 7)} | Author: ${c.author} | Repo: ${c.repository} | Message: ${c.message?.slice(0, 60)}`);
  }

  console.log(`\n--- DUPLICATE REAL COMMITS IDENTIFIED (${duplicateCommitsToDelete.length}) ---`);
  for (const c of duplicateCommitsToDelete) {
    console.log(`  [DUPLICATE COMMIT] ID: ${c._id} | SHA: ${c.commitSha?.slice(0, 7)} | Author: ${c.author} | Repo: ${c.repository}`);
  }

  if (isApply) {
    console.log("\nApplying deletions...");

    // Delete fake repositories
    if (fakeReposToDelete.length > 0) {
      const fakeRepoIds = fakeReposToDelete.map((r) => r._id);
      const delRepoRes = await Repositories.deleteMany({ _id: { $in: fakeRepoIds } });
      console.log(`✓ Deleted ${delRepoRes.deletedCount} demo/fake repositories from MongoDB.`);
    }

    // Delete fake commits
    if (fakeCommitsToDelete.length > 0) {
      const fakeCommitIds = fakeCommitsToDelete.map((c) => c._id);
      const delFakeRes = await CommitMemories.deleteMany({ _id: { $in: fakeCommitIds } });
      console.log(`✓ Deleted ${delFakeRes.deletedCount} fake commit records from MongoDB.`);
    }

    // Delete duplicate commits
    if (duplicateCommitsToDelete.length > 0) {
      const dupCommitIds = duplicateCommitsToDelete.map((c) => c._id);
      const delDupRes = await CommitMemories.deleteMany({ _id: { $in: dupCommitIds } });
      console.log(`✓ Deleted ${delDupRes.deletedCount} duplicate commit records from MongoDB.`);
    }

    // Ensure unique compound index on CommitMemory
    try {
      await CommitMemories.createIndex({ repository: 1, commitSha: 1 }, { unique: true });
      console.log("✓ Created unique compound index { repository: 1, commitSha: 1 } on CommitMemory.");
    } catch (idxErr) {
      console.log(`Index creation notice: ${idxErr.message}`);
    }
  } else {
    console.log(`\nDRY RUN SUMMARY:
- Demo repositories to delete: ${fakeReposToDelete.length}
- Fake commits to delete: ${fakeCommitsToDelete.length}
- Duplicate commits to deduplicate: ${duplicateCommitsToDelete.length}
Run with --apply to execute these changes.`);
  }

  await mongoose.disconnect();
}

purgeSeedData().catch((err) => {
  console.error("Purge error:", err);
  process.exit(1);
});
