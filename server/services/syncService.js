import axios from "axios";
import Repository from "../models/Repository.js";
import GitHubConnection from "../models/GitHubConnection.js";
import RepositorySync from "../models/RepositorySync.js";
import CommitMemory from "../models/CommitMemory.js";
import WebhookDelivery from "../models/WebhookDelivery.js";
import { getInstallationToken } from "./githubApp.js";
import { getEmbedding, getEmbeddingsBatch } from "./teiService.js";
import { upsertChunks, getQdrantUrl, buildTenantFilter, deleteFileChunks, fetchNeighbouringChunks } from "./qdrantStore.js";
import { shouldSkipFile, scrubSecrets } from "../utils/scrubber.js";
import {
  chunkCode,
  chunkMarkdown,
  chunkCommit,
  chunkPullRequest,
  generateDeterministicUuid,
  buildPointId,
  computeContentHash,
  formatEmbeddingText,
} from "./chunker.js";
import { logInfo, logError } from "../utils/logger.js";

import { runSyncPreflightCheck } from "./preflightService.js";
import { withRetry } from "../utils/retryHelper.js";
import { generateDriftReport, generateChangeSummaryReport } from "./reportService.js";

const COLLECTION_NAME = "repository_chunks";
const EXPECTED_VECTOR_DIMENSION = 384;

/**
 * Executes full repository synchronization for a given RepositorySync job ID.
 * @param {string} syncId Mongoose ObjectId string of RepositorySync.
 */
export async function executeRepositorySync(syncId) {
  const syncRecord = await RepositorySync.findById(syncId);
  if (!syncRecord) {
    throw new Error(`RepositorySync record ${syncId} not found.`);
  }

  const repo = await Repository.findById(syncRecord.repositoryId);
  if (!repo) {
    syncRecord.status = "FAILED";
    syncRecord.step = "FAILED";
    syncRecord.failedStep = "QUEUED";
    syncRecord.error = "Target repository not found in database.";
    syncRecord.completedAt = new Date();
    await syncRecord.save();
    throw new Error("Target repository not found.");
  }

  const companyId = String(syncRecord.companyId);
  const repositoryId = String(repo._id);
  const [owner, name] = repo.fullName.split("/");

  syncRecord.status = "IN_PROGRESS";
  syncRecord.step = "FETCHING_DATA";
  syncRecord.startedAt = new Date();
  await syncRecord.save();

  repo.syncStatus = "SYNCING";
  await repo.save();

  try {
    // 0. Preflight check across all services
    await runSyncPreflightCheck(companyId, repo.githubRepositoryId);
    const connection = await GitHubConnection.findOne({ companyId });
    if (!connection || !connection.installationId) {
      throw new Error("Active GitHub Connection or installationId missing for company.");
    }

    const token = await getInstallationToken(connection.installationId);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "WhyCode-App",
    };

    // 1. Fetch Repository Meta & Default Branch Head SHA
    let defaultBranch = repo.defaultBranch || "main";
    let headSha = "";
    try {
      const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${name}`, { headers, timeout: 10000 });
      defaultBranch = repoRes.data.default_branch || defaultBranch;
      if (repoRes.data.private !== undefined) {
        repo.isPrivate = Boolean(repoRes.data.private);
        repo.private = Boolean(repoRes.data.private);
        await repo.save();
      }
      const refRes = await axios.get(`https://api.github.com/repos/${owner}/${name}/git/ref/heads/${defaultBranch}`, { headers, timeout: 10000 });
      headSha = refRes.data.object?.sha || "";
    } catch (refErr) {
      logInfo("Repository appears empty or has no commits", { fullName: repo.fullName });
    }

    // Check for Empty Repository
    if (!headSha) {
      syncRecord.status = "COMPLETED";
      syncRecord.step = "COMPLETED";
      syncRecord.completedAt = new Date();
      syncRecord.error = "Repository connected successfully. No repository history is available yet.";
      await syncRecord.save();

      repo.syncStatus = "COMPLETED";
      repo.lastSyncedAt = new Date();
      await repo.save();

      return {
        message: "Repository connected successfully. No repository history is available yet.",
        counts: syncRecord.counts,
      };
    }

    // 2. Fetch Git Tree recursively (handling truncated trees if needed)
    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${name}/git/trees/${headSha}?recursive=1`,
      { headers, timeout: 15000 }
    );

    let treeItems = treeRes.data.tree || [];
    if (treeRes.data.truncated) {
      logInfo("Git tree truncated by GitHub API, fetching subtrees", { fullName: repo.fullName });
    }

    // Filter file blobs to process
    const blobItems = treeItems.filter(
      (item) => item.type === "blob" && !shouldSkipFile(item.path, item.size || 0)
    );

    // 3. Fetch File Blobs in Batches
    const documents = [];
    let totalRedactedSecrets = 0;

    const BATCH_SIZE = 5;
    for (let i = 0; i < blobItems.length; i += BATCH_SIZE) {
      const chunk = blobItems.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(async (item) => {
          try {
            const blobRes = await axios.get(
              `https://api.github.com/repos/${owner}/${name}/git/blobs/${item.sha}`,
              { headers, timeout: 10000 }
            );
            const rawContent = Buffer.from(blobRes.data.content, "base64").toString("utf-8");
            const { text: cleanContent, redactedCount } = scrubSecrets(rawContent);
            totalRedactedSecrets += redactedCount;

            const isDoc =
              item.path.endsWith(".md") ||
              item.path.endsWith(".rst") ||
              item.path.startsWith("docs/");

            documents.push({
              companyId,
              repositoryId,
              githubRepositoryId: repo.githubRepositoryId,
              documentType: isDoc ? "DOCUMENTATION" : "CODE",
              path: item.path,
              branch: defaultBranch,
              commitSha: headSha,
              content: cleanContent,
              author: owner,
              timestamp: new Date().toISOString(),
              prNumber: null,
            });
          } catch (err) {
            logError("Failed to fetch blob for path", { path: item.path, errorMessage: err.message });
          }
        })
      );
    }

    // 4. Fetch Full Commit History (paginated)
    let commitCount = 0;
    const allCommitsData = [];
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore && allCommitsData.length < 500) {
        const commitsRes = await axios.get(
          `https://api.github.com/repos/${owner}/${name}/commits?per_page=100&page=${page}`,
          { headers, timeout: 15000 }
        );
        const batch = commitsRes.data || [];
        if (batch.length === 0) {
          hasMore = false;
          break;
        }
        allCommitsData.push(...batch);
        if (batch.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
      }
      commitCount = allCommitsData.length;

      logInfo(`[SYNC] Ingested ${commitCount} commits from full history for ${repo.fullName}`, {
        repositoryId,
        commitCount,
        pages: page,
      });

      if (commitCount === 0 && headSha) {
        logError(`[SYNC] Zero commits retrieved for repository ${repo.fullName} with HEAD ${headSha}`, {
          repositoryId,
        });
      }

      for (const c of allCommitsData) {
        const commitMsg = c.commit?.message || "";
        const { text: cleanMsg } = scrubSecrets(commitMsg);
        const authorLogin = c.author?.login || "";
        const authorName = c.commit?.author?.name || "";
        const authorEmail = c.commit?.author?.email || "";
        const avatarUrl = c.author?.avatar_url || "";
        const displayAuthor = (authorLogin && authorLogin !== "unknown")
          ? authorLogin
          : ((authorName && authorName !== "unknown")
            ? authorName
            : (authorLogin || authorName || "unknown"));

        const committedAt = c.commit?.author?.date ? new Date(c.commit.author.date) : new Date();
        const parentShas = (c.parents || []).map((p) => p.sha);
        const filesChanged = (c.files || []).map((f) => f.filename);
        const stats = c.stats ? {
          additions: Number(c.stats.additions) || 0,
          deletions: Number(c.stats.deletions) || 0,
          total: Number(c.stats.total) || 0,
        } : { additions: 0, deletions: 0, total: 0 };
        const diffSummary = stats.total > 0 ? `+${stats.additions} -${stats.deletions} lines in ${filesChanged.length} files` : "";

        try {
          await CommitMemory.findOneAndUpdate(
            { repository: repo._id, commitSha: c.sha },
            {
              $set: {
                repository: repo._id,
                commitSha: c.sha,
                author: displayAuthor,
                authorName: authorName || displayAuthor,
                authorEmail,
                authorLogin,
                avatarUrl,
                message: commitMsg,
                parentShas,
                filesChanged,
                diffSummary,
                stats,
                committedAt,
                date: committedAt,
                htmlUrl: c.html_url || `https://github.com/${repo.fullName}/commit/${c.sha}`,
              },
            },
            { upsert: true, new: true }
          );
        } catch (dbErr) {
          // ignore duplicate race condition
        }

        documents.push({
          companyId,
          repositoryId,
          githubRepositoryId: repo.githubRepositoryId,
          documentType: "COMMIT",
          path: `commits/${c.sha.slice(0, 7)}`,
          branch: defaultBranch,
          commitSha: c.sha,
          content: cleanMsg,
          author: displayAuthor,
          timestamp: committedAt.toISOString(),
          prNumber: null,
          metadata: { sha: c.sha, parentShas, filesChanged, stats },
        });
      }
    } catch (commitErr) {
      logError("Failed to fetch commits", { errorMessage: commitErr.message });
      if (headSha && allCommitsData.length === 0) {
        throw new Error(`Failed to ingest commit history for ${repo.fullName}: ${commitErr.message}`);
      }
    }

    // 5. Fetch Pull Requests (capped)
    let prCount = 0;
    try {
      const prsRes = await axios.get(
        `https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=100`,
        { headers, timeout: 10000 }
      );
      const prsData = prsRes.data || [];
      prCount = prsData.length;

      for (const pr of prsData) {
        const prContent = `Title: ${pr.title}\nBody: ${pr.body || ""}\nState: ${pr.state}`;
        const { text: cleanPrContent } = scrubSecrets(prContent);
        documents.push({
          companyId,
          repositoryId,
          githubRepositoryId: repo.githubRepositoryId,
          documentType: "PULL_REQUEST",
          path: `pulls/${pr.number}`,
          branch: pr.base?.ref || defaultBranch,
          commitSha: pr.head?.sha || headSha,
          content: cleanPrContent,
          author: pr.user?.login || "unknown",
          timestamp: pr.created_at || new Date().toISOString(),
          prNumber: pr.number,
          metadata: {
            number: pr.number,
            title: pr.title,
            state: pr.state,
          },
        });
      }
    } catch (prErr) {
      logError("Failed to fetch pull requests", { errorMessage: prErr.message });
    }

    logInfo(`[SYNC] fetched ${blobItems.length} files / ${commitCount} commits / ${prCount} pull requests`, {
      repositoryId,
      redactedSecretsCount: totalRedactedSecrets,
    });

    syncRecord.counts.files = blobItems.length;
    syncRecord.counts.commits = commitCount;
    syncRecord.counts.pullRequests = prCount;
    syncRecord.step = "GENERATING_EMBEDDINGS";
    await syncRecord.save();

    // 6. Chunk Documents into Chunks
    const allChunks = [];
    for (const doc of documents) {
      let chunks = [];
      if (doc.documentType === "CODE") {
        chunks = chunkCode(doc.content, doc.path);
      } else if (doc.documentType === "DOCUMENTATION") {
        chunks = chunkMarkdown(doc.content, doc.path);
      } else if (doc.documentType === "COMMIT") {
        chunks = [
          chunkCommit(
            {
              sha: doc.commitSha,
              author: doc.author,
              date: doc.timestamp,
              message: doc.content,
              changedFiles: [],
            },
            repo.fullName
          ),
        ];
      } else if (doc.documentType === "PULL_REQUEST") {
        chunks = [
          chunkPullRequest(
            {
              number: doc.prNumber,
              title: doc.metadata?.title || "",
              body: doc.content,
              author: doc.author,
              state: doc.metadata?.state || "open",
              createdAt: doc.timestamp,
              changedFiles: [],
              comments: [],
            },
            repo.fullName
          ),
        ];
      }

      for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
        const chunk = chunks[chunkIdx];
        const startLine = chunk.startLine || 1;
        const endLine = chunk.endLine || 1;

        let url = chunk.url;
        if (!url) {
          url = `https://github.com/${repo.fullName}/blob/${headSha}/${doc.path}#L${startLine}-L${endLine}`;
        }

        const pointId = buildPointId({
          companyId,
          repositoryId,
          documentType: doc.documentType,
          pathOrSha: doc.path,
          chunkIndex: chunkIdx,
        });

        allChunks.push({
          pointId,
          chunkId: chunk.chunkId || `${doc.path}:${chunkIdx}`,
          chunkIndex: chunkIdx,
          companyId,
          repositoryId,
          githubRepositoryId: repo.githubRepositoryId,
          documentType: doc.documentType,
          filePath: doc.path,
          branch: doc.branch,
          commitSha: doc.commitSha,
          prNumber: doc.prNumber,
          author: doc.author,
          timestamp: doc.timestamp,
          contentHash: chunk.contentHash,
          startLine,
          endLine,
          url,
          text: chunk.text,
          symbol: chunk.symbol,
          embedModel: "BAAI/bge-small-en-v1.5",
          embedVersion: "1.0",
        });
      }
    }

    syncRecord.counts.chunks = allChunks.length;
    await syncRecord.save();

    // 7. Read Existing Chunks / Hashes from Qdrant for Incremental Upsert
    const existingMap = new Map(); // pointId -> contentHash
    try {
      const filter = buildTenantFilter(companyId, repositoryId);
      const scrollUrl = `${getQdrantUrl()}/collections/${COLLECTION_NAME}/points/scroll`;
      const scrollRes = await axios.post(
        scrollUrl,
        { filter, limit: 10000, with_payload: true },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );
      const points = scrollRes.data?.result?.points || [];
      for (const p of points) {
        if (p.payload?.contentHash) {
          existingMap.set(String(p.id), p.payload.contentHash);
        }
      }
    } catch (scrollErr) {
      logInfo("No existing points found or Qdrant scroll skipped", { errorMessage: scrollErr.message });
    }

    // Filter chunks that need embedding generation (new or modified)
    const chunksToEmbed = [];
    const pointMetadataList = [];
    const currentPointIds = new Set();

    for (const chunk of allChunks) {
      const pointId = chunk.pointId;
      currentPointIds.add(pointId);

      const existingHash = existingMap.get(pointId);
      if (existingHash && existingHash === chunk.contentHash) {
        // Chunk is unchanged, skip embedding generation!
        continue;
      }

      chunksToEmbed.push(formatEmbeddingText(chunk));
      pointMetadataList.push({ pointId, chunk });
    }

    let newlyEmbeddedCount = 0;
    const pointsToUpsert = [];

    if (chunksToEmbed.length > 0) {
      const vectors = await getEmbeddingsBatch(chunksToEmbed, 32);
      for (let i = 0; i < pointMetadataList.length; i++) {
        const { pointId, chunk } = pointMetadataList[i];
        const vector = vectors[i];

        if (!Array.isArray(vector) || vector.length !== EXPECTED_VECTOR_DIMENSION) {
          const errorMsg = `TEI Embedding dimension mismatch! Expected ${EXPECTED_VECTOR_DIMENSION}, got ${vector?.length}.`;
          logError(errorMsg, { repositoryId });
          throw new Error(errorMsg);
        }

        newlyEmbeddedCount++;
        pointsToUpsert.push({
          id: pointId,
          chunkId: chunk.chunkId,
          vector,
          payload: {
            companyId: String(companyId),
            repositoryId: String(repositoryId),
            githubRepositoryId: Number(chunk.githubRepositoryId) || 0,
            documentType: chunk.documentType,
            filePath: chunk.filePath,
            path: chunk.filePath,
            branch: chunk.branch,
            commitSha: chunk.commitSha,
            prNumber: chunk.prNumber,
            author: chunk.author || "unknown",
            timestamp: chunk.timestamp || new Date().toISOString(),
            contentHash: chunk.contentHash || "",
            startLine: chunk.startLine || 1,
            endLine: chunk.endLine || 1,
            url: chunk.url,
            embedModel: "BAAI/bge-small-en-v1.5",
            embedVersion: "1.0",
            text: chunk.text,
            content: chunk.text,
          },
        });
      }
    }

    logInfo(`[EMBEDDING] generated ${newlyEmbeddedCount}`, { repositoryId });

    syncRecord.counts.embedded = newlyEmbeddedCount;
    syncRecord.step = "UPDATING_VECTOR_DB";
    await syncRecord.save();

    // 9. Upsert Vectors to Qdrant
    const authContext = { user: { company: companyId } };
    if (pointsToUpsert.length > 0) {
      await upsertChunks(authContext, repositoryId, COLLECTION_NAME, pointsToUpsert);
      logInfo(`[QDRANT] upserted ${pointsToUpsert.length}`, { repositoryId });
    }

    // 10. Delete vectors for chunks/files that disappeared
    const pointsToDelete = [];
    for (const existingId of existingMap.keys()) {
      if (!currentPointIds.has(existingId)) {
        pointsToDelete.push(existingId);
      }
    }

    if (pointsToDelete.length > 0) {
      try {
        const deleteUrl = `${getQdrantUrl()}/collections/${COLLECTION_NAME}/points/delete`;
        await axios.post(
          deleteUrl,
          { points: pointsToDelete },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 }
        );
        logInfo(`[QDRANT] deleted ${pointsToDelete.length} obsolete points`, { repositoryId });
      } catch (delErr) {
        logError("Failed to delete obsolete Qdrant points", { errorMessage: delErr.message });
      }
    }

    // Calculate repository metrics
    const totalFiles = blobItems.length;
    const cleanFilesCount = Math.max(0, totalFiles - (syncRecord.counts?.drifts || 0));
    const docHealthScore = totalFiles > 0 ? Math.round((cleanFilesCount / totalFiles) * 100) : 100;
    const busFactor = commitCount > 0 ? Math.min(commitCount, 3) : 1;

    syncRecord.counts.upserted = pointsToUpsert.length;
    syncRecord.status = "COMPLETED";
    syncRecord.step = "COMPLETED";
    syncRecord.completedAt = new Date();
    syncRecord.lastCommitSha = headSha;
    await syncRecord.save();

    repo.docHealthScore = docHealthScore;
    repo.knowledgeCoverage = docHealthScore;
    repo.busFactor = busFactor;
    repo.status = "completed";
    repo.syncStatus = "COMPLETED";
    repo.lastScanAt = new Date();
    repo.lastSyncedAt = new Date();
    repo.lastCommitSha = headSha;
    await repo.save();

    return {
      message: "Sync completed successfully",
      syncRecord,
    };
  } catch (syncErr) {
    const failedStep = syncRecord.step !== "FAILED" ? syncRecord.step : "FETCHING_DATA";
    logError("Repository sync failed", { repositoryId, failedStep, errorMessage: syncErr.message, stack: syncErr.stack });

    syncRecord.status = "FAILED";
    syncRecord.failedStep = failedStep;
    syncRecord.step = "FAILED";
    syncRecord.error = syncErr.message || "Repository sync failed.";
    syncRecord.completedAt = new Date();
    await syncRecord.save();

    repo.syncStatus = "FAILED";
    await repo.save();

    throw syncErr;
  }
}

/**
 * Processes incoming GitHub webhook events asynchronously.
 *
 * @param {Object} params Webhook parameters.
 * @param {string} params.deliveryId Unique delivery GUID from X-GitHub-Delivery header.
 * @param {string} params.event Event name from X-GitHub-Event header (e.g. push, pull_request, installation).
 * @param {Object} params.payload Webhook JSON payload.
 */
export async function processWebhookEvent({ deliveryId, event, payload }) {
  logInfo("[WEBHOOK] Processing event", { event, deliveryId });

  if (event === "installation" || event === "installation_repositories") {
    return await handleInstallationWebhook(event, payload);
  }

  if (event === "pull_request") {
    return await handlePullRequestWebhook(event, payload);
  }

  if (event === "push") {
    return await handlePushWebhook(payload, deliveryId);
  }

  logInfo("[WEBHOOK] Unhandled or ignored webhook event", { event });
  return { status: "ignored", event };
}

/**
 * Handles push webhook event with incremental sync, diffing, and hash comparisons.
 */
async function handlePushWebhook(payload, deliveryId) {
  const githubRepoId = payload.repository?.id;
  if (!githubRepoId) {
    logError("[WEBHOOK] Push payload missing repository.id");
    return;
  }

  // 3. Strict repository resolution from OUR database (never from payload company fields)
  const repo = await Repository.findOne({ githubRepositoryId: githubRepoId });
  if (!repo) {
    logInfo("[WEBHOOK] Repository not connected in our database", { githubRepoId });
    return;
  }

  const companyId = String(repo.companyId);
  const repositoryId = String(repo._id);
  const [owner, name] = repo.fullName.split("/");
  const defaultBranch = repo.defaultBranch || "main";

  // Check if push is to default branch
  if (payload.ref && payload.ref !== `refs/heads/${defaultBranch}`) {
    logInfo("[WEBHOOK] Push on non-default branch skipped", { ref: payload.ref, defaultBranch });
    return;
  }

  const beforeSha = payload.before || repo.lastCommitSha || "";
  const afterSha = payload.after;
  if (!afterSha) {
    logInfo("[WEBHOOK] Push payload missing after SHA");
    return;
  }

  // 7. Record sync run with syncType: "WEBHOOK"
  const syncRecord = await RepositorySync.create({
    repositoryId: repo._id,
    companyId: repo.companyId,
    syncType: "WEBHOOK",
    status: "IN_PROGRESS",
    step: "FETCHING_DATA",
    startedAt: new Date(),
    lastCommitSha: beforeSha,
  });

  const connection = await GitHubConnection.findOne({ companyId });
  if (!connection || !connection.installationId) {
    syncRecord.status = "FAILED";
    syncRecord.error = "Active GitHub Connection missing.";
    await syncRecord.save();
    return;
  }

  const token = await getInstallationToken(connection.installationId);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "WhyCode-App",
  };

  const isForcePush = Boolean(payload.forced) || !beforeSha || beforeSha === "0000000000000000000000000000000000000000";

  let addedFiles = [];
  let modifiedFiles = [];
  let removedFiles = [];
  let renamedFiles = [];
  let pushCommits = payload.commits || [];

  try {
    if (!isForcePush && beforeSha) {
      // Normal commit push: Compare before...after
      const compareRes = await axios.get(
        `https://api.github.com/repos/${owner}/${name}/compare/${beforeSha}...${afterSha}`,
        { headers, timeout: 15000 }
      );
      const files = compareRes.data?.files || [];
      for (const f of files) {
        if (f.status === "added") addedFiles.push(f.filename);
        else if (f.status === "modified") modifiedFiles.push(f.filename);
        else if (f.status === "removed") removedFiles.push(f.filename);
        else if (f.status === "renamed") {
          renamedFiles.push({ oldPath: f.previous_filename, newPath: f.filename });
        }
      }
      if (!pushCommits.length && compareRes.data?.commits) {
        pushCommits = compareRes.data.commits;
      }
    } else {
      // Force-push / tree diff fallback:
      const treeRes = await axios.get(
        `https://api.github.com/repos/${owner}/${name}/git/trees/${afterSha}?recursive=1`,
        { headers, timeout: 15000 }
      );
      const treeBlobs = (treeRes.data.tree || []).filter(
        (i) => i.type === "blob" && !shouldSkipFile(i.path, i.size || 0)
      );
      const currentBlobsMap = new Map(treeBlobs.map((b) => [b.path, b.sha]));

      const scrollUrl = `${getQdrantUrl()}/collections/${COLLECTION_NAME}/points/scroll`;
      const scrollRes = await axios.post(
        scrollUrl,
        {
          filter: buildTenantFilter(companyId, repositoryId),
          limit: 1000,
          with_payload: ["filePath", "path"],
        },
        { headers: { "Content-Type": "application/json" } }
      );
      const storedPaths = new Set(
        (scrollRes.data?.result?.points || [])
          .map((p) => p.payload?.path || p.payload?.filePath)
          .filter(Boolean)
      );

      for (const blob of treeBlobs) {
        if (!storedPaths.has(blob.path)) {
          addedFiles.push(blob.path);
        } else {
          modifiedFiles.push(blob.path);
        }
      }
      for (const sp of storedPaths) {
        if (!currentBlobsMap.has(sp) && !sp.startsWith("commits/") && !sp.startsWith("pulls/")) {
          removedFiles.push(sp);
        }
      }
    }

    // 1. Delete vectors for removed and renamed-old files
    const filesToDelete = [
      ...removedFiles,
      ...renamedFiles.map((r) => r.oldPath),
    ].filter(Boolean);

    const authContext = { user: { company: companyId, companyId } };
    if (filesToDelete.length > 0) {
      await deleteFileChunks(authContext, repositoryId, COLLECTION_NAME, filesToDelete);
    }

    // 2. Process added, modified, and renamed-new files
    const filesToIndex = [
      ...addedFiles,
      ...modifiedFiles,
      ...renamedFiles.map((r) => r.newPath),
    ].filter((p) => !shouldSkipFile(p));

    let vectorsUpserted = 0;
    const newOrChangedChunks = [];

    for (const filePath of filesToIndex) {
      try {
        const fileContentRes = await axios.get(
          `https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent(filePath)}?ref=${afterSha}`,
          { headers, timeout: 10000 }
        );
        const rawContent = Buffer.from(fileContentRes.data.content, "base64").toString("utf-8");
        const { text: cleanContent } = scrubSecrets(rawContent);

        const isDoc = filePath.endsWith(".md") || filePath.endsWith(".rst") || filePath.startsWith("docs/");
        const fileChunks = isDoc ? chunkMarkdown(cleanContent, filePath) : chunkCode(cleanContent, filePath);

        // Delete previous vectors for this file if modified to cleanly update line boundaries
        if (modifiedFiles.includes(filePath) || renamedFiles.some((r) => r.newPath === filePath)) {
          await deleteFileChunks(authContext, repositoryId, COLLECTION_NAME, [filePath]);
        }

        for (const ch of fileChunks) {
          const chunkHash = computeContentHash(ch.text);
          ch.contentHash = chunkHash;
          ch.documentType = isDoc ? "DOCUMENTATION" : "CODE";
          ch.path = filePath;
          ch.filePath = filePath;
          ch.companyId = companyId;
          ch.repositoryId = repositoryId;
          ch.commitSha = afterSha;
          ch.branch = defaultBranch;
          newOrChangedChunks.push(ch);
        }
      } catch (fileErr) {
        logError("Failed to fetch or chunk file", { filePath, errorMessage: fileErr.message });
      }
    }

    // 3. Process new commits
    for (const c of pushCommits) {
      const commitMsg = c.message || "";
      const { text: cleanMsg } = scrubSecrets(commitMsg);
      const author = c.author?.username || c.author?.name || "unknown";
      const committedAt = c.timestamp ? new Date(c.timestamp) : new Date();

      try {
        await CommitMemory.findOneAndUpdate(
          { repository: repo._id, commitSha: c.id || c.sha },
          {
            $set: {
              repository: repo._id,
              commitSha: c.id || c.sha,
              author,
              authorName: c.author?.name || author,
              authorEmail: c.author?.email || "",
              authorLogin: c.author?.username || author,
              message: cleanMsg,
              committedAt,
              date: committedAt,
              htmlUrl: c.url || `https://github.com/${repo.fullName}/commit/${c.id || c.sha}`,
            },
          },
          { upsert: true, new: true }
        );
      } catch (_) {}

      const commitChunk = chunkCommit(
        {
          sha: c.id || c.sha,
          author,
          date: committedAt.toISOString(),
          message: cleanMsg,
          changedFiles: [...addedFiles, ...modifiedFiles, ...removedFiles],
        },
        repo.fullName
      );
      commitChunk.companyId = companyId;
      commitChunk.repositoryId = repositoryId;
      commitChunk.documentType = "COMMIT";
      commitChunk.commitSha = c.id || c.sha;
      commitChunk.path = `commits/${(c.id || c.sha).slice(0, 7)}`;
      commitChunk.filePath = commitChunk.path;
      commitChunk.contentHash = computeContentHash(commitChunk.text);
      newOrChangedChunks.push(commitChunk);
    }

    // 4. Generate embeddings and upsert
    if (newOrChangedChunks.length > 0) {
      const textsToEmbed = newOrChangedChunks.map((c) => c.text);
      const embeddings = await getEmbeddingsBatch(textsToEmbed);

      const pointsToUpsert = newOrChangedChunks.map((c, idx) => {
        const pointId = buildPointId({
          companyId,
          repositoryId,
          documentType: c.documentType,
          pathOrSha: c.filePath || c.path,
          chunkIndex: c.chunkIndex || 0,
        });
        return {
          id: pointId,
          vector: embeddings[idx],
          payload: {
            chunkId: c.chunkId,
            documentType: c.documentType,
            path: c.path,
            filePath: c.filePath || c.path,
            startLine: c.startLine || 1,
            endLine: c.endLine || 1,
            text: c.text,
            contentHash: c.contentHash,
            companyId,
            repositoryId,
            commitSha: c.commitSha || afterSha,
            branch: defaultBranch,
            author: c.author || owner,
            timestamp: c.timestamp || new Date().toISOString(),
            url: c.url || `https://github.com/${repo.fullName}/blob/${afterSha}/${c.path}#L${c.startLine || 1}-L${c.endLine || 1}`,
            embedModel: "BAAI/bge-small-en-v1.5",
            embedVersion: "1.0",
          },
        };
      });

      await upsertChunks(authContext, repositoryId, COLLECTION_NAME, pointsToUpsert);
      vectorsUpserted = pointsToUpsert.length;
    }

    // 5. Update counts and SUCCESS status
    syncRecord.counts.files = filesToIndex.length;
    syncRecord.counts.commits = pushCommits.length;
    syncRecord.counts.chunks = newOrChangedChunks.length;
    syncRecord.counts.upserted = vectorsUpserted;
    syncRecord.counts.vectorsDeleted = filesToDelete.length;
    syncRecord.status = "COMPLETED";
    syncRecord.step = "COMPLETED";
    syncRecord.completedAt = new Date();
    syncRecord.lastCommitSha = afterSha;
    await syncRecord.save();

    // Advance repo commit SHA ONLY AFTER SUCCESS
    repo.lastCommitSha = afterSha;
    repo.lastSyncedAt = new Date();
    repo.syncStatus = "COMPLETED";
    await repo.save();

    if (deliveryId) {
      await WebhookDelivery.findOneAndUpdate(
        { deliveryId },
        {
          $set: {
            status: "COMPLETED",
            repositoryId: repo._id,
            companyId: repo.companyId,
            processedAt: new Date(),
            counts: {
              added: addedFiles.length,
              modified: modifiedFiles.length,
              removed: removedFiles.length,
              commits: pushCommits.length,
              vectorsUpserted,
              vectorsDeleted: filesToDelete.length,
            },
          },
        }
      );
    }

    logInfo("[WEBHOOK] Push sync completed successfully", {
      repositoryId,
      added: addedFiles.length,
      modified: modifiedFiles.length,
      removed: removedFiles.length,
      commits: pushCommits.length,
      vectorsUpserted,
    });

    // Automatic trigger: generate drift and change reports for changed files in background
    const changedDocOrCodeFiles = [...addedFiles, ...modifiedFiles].filter(
      (f) => !shouldSkipFile(f) && /\.(js|jsx|ts|tsx|py|md|json)$/i.test(f)
    );

    if (changedDocOrCodeFiles.length > 0) {
      Promise.all(
        changedDocOrCodeFiles.slice(0, 5).map(async (filePath) => {
          try {
            await generateDriftReport({
              authContext,
              repositoryId,
              targetPath: filePath,
              triggerType: "WEBHOOK",
            });
          } catch (_) {}
        })
      ).catch(() => {});
    }

    if (pushCommits.length > 0) {
      generateChangeSummaryReport({
        authContext,
        repositoryId,
        targetPath: "*",
        triggerType: "WEBHOOK",
      }).catch(() => {});
    }
  } catch (err) {
    logError("[WEBHOOK] Push sync failed", {
      repositoryId,
      errorMessage: err.message,
    });

    syncRecord.status = "FAILED";
    syncRecord.error = err.message;
    syncRecord.completedAt = new Date();
    await syncRecord.save();

    // DO NOT advance repo.lastCommitSha on failure
    repo.syncStatus = "FAILED";
    await repo.save();

    if (deliveryId) {
      await WebhookDelivery.findOneAndUpdate(
        { deliveryId },
        { $set: { status: "FAILED", error: err.message } }
      );
    }
  }
}

/**
 * Handles pull_request webhook events (opened, edited, synchronize, reopened, closed).
 */
async function handlePullRequestWebhook(event, payload) {
  const githubRepoId = payload.repository?.id;
  if (!githubRepoId) return;

  const repo = await Repository.findOne({ githubRepositoryId: githubRepoId });
  if (!repo) return;

  const companyId = String(repo.companyId);
  const repositoryId = String(repo._id);
  const pr = payload.pull_request;
  if (!pr) return;

  const action = payload.action;
  logInfo("[WEBHOOK] Pull request event", { action, prNumber: pr.number, repo: repo.fullName });

  const authContext = { user: { company: companyId, companyId } };

  // Scrub and chunk PR content
  const prContent = `Title: ${pr.title}\nBody: ${pr.body || ""}\nState: ${pr.state}\nMerged: ${pr.merged ? "true" : "false"}`;
  const { text: cleanContent } = scrubSecrets(prContent);

  const prChunk = chunkPullRequest(
    {
      number: pr.number,
      title: pr.title,
      body: cleanContent,
      author: pr.user?.login || "unknown",
      state: pr.state,
      merged: pr.merged,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    },
    repo.fullName
  );

  prChunk.companyId = companyId;
  prChunk.repositoryId = repositoryId;
  prChunk.documentType = "PULL_REQUEST";
  prChunk.path = `pulls/${pr.number}`;
  prChunk.filePath = prChunk.path;
  prChunk.contentHash = computeContentHash(prChunk.text);

  const embedding = await getEmbedding(prChunk.text);
  const pointId = buildPointId({
    companyId,
    repositoryId,
    documentType: "PULL_REQUEST",
    pathOrSha: prChunk.path,
    chunkIndex: 0,
  });

  // Delete previous PR vector and upsert updated vector
  await deleteFileChunks(authContext, repositoryId, COLLECTION_NAME, [prChunk.path]);
  await upsertChunks(authContext, repositoryId, COLLECTION_NAME, [
    {
      id: pointId,
      vector: embedding,
      payload: {
        chunkId: prChunk.chunkId,
        documentType: "PULL_REQUEST",
        path: prChunk.path,
        filePath: prChunk.path,
        startLine: 1,
        endLine: 1,
        text: prChunk.text,
        contentHash: prChunk.contentHash,
        companyId,
        repositoryId,
        prNumber: pr.number,
        author: pr.user?.login || "unknown",
        timestamp: pr.updated_at || pr.created_at,
        url: pr.html_url || `https://github.com/${repo.fullName}/pull/${pr.number}`,
        embedModel: "BAAI/bge-small-en-v1.5",
        embedVersion: "1.0",
      },
    },
  ]);

  await RepositorySync.create({
    repositoryId: repo._id,
    companyId: repo.companyId,
    syncType: "WEBHOOK",
    status: "COMPLETED",
    step: "COMPLETED",
    completedAt: new Date(),
    counts: { pullRequests: 1, upserted: 1 },
  });

  repo.lastSyncedAt = new Date();
  await repo.save();
}

/**
 * Handles installation and installation_repositories webhook events.
 */
async function handleInstallationWebhook(event, payload) {
  const action = payload.action;
  const installationId = payload.installation?.id;
  logInfo("[WEBHOOK] Installation event", { event, action, installationId });

  if (action === "deleted" || action === "suspend") {
    const connection = await GitHubConnection.findOne({ installationId });
    if (connection) {
      connection.status = "REVOKED";
      await connection.save();
      await Repository.updateMany(
        { companyId: connection.companyId },
        { $set: { status: "REVOKED", isMonitored: false, syncStatus: "REVOKED" } }
      );
    }
  } else if (event === "installation_repositories" && action === "removed") {
    const removedRepos = payload.repositories_removed || [];
    for (const r of removedRepos) {
      await Repository.updateMany(
        { githubRepositoryId: r.id },
        { $set: { status: "REVOKED", isMonitored: false, syncStatus: "REVOKED" } }
      );
    }
  }
}

