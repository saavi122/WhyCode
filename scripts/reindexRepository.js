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

const connectionPath = pathToFileURL(path.resolve(serverDir, "models/GitHubConnection.js")).href;
const connectionModule = await import(connectionPath);
const GitHubConnection = connectionModule.default || connectionModule;

const syncServicePath = pathToFileURL(path.resolve(serverDir, "services/syncService.js")).href;
const { executeRepositorySync } = await import(syncServicePath);

const repoSyncModelPath = pathToFileURL(path.resolve(serverDir, "models/RepositorySync.js")).href;
const RepositorySync = (await import(repoSyncModelPath)).default;

const qdrantStorePath = pathToFileURL(path.resolve(serverDir, "services/qdrantStore.js")).href;
const { getQdrantUrl, buildTenantFilter } = await import(qdrantStorePath);

const servicesPath = pathToFileURL(path.resolve(serverDir, "config/services.js")).href;
const { servicesConfig, isLocalOrPrivateAddress } = await import(servicesPath);

const githubAppPath = pathToFileURL(path.resolve(serverDir, "services/githubApp.js")).href;
const { getInstallationToken } = await import(githubAppPath);

const scrubberPath = pathToFileURL(path.resolve(serverDir, "utils/scrubber.js")).href;
const { shouldSkipFile } = await import(scrubberPath);

const COLLECTION_NAME = "repository_chunks";

async function reindexRepository() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const targetArg = args.find((a) => !a.startsWith("--"));

  if (!targetArg) {
    console.log("Usage: node scripts/reindexRepository.js <repositoryId|fullName> [--apply]");
    console.log("  Note: Runs in dry-run mode by default. Pass --apply to execute updates.");
    process.exit(1);
  }

  // Safety pre-check: verify target Qdrant URL
  const qdrantUrl = getQdrantUrl();
  const isLocalQdrant = isLocalOrPrivateAddress(qdrantUrl);

  if (!isLocalQdrant && !isApply) {
    console.error(`[SAFETY ERROR] QDRANT_URL is not localhost (${qdrantUrl}). Dry run aborted for safety.`);
    process.exit(1);
  }

  const mongoUri = servicesConfig.mongoUri || process.env.MONGO_URI;
  if (mongoUri && mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  let repo = null;
  if (mongoose.Types.ObjectId.isValid(targetArg)) {
    repo = await Repository.findById(targetArg);
  }
  if (!repo) {
    repo = await Repository.findOne({
      $or: [{ fullName: targetArg }, { name: targetArg }, { repoName: targetArg }],
    });
  }
  if (!repo) {
    const numId = Number(targetArg);
    if (!isNaN(numId)) {
      repo = await Repository.findOne({ githubRepositoryId: numId });
    }
  }

  if (!repo) {
    console.error(`Error: Repository '${targetArg}' not found in database.`);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  }

  const companyId = String(repo.companyId || repo.company || "");
  const repositoryId = String(repo._id);

  console.log(`\n================================================================================`);
  console.log(`🚀 WHYCODE REINDEX PIPELINE: ${repo.fullName}`);
  console.log(`  - Mode:         ${isApply ? "APPLY (Live update)" : "DRY RUN (Simulation only)"}`);
  console.log(`  - Database ID:  ${repositoryId}`);
  console.log(`  - Company ID:   ${companyId}`);
  console.log(`  - Qdrant Target:${qdrantUrl} (${isLocalQdrant ? "LOCAL / PRIVATE" : "REMOTE CLOUD"})`);
  console.log(`================================================================================\n`);

  // 1. Fetch current Qdrant point status
  const filter = buildTenantFilter(companyId, repositoryId);
  const scrollUrl = `${qdrantUrl}/collections/${COLLECTION_NAME}/points/scroll`;

  let currentPoints = [];
  try {
    const scrollRes = await axios.post(
      scrollUrl,
      { filter, limit: 10000, with_payload: true, with_vector: false },
      {
        headers: {
          "Content-Type": "application/json",
          ...(servicesConfig.qdrantApiKey ? { "api-key": servicesConfig.qdrantApiKey } : {}),
        },
        timeout: 10000,
      }
    );
    currentPoints = scrollRes.data?.result?.points || [];
  } catch (err) {
    console.warn(`[WARN] Could not retrieve existing points: ${err.message}`);
  }

  const legacyPoints = currentPoints.filter((p) => !p.payload?.embedModel);

  // 2. Fetch GitHub repository truth
  let treeFiles = [];
  let excludedFiles = [];
  let commits = [];
  let pullRequests = [];
  let headSha = "";

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

      const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${name}`, { headers });
      const defaultBranch = repoRes.data.default_branch || "main";
      const refRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/git/ref/heads/${defaultBranch}`, { headers });
      headSha = refRes.data.object?.sha;

      if (headSha) {
        const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/git/trees/${headSha}?recursive=1`, { headers });
        const allBlobs = (treeRes.data.tree || []).filter((i) => i.type === "blob");

        for (const blob of allBlobs) {
          const skipReason = shouldSkipFile(blob.path, blob.size || 0);
          if (skipReason) {
            excludedFiles.push({ path: blob.path, reason: typeof skipReason === "string" ? skipReason : "excluded extension/pattern" });
          } else {
            treeFiles.push(blob.path);
          }
        }
      }

      const commitsRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/commits?per_page=100`, { headers });
      commits = commitsRes.data || [];

      const pullsRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=100`, { headers });
      pullRequests = pullsRes.data || [];
    }
  } catch (ghErr) {
    console.warn(`[WARN] GitHub discovery lookup: ${ghErr.message}`);
  }

  console.log(`[DISCOVERY & GITHUB TRUTH]`);
  console.log(`  - Head SHA:              ${headSha || "(not resolved)"}`);
  console.log(`  - Non-ignored files:     ${treeFiles.length}`);
  console.log(`  - Excluded files count:  ${excludedFiles.length}`);
  console.log(`  - Commits discovered:    ${commits.length}`);
  console.log(`  - Pull requests count:   ${pullRequests.length}`);
  console.log(`  - Current points in index: ${currentPoints.length} (${legacyPoints.length} legacy / missing embedModel)`);

  if (excludedFiles.length > 0) {
    console.log(`\nSample Excluded Files & Reasons:`);
    excludedFiles.slice(0, 8).forEach((f) => {
      console.log(`  - ${f.path} -> [${f.reason}]`);
    });
  }

  // Chunk count estimation based on structure-aware parser
  const estimatedChunks = treeFiles.length * 3 + commits.length + pullRequests.length;

  if (!isApply) {
    console.log(`\n================================================================================`);
    console.log(`[DRY RUN SPECIFICATION & COMPLIANCE PREVIEW]`);
    console.log(`================================================================================`);
    console.log(`1. Target Repository:    ${repo.fullName} (ID: ${repositoryId})`);
    console.log(`2. Files Discovered:     ${treeFiles.length} eligible source & documentation files`);
    console.log(`3. Files Excluded:       ${excludedFiles.length} files (lockfiles, images, binaries, caches)`);
    console.log(`4. Commits Discovered:   ${commits.length} historical commits`);
    console.log(`5. PR Count:             ${pullRequests.length} pull requests`);
    console.log(`6. Estimated Chunks:     ~${estimatedChunks} structure-aware chunks (40-400 tokens)`);
    console.log(`7. Document Types:       CODE, DOCUMENTATION, COMMIT, PULL_REQUEST`);
    console.log(`8. Expected Metadata:    embedModel="BAAI/bge-small-en-v1.5", commitSha (40-hex),`);
    console.log(`                         companyId="${companyId}", repositoryId="${repositoryId}",`);
    console.log(`                         url (permalink with pinned commitSha), startLine, endLine`);
    console.log(`9. Target Qdrant URL:    ${qdrantUrl} (Verified Local: ${isLocalQdrant})`);
    console.log(`================================================================================\n`);
    console.log(`[DRY RUN COMPLETED] No changes written to database or vector store.`);
    console.log(`To apply this re-indexing, wait for explicit approval then rerun with --apply.`);

    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(0);
  }

  // 3. Live Apply
  console.log(`\n[APPLY] Initiating live repository synchronization pipeline...`);
  const syncRecord = await RepositorySync.create({
    companyId: repo.companyId || repo.company,
    repositoryId: repo._id,
    status: "PENDING",
    step: "QUEUED",
    syncType: "MANUAL",
  });

  try {
    const result = await executeRepositorySync(syncRecord._id.toString());

    console.log(`\n✅ [SUCCESS] Reindex completed!`);
    console.log(`  - Files indexed:       ${syncRecord.counts?.files || 0}`);
    console.log(`  - Commits indexed:     ${syncRecord.counts?.commits || 0}`);
    console.log(`  - Pull requests:       ${syncRecord.counts?.pullRequests || 0}`);
    console.log(`  - Chunks generated:    ${syncRecord.counts?.chunks || 0}`);
    console.log(`  - Points upserted:     ${syncRecord.counts?.upserted || 0}`);
    console.log(`  - New embeddings:      ${syncRecord.counts?.embedded || 0}`);
    console.log(`================================================================================\n`);

    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(0);
  } catch (syncErr) {
    console.error(`\n❌ [ERROR] Reindexing failed: ${syncErr.message}`);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  }
}

reindexRepository();
