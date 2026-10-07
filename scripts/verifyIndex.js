import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "../server");
const serverNodeModules = path.resolve(serverDir, "node_modules");

// Import packages from server node_modules
const dotenvPath = pathToFileURL(path.join(serverNodeModules, "dotenv", "lib", "main.js")).href;
const dotenvModule = await import(dotenvPath);
const dotenv = dotenvModule.default || dotenvModule;
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(serverDir, ".env") });

const axiosPath = pathToFileURL(path.join(serverNodeModules, "axios", "index.js")).href;
const axiosModule = await import(axiosPath);
const axios = axiosModule.default || axiosModule;

const mongoosePath = pathToFileURL(path.join(serverNodeModules, "mongoose", "index.js")).href;
const mongooseModule = await import(mongoosePath);
const mongoose = mongooseModule.default || mongooseModule;

const repositoryPath = pathToFileURL(path.resolve(serverDir, "models/Repository.js")).href;
const repositoryModule = await import(repositoryPath);
const Repository = repositoryModule.default || repositoryModule;

const qdrantStorePath = pathToFileURL(path.resolve(serverDir, "services/qdrantStore.js")).href;
const { getQdrantUrl, buildTenantFilter } = await import(qdrantStorePath);

const servicesPath = pathToFileURL(path.resolve(serverDir, "config/services.js")).href;
const { servicesConfig } = await import(servicesPath);

const connectionPath = pathToFileURL(path.resolve(serverDir, "models/GitHubConnection.js")).href;
const GitHubConnection = (await import(connectionPath)).default;

const githubAppPath = pathToFileURL(path.resolve(serverDir, "services/githubApp.js")).href;
const { getInstallationToken } = await import(githubAppPath);

const scrubberPath = pathToFileURL(path.resolve(serverDir, "utils/scrubber.js")).href;
const { shouldSkipFile } = await import(scrubberPath);

export const COLLECTION_NAME = "repository_chunks";

/**
 * Pure evaluation function for index compliance against GitHub truth and vector points.
 *
 * @param {Array} points Qdrant points array.
 * @param {Object} githubTruth Expected stats from GitHub API { expectedFilesCount, expectedCommitsCount, expectedPrsCount }.
 * @returns {Object} { passed: boolean, errors: string[], stats: Object }
 */
export function evaluateIndexCompliance(points = [], githubTruth = null) {
  const errors = [];
  const typeCounts = {
    CODE: 0,
    DOCUMENTATION: 0,
    COMMIT: 0,
    PULL_REQUEST: 0,
    OTHER: 0,
  };

  const filePathsSet = new Set();
  const fileCounts = new Map();
  let missingEmbedModelCount = 0;
  let missingDocTypeCount = 0;
  let invalidCommitShaCount = 0;
  let lockfileChunkCount = 0;
  let invalidTenantPoints = 0;

  for (const point of points) {
    const payload = point.payload || {};

    // 1. Tenancy payload validation
    if (!payload.companyId || !payload.repositoryId) {
      invalidTenantPoints++;
    }

    // 2. Embed model validation
    if (!payload.embedModel || typeof payload.embedModel !== "string" || !payload.embedModel.trim()) {
      missingEmbedModelCount++;
    }

    // 3. Document type validation
    if (!payload.documentType || typeof payload.documentType !== "string") {
      missingDocTypeCount++;
    }

    // 4. Commit SHA 40-hex validation
    const is40HexSha = typeof payload.commitSha === "string" && /^[a-f0-9]{40}$/i.test(payload.commitSha);
    if (!is40HexSha) {
      invalidCommitShaCount++;
    }

    // 5. Lockfile exclusion validation
    const pathToCheck = (payload.filePath || payload.path || "").toLowerCase();
    const isLockFile =
      pathToCheck.endsWith("package-lock.json") ||
      pathToCheck.endsWith("yarn.lock") ||
      pathToCheck.endsWith("pnpm-lock.yaml") ||
      pathToCheck.endsWith("cargo.lock") ||
      pathToCheck.endsWith("gemfile.lock") ||
      pathToCheck.endsWith("composer.lock") ||
      pathToCheck.endsWith("poetry.lock") ||
      pathToCheck.endsWith(".lock");
    if (isLockFile) {
      lockfileChunkCount++;
    }

    // Tally documentType
    const docType = payload.documentType || "OTHER";
    if (typeCounts[docType] !== undefined) {
      typeCounts[docType]++;
    } else {
      typeCounts.OTHER++;
    }

    // Distinct filePaths for CODE and DOCUMENTATION
    if (docType === "CODE" || docType === "DOCUMENTATION") {
      const fPath = payload.filePath || payload.path;
      if (fPath) {
        filePathsSet.add(fPath);
        fileCounts.set(fPath, (fileCounts.get(fPath) || 0) + 1);
      }
    }
  }

  if (missingEmbedModelCount > 0) {
    errors.push(`${missingEmbedModelCount} points lack 'embedModel'`);
  }
  if (missingDocTypeCount > 0) {
    errors.push(`${missingDocTypeCount} points lack 'documentType'`);
  }
  if (invalidCommitShaCount > 0) {
    errors.push(`${invalidCommitShaCount} points lack a valid 40-hex commitSha`);
  }
  if (lockfileChunkCount > 0) {
    errors.push(`${lockfileChunkCount} lockfile chunks found in vector index`);
  }
  if (invalidTenantPoints > 0) {
    errors.push(`${invalidTenantPoints} points missing companyId or repositoryId`);
  }

  const distinctIndexedFiles = filePathsSet.size;
  const indexedCommits = typeCounts.COMMIT;
  const indexedPrs = typeCounts.PULL_REQUEST;

  let fileCoverage = 100;
  let commitCoverage = 100;
  let prCoverage = 100;

  if (githubTruth) {
    const { expectedFilesCount = 0, expectedCommitsCount = 0, expectedPrsCount = 0 } = githubTruth;

    fileCoverage = expectedFilesCount > 0 ? (distinctIndexedFiles / expectedFilesCount) * 100 : 100;
    commitCoverage = expectedCommitsCount > 0 ? (indexedCommits / expectedCommitsCount) * 100 : 100;

    if (expectedPrsCount === 0) {
      // Zero PRs on GitHub with zero PR chunks is a PASS
      prCoverage = indexedPrs === 0 ? 100 : 0;
      if (indexedPrs > 0) {
        errors.push(`GitHub has 0 pull requests but vector index has ${indexedPrs} PULL_REQUEST chunks`);
      }
    } else {
      prCoverage = (indexedPrs / expectedPrsCount) * 100;
      if (prCoverage < 95) {
        errors.push(`Pull request coverage (${prCoverage.toFixed(1)}%) is below 95% (${indexedPrs}/${expectedPrsCount})`);
      }
    }

    if (fileCoverage < 95) {
      errors.push(`File coverage (${fileCoverage.toFixed(1)}%) is below 95% (${distinctIndexedFiles}/${expectedFilesCount})`);
    }
    if (commitCoverage < 95) {
      errors.push(`Commit coverage (${commitCoverage.toFixed(1)}%) is below 95% (${indexedCommits}/${expectedCommitsCount})`);
    }
  }

  const passed = errors.length === 0;

  return {
    passed,
    errors,
    stats: {
      pointsCount: points.length,
      distinctIndexedFiles,
      indexedCommits,
      indexedPrs,
      fileCoverage,
      commitCoverage,
      prCoverage,
      typeCounts,
      fileCounts,
      missingEmbedModelCount,
      missingDocTypeCount,
      invalidCommitShaCount,
      lockfileChunkCount,
      invalidTenantPoints,
    },
  };
}

export async function verifyIndex(repositoryIdInput = process.argv[2]) {
  if (!repositoryIdInput) {
    console.log("Usage: node scripts/verifyIndex.js <repositoryId|fullName>");
    process.exit(1);
  }

  const mongoUri = servicesConfig.mongoUri || process.env.MONGO_URI;
  if (mongoUri && mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  let repo = null;
  if (mongoose.Types.ObjectId.isValid(repositoryIdInput)) {
    repo = await Repository.findById(repositoryIdInput);
  }
  if (!repo) {
    repo = await Repository.findOne({
      $or: [{ fullName: repositoryIdInput }, { name: repositoryIdInput }, { repoName: repositoryIdInput }],
    });
  }
  if (!repo) {
    const numId = Number(repositoryIdInput);
    if (!isNaN(numId)) {
      repo = await Repository.findOne({ githubRepositoryId: numId });
    }
  }

  if (!repo) {
    console.error(`Error: Repository '${repositoryIdInput}' not found in database.`);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  }

  const companyId = String(repo.companyId || repo.company || "");
  const repositoryId = String(repo._id);

  console.log(`\n==================================================`);
  console.log(`[VERIFY INDEX] Repository: ${repo.fullName}`);
  console.log(`  - Database ID:  ${repositoryId}`);
  console.log(`  - Company ID:   ${companyId}`);
  console.log(`==================================================\n`);

  // 1. Fetch GitHub Truth Expectations
  let githubTruth = null;
  try {
    const conn = await GitHubConnection.findOne({ companyId: repo.companyId || repo.company });
    if (conn && conn.installationId) {
      const token = await getInstallationToken(conn.installationId);
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "WhyCode-App",
      };
      const [owner, name] = repo.fullName.split("/");

      // Default branch and tree
      const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${name}`, { headers });
      const defaultBranch = repoRes.data.default_branch || "main";
      const refRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/git/ref/heads/${defaultBranch}`, { headers });
      const headSha = refRes.data.object?.sha;

      let expectedFilesCount = 0;
      if (headSha) {
        const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/git/trees/${headSha}?recursive=1`, { headers });
        const blobs = (treeRes.data.tree || []).filter((i) => i.type === "blob");
        const nonIgnoredBlobs = blobs.filter((i) => !shouldSkipFile(i.path, i.size || 0));
        expectedFilesCount = nonIgnoredBlobs.length;
      }

      // Commits
      const commitsRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/commits?per_page=100`, { headers });
      const expectedCommitsCount = (commitsRes.data || []).length;

      // PRs
      const pullsRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=100`, { headers });
      const expectedPrsCount = (pullsRes.data || []).length;

      githubTruth = {
        expectedFilesCount,
        expectedCommitsCount,
        expectedPrsCount,
      };

      console.log("GitHub API Truth Expectations:");
      console.log(`  - Head SHA:          ${headSha || "(none)"}`);
      console.log(`  - Non-ignored files: ${expectedFilesCount}`);
      console.log(`  - Commits:           ${expectedCommitsCount}`);
      console.log(`  - Pull Requests:     ${expectedPrsCount}`);
    } else {
      console.log("  [INFO] GitHub App connection not configured for company.");
    }
  } catch (ghErr) {
    console.warn(`  [WARN] GitHub API lookup failed: ${ghErr.message}`);
  }

  // 2. Fetch Points from Qdrant
  const filter = buildTenantFilter(companyId, repositoryId);
  const scrollUrl = `${getQdrantUrl()}/collections/${COLLECTION_NAME}/points/scroll`;

  try {
    const response = await axios.post(
      scrollUrl,
      {
        filter,
        limit: 10000,
        with_payload: true,
        with_vector: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(servicesConfig.qdrantApiKey ? { "api-key": servicesConfig.qdrantApiKey } : {}),
        },
        timeout: 10000,
      }
    );

    const points = response.data?.result?.points || [];
    console.log(`\nQdrant Vector Points Retrieved: ${points.length}`);

    // 3. Evaluate Compliance
    const compliance = evaluateIndexCompliance(points, githubTruth);
    const { stats, errors, passed } = compliance;

    console.log("\nDocumentType Breakdown:");
    console.log(`  - CODE:          ${stats.typeCounts.CODE}`);
    console.log(`  - DOCUMENTATION: ${stats.typeCounts.DOCUMENTATION}`);
    console.log(`  - COMMIT:        ${stats.typeCounts.COMMIT}`);
    console.log(`  - PULL_REQUEST:  ${stats.typeCounts.PULL_REQUEST}`);
    if (stats.typeCounts.OTHER > 0) {
      console.log(`  - OTHER:         ${stats.typeCounts.OTHER}`);
    }

    if (githubTruth) {
      console.log("\n--- Coverage vs GitHub Truth ---");
      console.log(`  - Non-ignored files: GitHub=${githubTruth.expectedFilesCount}, Indexed=${stats.distinctIndexedFiles} (${stats.fileCoverage.toFixed(1)}% coverage)`);
      console.log(`  - Commits:           GitHub=${githubTruth.expectedCommitsCount}, Indexed=${stats.indexedCommits} (${stats.commitCoverage.toFixed(1)}% coverage)`);
      console.log(`  - Pull Requests:     GitHub=${githubTruth.expectedPrsCount}, Indexed=${stats.indexedPrs} (${stats.prCoverage.toFixed(1)}% coverage)`);
    }

    if (points.length > 0) {
      console.log("\nSample Payloads (up to 3 items):");
      points.slice(0, 3).forEach((sample, idx) => {
        const p = sample.payload || {};
        const rawText = p.text || p.content || "";
        const truncatedText = rawText.slice(0, 150).replace(/\r?\n/g, " ");
        console.log(`\nSample ${idx + 1} [ID: ${sample.id}]:`);
        console.log(`  documentType: ${p.documentType}`);
        console.log(`  filePath:     ${p.filePath || p.path}`);
        console.log(`  commitSha:    ${p.commitSha}`);
        console.log(`  url:          ${p.url}`);
        console.log(`  lineRange:    L${p.startLine}-L${p.endLine}`);
        console.log(`  embedModel:   ${p.embedModel}`);
        console.log(`  text:         "${truncatedText}..."`);
      });
    }

    if (!passed) {
      console.error("\n==================================================");
      console.error("❌ VERIFICATION FAILED with errors:");
      for (const err of errors) {
        console.error(`  - ${err}`);
      }
      console.error("==================================================\n");
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
      process.exit(1);
    }

    console.log("\n==================================================");
    console.log("✅ VERIFICATION PASSED: All points satisfy schema, tenancy, and coverage thresholds.");
    console.log("==================================================\n");

    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Verification error:", err.message);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1] && (process.argv[1].endsWith("verifyIndex.js") || process.argv[1].endsWith("verifyIndex"))) {
  verifyIndex().catch((err) => {
    console.error("Fatal error during verification:", err);
    process.exit(1);
  });
}
