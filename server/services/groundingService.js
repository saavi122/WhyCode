import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import CommitMemory from "../models/CommitMemory.js";
import Repository from "../models/Repository.js";
import Company from "../models/Company.js";
import { validateTenantContext } from "./tenantGuard.js";
import { assertLlmAllowed, isLlmAllowed, PrivacyRefusalError } from "./privacyGuard.js";
import { searchChunks, fetchNeighbouringChunks } from "./qdrantStore.js";
import { getEmbedding, rerank } from "./teiService.js";
import { generateGroundedAnswer } from "./vllmService.js";
import { generateGeminiAnswer, isGeminiAvailable, geminiDailyTracker } from "./geminiService.js";
import { recordModelSwitch, recordRecovery } from "./modelSwitchTracker.js";
import { servicesConfig } from "../config/services.js";
import { toDisplayName } from "../utils/textUtils.js";
import { logInfo, logError } from "../utils/logger.js";

export { toDisplayName };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const INSUFFICIENT_EVIDENCE_MESSAGE = "I couldn't find sufficient evidence in the connected repository";
export const EVIDENCE_MODE_BANNER = "Answer model is offline: showing the most relevant repository evidence";

/**
 * Strips repository names/aliases and common scoping phrases from query text.
 * Safely handles any type of repoDoc or name without crashing.
 * @param {string} query User question.
 * @param {Object} [repoDoc] Repository document with name, fullName, owner.
 * @returns {string} Cleaned query text.
 */
export function cleanQueryText(query = "", repoDoc = null) {
  if (!query || typeof query !== "string") return "";
  let cleaned = String(query).trim();

  const toRemove = [];
  if (repoDoc && typeof repoDoc === "object") {
    if (repoDoc.fullName) toRemove.push(toDisplayName(repoDoc.fullName, ""));
    if (repoDoc.name) toRemove.push(toDisplayName(repoDoc.name, ""));
    if (repoDoc.repoName) toRemove.push(toDisplayName(repoDoc.repoName, ""));
    if (repoDoc.owner) toRemove.push(toDisplayName(repoDoc.owner, ""));
  }

  for (const rawName of toRemove) {
    const name = String(rawName || "").trim();
    if (!name || name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`\\b(?:in|of|for|about|from)\\s+(?:the\\s+)?(?:git\\s+history\\s+(?:of\\s+)?)?(?:repo(?:sitory)?\\s+)?${escaped}\\b`, "gi"),
      new RegExp(`\\b${escaped}\\b`, "gi"),
    ];
    for (const pat of patterns) {
      cleaned = cleaned.replace(pat, " ");
    }
  }

  cleaned = cleaned.replace(/\s+/g, " ").replace(/\s+([?,.!])/g, "$1").trim();
  return cleaned || String(query).trim();
}

/**
 * Detects structured git questions that can be answered directly from CommitMemory without vector similarity.
 * @param {string} query User question.
 * @returns {Object|null} Structured intent with type and extracted params.
 */
export function detectStructuredGitIntent(query = "") {
  if (!query || typeof query !== "string") return null;
  const q = String(query).trim();

  // 1. Contributor analytics / main contributors / top contributors / bus factor
  if (
    /\b(contributor\s+analytics|main\s+contributors?|top\s+contributors?|who\s+contributed(?:\s+the)?\s+most|who\s+wrote\s+the\s+most\s+code|who\s+committed(?:\s+the)?\s+most|commit\s+distribution|bus\s+factor|team\s+activity|contributor\s+stats|contributor\s+breakdown)\b/i.test(q) ||
    (/\bcontributors?\b/i.test(q) && /\b(show|list|analytics|stats|top|main|overview|summary|rank|who)\b/i.test(q))
  ) {
    return { type: "CONTRIBUTOR_ANALYTICS", limit: 10 };
  }

  // 2. Commit count
  if (/\b(how\s+many\s+commits|total\s+(?:number\s+of\s+)?commits|commit\s+count|number\s+of\s+commits)\b/i.test(q)) {
    return { type: "COMMIT_COUNT" };
  }

  // 3. Initial / first / root commits
  if (
    /\b(initial|first|earliest|root|oldest)\s+(?:git\s+)?commits?\b/i.test(q) ||
    /\bwhat\s+.*?\b(initial|first|earliest|root|oldest)\s+commits?\b/i.test(q) ||
    /\binitial\s+commit\b/i.test(q) ||
    /\bfirst\s+commit\b/i.test(q)
  ) {
    const numMatch = q.match(/\b(?:first|initial|earliest)\s+(\d+)\s+commits?\b/i) || q.match(/\b(\d+)\s+(?:first|initial|earliest)\s+commits?\b/i);
    const limit = numMatch ? parseInt(numMatch[1], 10) : 5;
    return { type: "INITIAL_COMMITS", limit };
  }

  // 4. Latest / recent / last commits
  if (
    /\b(latest|recent|newest|last)\s+(?:\d+\s+)?(?:git\s+)?commits?\b/i.test(q) ||
    /\bwhat\s+.*?\b(latest|recent|newest|last)\s+(?:\d+\s+)?commits?\b/i.test(q)
  ) {
    const numMatch = q.match(/\b(?:latest|recent|last|newest)\s+(\d+)\s+commits?\b/i) || q.match(/\b(\d+)\s+(?:latest|recent|last|newest)\s+commits?\b/i);
    const limit = numMatch ? parseInt(numMatch[1], 10) : 5;
    return { type: "LATEST_COMMITS", limit };
  }

  // 5. Commits touching specific file
  const fileMatch = q.match(/\b(?:commits?|history|changes?)\s+(?:touching|modifying|affecting|for|involving|to)\s+([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\b/i) ||
                    q.match(/\bhistory\s+of\s+([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\b/i);
  if (fileMatch) {
    return { type: "COMMITS_TOUCHING_FILE", file: String(fileMatch[1]), limit: 10 };
  }

  // 6. Commits by author
  const authorMatch = q.match(/\b(?:commits?|contributions?)\s+(?:by|authored\s+by|from|made\s+by)\s+([a-zA-Z0-9_\-]+)\b/i) ||
                      q.match(/\bwhat\s+did\s+([a-zA-Z0-9_\-]+)\s+commit\b/i) ||
                      q.match(/\b([a-zA-Z0-9_\-]+)'s\s+commits\b/i);
  if (authorMatch && !["git", "the", "this", "my", "our", "all", "each", "any"].includes(authorMatch[1].toLowerCase())) {
    return { type: "COMMITS_BY_AUTHOR", author: String(authorMatch[1]), limit: 10 };
  }

  // 7. Merge commits
  if (/\b(merge\s+commits?|pull\s+request\s+merges?|pr\s+merges?)\b/i.test(q)) {
    return { type: "MERGE_COMMITS", limit: 10 };
  }

  return null;
}

/**
 * Resolves structured git questions directly from CommitMemory in MongoDB.
 * Cites actual commit SHAs, authors, dates, and messages without hallucination.
 *
 * @param {Object} intent Detected structured intent.
 * @param {string} repositoryId Target repository ID.
 * @param {Object} [repoDoc] Target repository doc.
 * @returns {Promise<Object|null>} Grounded answer or null if no structured records found.
 */
export async function resolveStructuredGitAnswer(intent, repositoryId, repoDoc = null) {
  if (!intent) return null;
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const repoQuery = {
      $or: [
        { repository: repositoryId },
      ],
    };

    if (mongoose.Types.ObjectId.isValid(repositoryId)) {
      repoQuery.$or.push({ repository: new mongoose.Types.ObjectId(repositoryId) });
    }
    if (repoDoc?._id) {
      repoQuery.$or.push({ repository: repoDoc._id });
      if (mongoose.Types.ObjectId.isValid(repoDoc._id)) {
        repoQuery.$or.push({ repository: new mongoose.Types.ObjectId(repoDoc._id) });
      }
    }

    const repoName = toDisplayName(repoDoc?.name || repoDoc?.fullName, "the connected repository");

    // 1. CONTRIBUTOR ANALYTICS: Top contributors, commit distribution, and bus factor
    if (intent.type === "CONTRIBUTOR_ANALYTICS") {
      const commits = await CommitMemory.find(repoQuery)
        .sort({ committedAt: 1, date: 1 })
        .lean();

      if (!commits || commits.length === 0) return null;

      const totalCommits = commits.length;
      const contributorMap = new Map();

      for (const c of commits) {
        const email = String(c.authorEmail || "").trim().toLowerCase();
        const rawName = toDisplayName(c.authorName || c.author || c.authorLogin || email.split("@")[0] || "Unknown");
        const key = email || rawName.toLowerCase();

        const date = c.committedAt ? new Date(c.committedAt) : (c.date ? new Date(c.date) : new Date());
        const additions = Number(c.stats?.additions) || 0;
        const deletions = Number(c.stats?.deletions) || 0;

        if (!contributorMap.has(key)) {
          contributorMap.set(key, {
            name: rawName,
            email: email || undefined,
            commits: 0,
            additions: 0,
            deletions: 0,
            firstCommitAt: date.toISOString(),
            lastCommitAt: date.toISOString(),
            latestCommitSha: c.commitSha,
            latestMessage: c.message,
          });
        }

        const entry = contributorMap.get(key);
        entry.commits += 1;
        entry.additions += additions;
        entry.deletions += deletions;
        if (date.toISOString() > entry.lastCommitAt) {
          entry.lastCommitAt = date.toISOString();
          entry.latestCommitSha = c.commitSha;
          entry.latestMessage = c.message;
        }
        if (rawName && rawName !== "Unknown" && entry.name === "Unknown") {
          entry.name = rawName;
        }
      }

      const contributors = Array.from(contributorMap.values())
        .map((cnt) => ({
          ...cnt,
          share: totalCommits > 0 ? Number((cnt.commits / totalCommits).toFixed(3)) : 1,
          percentage: totalCommits > 0 ? Math.round((cnt.commits / totalCommits) * 100) : 100,
        }))
        .sort((a, b) => b.commits - a.commits);

      const topContributor = contributors[0] || { name: "Unknown", commits: totalCommits, percentage: 100 };
      const busFactor = contributors.length > 0 ? Math.min(contributors.length, 3) : 1;

      const tableRows = contributors.slice(0, intent.limit || 10).map((cnt, idx) => {
        const firstStr = cnt.firstCommitAt ? new Date(cnt.firstCommitAt).toLocaleDateString() : "-";
        const lastStr = cnt.lastCommitAt ? new Date(cnt.lastCommitAt).toLocaleDateString() : "-";
        return `| **${idx + 1}. ${cnt.name}** | ${cnt.commits} | ${cnt.percentage}% | ${firstStr} | ${lastStr} |`;
      }).join("\n");

      const answer = `Here is the contributor analytics breakdown for **${repoName}**:\n\n` +
        `**Overview:**\n` +
        `- Total Commits: **${totalCommits}**\n` +
        `- Unique Contributors: **${contributors.length}**\n` +
        `- Top Contributor: **${topContributor.name}** (${topContributor.commits} commits, ${topContributor.percentage}% share)\n` +
        `- Estimated Bus Factor: **${busFactor}**\n\n` +
        `| Contributor | Commits | Share | First Commit | Last Commit |\n` +
        `| :--- | :--- | :--- | :--- | :--- |\n` +
        `${tableRows}`;

      const citations = contributors.slice(0, 5).map((cnt, i) => ({
        evidenceId: `CM${i + 1}`,
        chunkId: `cm-${cnt.latestCommitSha || i}`,
        type: "commit",
        commitSha: cnt.latestCommitSha || "",
        author: cnt.name,
        date: cnt.lastCommitAt,
        url: repoDoc?.fullName && cnt.latestCommitSha ? `https://github.com/${repoDoc.fullName}/commit/${cnt.latestCommitSha}` : "",
        reference: cnt.latestCommitSha ? `commit:${String(cnt.latestCommitSha).slice(0, 7)}` : `contributor:${cnt.name}`,
        excerpt: cnt.latestMessage || `${cnt.name} has ${cnt.commits} commits (${cnt.percentage}% share)`,
      }));

      return {
        type: "contributors",
        status: "ok",
        answer,
        data: contributors,
        citations,
        sources: citations,
        grounded: true,
        confidence: 0.95,
        answerMode: "structured_git",
        answeredBy: {
          engine: "primary",
          provider: "WhyCode Git Intelligence",
          model: "structured_git",
        },
      };
    }

    // 2. Commit count
    if (intent.type === "COMMIT_COUNT") {
      const count = await CommitMemory.countDocuments(repoQuery);
      if (count === 0) return null;

      const latestCommits = await CommitMemory.find(repoQuery).sort({ committedAt: -1, date: -1 }).limit(3).lean();
      let answer = `The repository **${repoName}** has **${count}** recorded commits in its Git history.`;
      if (latestCommits.length > 0) {
        answer += `\n\n**Recent commits:**\n` + latestCommits.map((c) => {
          const shaShort = String(c.commitSha || "").slice(0, 7);
          const author = toDisplayName(c.authorName || c.author || "Unknown");
          const dateStr = c.committedAt || c.date ? new Date(c.committedAt || c.date).toLocaleDateString() : "";
          return `- \`${shaShort}\` - *${c.message || "No message"}* (${author}, ${dateStr})`;
        }).join("\n");
      }

      const citations = latestCommits.map((c, i) => ({
        evidenceId: `CM${i + 1}`,
        chunkId: `cm-${c.commitSha}`,
        type: "commit",
        commitSha: c.commitSha,
        author: toDisplayName(c.authorName || c.author || ""),
        date: c.committedAt ? new Date(c.committedAt).toISOString() : (c.date ? new Date(c.date).toISOString() : ""),
        url: c.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${c.commitSha}` : ""),
        reference: `commit:${String(c.commitSha || "").slice(0, 7)}`,
        excerpt: c.message || "",
      }));

      return {
        type: "commits",
        status: "ok",
        answer,
        data: latestCommits,
        citations,
        sources: citations,
        grounded: true,
        confidence: 0.95,
        answerMode: "structured_git",
        answeredBy: {
          engine: "primary",
          provider: "WhyCode Git Intelligence",
          model: "structured_git",
        },
      };
    }

    // 3. Initial commits
    if (intent.type === "INITIAL_COMMITS") {
      const commits = await CommitMemory.find(repoQuery)
        .sort({ committedAt: 1, date: 1 })
        .limit(intent.limit || 5)
        .lean();

      if (!commits || commits.length === 0) return null;

      const commitLines = commits.map((c, idx) => {
        const shaShort = String(c.commitSha || "").slice(0, 7);
        const author = toDisplayName(c.authorName || c.author || "Unknown");
        const dateStr = c.committedAt || c.date ? new Date(c.committedAt || c.date).toLocaleDateString() : "";
        const files = c.filesChanged && c.filesChanged.length > 0 ? ` (files: ${c.filesChanged.slice(0, 3).join(", ")})` : "";
        return `${idx + 1}. **\`${shaShort}\`** - *${c.message || "No message"}*\n   - **Author**: ${author}\n   - **Date**: ${dateStr}\n   - **SHA**: \`${c.commitSha}\`${files}`;
      }).join("\n\n");

      const answer = `Here are the initial commits in the Git history of **${repoName}**:\n\n${commitLines}`;
      const citations = commits.map((c, i) => ({
        evidenceId: `CM${i + 1}`,
        chunkId: `cm-${c.commitSha}`,
        type: "commit",
        commitSha: c.commitSha,
        author: toDisplayName(c.authorName || c.author || ""),
        date: c.committedAt ? new Date(c.committedAt).toISOString() : (c.date ? new Date(c.date).toISOString() : ""),
        url: c.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${c.commitSha}` : ""),
        reference: `commit:${String(c.commitSha || "").slice(0, 7)}`,
        excerpt: c.message || "",
      }));

      return {
        type: "commits",
        status: "ok",
        answer,
        data: commits,
        citations,
        sources: citations,
        grounded: true,
        confidence: 0.95,
        answerMode: "structured_git",
        answeredBy: {
          engine: "primary",
          provider: "WhyCode Git Intelligence",
          model: "structured_git",
        },
      };
    }

    // 4. Latest commits
    if (intent.type === "LATEST_COMMITS") {
      const commits = await CommitMemory.find(repoQuery)
        .sort({ committedAt: -1, date: -1 })
        .limit(intent.limit || 5)
        .lean();

      if (!commits || commits.length === 0) return null;

      const commitLines = commits.map((c, idx) => {
        const shaShort = String(c.commitSha || "").slice(0, 7);
        const author = toDisplayName(c.authorName || c.author || "Unknown");
        const dateStr = c.committedAt || c.date ? new Date(c.committedAt || c.date).toLocaleDateString() : "";
        const files = c.filesChanged && c.filesChanged.length > 0 ? ` (files: ${c.filesChanged.slice(0, 3).join(", ")})` : "";
        return `${idx + 1}. **\`${shaShort}\`** - *${c.message || "No message"}*\n   - **Author**: ${author}\n   - **Date**: ${dateStr}\n   - **SHA**: \`${c.commitSha}\`${files}`;
      }).join("\n\n");

      const answer = `Here are the latest ${commits.length} commits in the Git history of **${repoName}**:\n\n${commitLines}`;
      const citations = commits.map((c, i) => ({
        evidenceId: `CM${i + 1}`,
        chunkId: `cm-${c.commitSha}`,
        type: "commit",
        commitSha: c.commitSha,
        author: toDisplayName(c.authorName || c.author || ""),
        date: c.committedAt ? new Date(c.committedAt).toISOString() : (c.date ? new Date(c.date).toISOString() : ""),
        url: c.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${c.commitSha}` : ""),
        reference: `commit:${String(c.commitSha || "").slice(0, 7)}`,
        excerpt: c.message || "",
      }));

      return {
        type: "commits",
        status: "ok",
        answer,
        data: commits,
        citations,
        sources: citations,
        grounded: true,
        confidence: 0.95,
        answerMode: "structured_git",
        answeredBy: {
          engine: "primary",
          provider: "WhyCode Git Intelligence",
          model: "structured_git",
        },
      };
    }

    // 5. Commits by author
    if (intent.type === "COMMITS_BY_AUTHOR") {
      const authorSafe = String(intent.author || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const authorRegex = new RegExp(authorSafe, "i");
      const authorQuery = {
        ...repoQuery,
        $or: [
          { author: authorRegex },
          { authorName: authorRegex },
          { authorLogin: authorRegex },
          { authorEmail: authorRegex },
        ],
      };

      const commits = await CommitMemory.find(authorQuery)
        .sort({ committedAt: -1, date: -1 })
        .limit(intent.limit || 10)
        .lean();

      if (!commits || commits.length === 0) return null;

      const commitLines = commits.map((c, idx) => {
        const shaShort = String(c.commitSha || "").slice(0, 7);
        const dateStr = c.committedAt || c.date ? new Date(c.committedAt || c.date).toLocaleDateString() : "";
        return `${idx + 1}. **\`${shaShort}\`** - *${c.message || "No message"}* (${dateStr})\n   - **SHA**: \`${c.commitSha}\``;
      }).join("\n\n");

      const answer = `Found **${commits.length}** commit(s) by **${intent.author}** in **${repoName}**:\n\n${commitLines}`;
      const citations = commits.map((c, i) => ({
        evidenceId: `CM${i + 1}`,
        chunkId: `cm-${c.commitSha}`,
        type: "commit",
        commitSha: c.commitSha,
        author: toDisplayName(c.authorName || c.author || intent.author),
        date: c.committedAt ? new Date(c.committedAt).toISOString() : (c.date ? new Date(c.date).toISOString() : ""),
        url: c.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${c.commitSha}` : ""),
        reference: `commit:${String(c.commitSha || "").slice(0, 7)}`,
        excerpt: c.message || "",
      }));

      return {
        type: "commits",
        status: "ok",
        answer,
        data: commits,
        citations,
        sources: citations,
        grounded: true,
        confidence: 0.95,
        answerMode: "structured_git",
        answeredBy: {
          engine: "primary",
          provider: "WhyCode Git Intelligence",
          model: "structured_git",
        },
      };
    }

    // 6. Commits touching file
    if (intent.type === "COMMITS_TOUCHING_FILE") {
      const fileSafe = String(intent.file || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fileRegex = new RegExp(fileSafe, "i");
      const fileQuery = {
        ...repoQuery,
        filesChanged: fileRegex,
      };

      const commits = await CommitMemory.find(fileQuery)
        .sort({ committedAt: -1, date: -1 })
        .limit(intent.limit || 10)
        .lean();

      if (!commits || commits.length === 0) return null;

      const commitLines = commits.map((c, idx) => {
        const shaShort = String(c.commitSha || "").slice(0, 7);
        const author = toDisplayName(c.authorName || c.author || "Unknown");
        const dateStr = c.committedAt || c.date ? new Date(c.committedAt || c.date).toLocaleDateString() : "";
        return `${idx + 1}. **\`${shaShort}\`** - *${c.message || "No message"}* (${author}, ${dateStr})\n   - **SHA**: \`${c.commitSha}\``;
      }).join("\n\n");

      const answer = `Found **${commits.length}** commit(s) modifying \`${intent.file}\` in **${repoName}**:\n\n${commitLines}`;
      const citations = commits.map((c, i) => ({
        evidenceId: `CM${i + 1}`,
        chunkId: `cm-${c.commitSha}`,
        type: "commit",
        commitSha: c.commitSha,
        author: toDisplayName(c.authorName || c.author || ""),
        date: c.committedAt ? new Date(c.committedAt).toISOString() : (c.date ? new Date(c.date).toISOString() : ""),
        url: c.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${c.commitSha}` : ""),
        reference: `commit:${String(c.commitSha || "").slice(0, 7)}`,
        excerpt: c.message || "",
      }));

      return {
        type: "commits",
        status: "ok",
        answer,
        data: commits,
        citations,
        sources: citations,
        grounded: true,
        confidence: 0.95,
        answerMode: "structured_git",
        answeredBy: {
          engine: "primary",
          provider: "WhyCode Git Intelligence",
          model: "structured_git",
        },
      };
    }

    // 7. Merge commits
    if (intent.type === "MERGE_COMMITS") {
      const mergeQuery = {
        ...repoQuery,
        $or: [
          { "parentShas.1": { $exists: true } },
          { message: /^Merge\s+/i },
        ],
      };

      const commits = await CommitMemory.find(mergeQuery)
        .sort({ committedAt: -1, date: -1 })
        .limit(intent.limit || 10)
        .lean();

      if (!commits || commits.length === 0) return null;

      const commitLines = commits.map((c, idx) => {
        const shaShort = String(c.commitSha || "").slice(0, 7);
        const author = toDisplayName(c.authorName || c.author || "Unknown");
        const dateStr = c.committedAt || c.date ? new Date(c.committedAt || c.date).toLocaleDateString() : "";
        return `${idx + 1}. **\`${shaShort}\`** - *${c.message || "No message"}* (${author}, ${dateStr})\n   - **SHA**: \`${c.commitSha}\``;
      }).join("\n\n");

      const answer = `Found **${commits.length}** merge commit(s) in **${repoName}**:\n\n${commitLines}`;
      const citations = commits.map((c, i) => ({
        evidenceId: `CM${i + 1}`,
        chunkId: `cm-${c.commitSha}`,
        type: "commit",
        commitSha: c.commitSha,
        author: toDisplayName(c.authorName || c.author || ""),
        date: c.committedAt ? new Date(c.committedAt).toISOString() : (c.date ? new Date(c.date).toISOString() : ""),
        url: c.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${c.commitSha}` : ""),
        reference: `commit:${String(c.commitSha || "").slice(0, 7)}`,
        excerpt: c.message || "",
      }));

      return {
        type: "commits",
        status: "ok",
        answer,
        data: commits,
        citations,
        sources: citations,
        grounded: true,
        confidence: 0.95,
        answerMode: "structured_git",
        answeredBy: {
          engine: "primary",
          provider: "WhyCode Git Intelligence",
          model: "structured_git",
        },
      };
    }

    return null;
  } catch (err) {
    logInfo("resolveStructuredGitAnswer skipped on error", { message: err.message });
    return null;
  }
}

/**
 * Loads calibrated threshold configuration from thresholds.json with safe defaults.
 * @returns {Object} Thresholds and quotas config.
 */
export function loadThresholdConfig() {
  const possiblePaths = [
    path.join(__dirname, "../config/thresholds.json"),
    path.join(__dirname, "../../thresholds.json"),
    path.join(process.cwd(), "config/thresholds.json"),
    path.join(process.cwd(), "thresholds.json"),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        return JSON.parse(content);
      }
    } catch (_) {}
  }

  return {
    RERANK_MIN_SCORE: 0.30,
    MIN_EVIDENCE_CHUNKS: 1,
    MAX_CANDIDATES: 30,
    RERANK_LIMIT: 8,
    MAX_CONTEXT_TOKENS: 3000,
    quotas: {
      how_why: { code: 5, doc: 2, commit: 1, pr: 1 },
      what_changed: { commit: 5, pr: 2, code: 1 },
      who_wrote: { commit: 5, pr: 2, code: 1 },
      architecture: { doc: 4, code: 3, commit: 1 },
      default: { code: 5, doc: 2, commit: 1, pr: 1 },
    },
  };
}

/**
 * Classifies query intent into routing categories for document quota balancing.
 * @param {string} query User question.
 * @returns {{ category: string, isHowWhy: boolean, isArch: boolean, isChange: boolean, isWho: boolean }}
 */
export function classifyQueryIntent(query = "") {
  const q = query.toLowerCase();

  const isWho = /\b(who|author|authored|blame|contributor|committed by|developer|who wrote|who made)\b/i.test(q);
  const isChange = /\b(what changed|change|changed|diff|difference|updated|update|history|recent|commit|pull request|pr|version|log)\b/i.test(q);
  const isArch = /\b(architecture|structure|stack|framework|overview|design|setup|database|schema|entry|model|microservice|folder|system design)\b/i.test(q);
  const isHowWhy = /\b(how|why|explain|flow|function|logic|process|implement|api|controller|endpoint|route|calculate|handle)\b/i.test(q);

  let category = "default";
  if (isWho) category = "who_wrote";
  else if (isChange) category = "what_changed";
  else if (isArch) category = "architecture";
  else if (isHowWhy) category = "how_why";

  return { category, isHowWhy, isArch, isChange, isWho };
}

/**
 * Selects top candidates filtered by question router document quotas.
 * @param {Array<Object>} candidates Sorted reranked chunks.
 * @param {string} category Question router category.
 * @param {Object} [customQuotas] Configurable document quotas.
 * @param {number} [limit=8] Maximum candidates to select.
 * @returns {Array<Object>} Quota-balanced top candidates.
 */
export function applyDocumentQuotas(candidates = [], category = "default", customQuotas = null, limit = 8) {
  const config = loadThresholdConfig();
  const quotas = customQuotas || config.quotas?.[category] || config.quotas?.default || { code: 5, doc: 2, commit: 1, pr: 1 };

  const selected = [];
  const selectedIds = new Set();
  const typeCounts = { code: 0, doc: 0, commit: 0, pr: 0 };

  const normalizeType = (docType) => {
    const dt = (docType || "CODE").toUpperCase();
    if (dt === "COMMIT") return "commit";
    if (dt === "DOCUMENTATION" || dt === "DOC") return "doc";
    if (dt === "PULL_REQUEST" || dt === "PR") return "pr";
    return "code";
  };

  // Phase 1: Select up to per-type quota
  for (const c of candidates) {
    if (selected.length >= limit) break;
    const type = normalizeType(c.payload?.documentType || c.documentType);
    const maxForType = quotas[type] !== undefined ? quotas[type] : limit;
    const id = String(c.id || c.payload?.chunkId || selected.length);

    if (!selectedIds.has(id) && (typeCounts[type] || 0) < maxForType) {
      selected.push(c);
      selectedIds.add(id);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
  }

  // Phase 2: Backfill remaining slots from highest scoring candidates if limit not reached
  if (selected.length < limit) {
    for (const c of candidates) {
      if (selected.length >= limit) break;
      const id = String(c.id || c.payload?.chunkId || selected.length);
      if (!selectedIds.has(id)) {
        selected.push(c);
        selectedIds.add(id);
      }
    }
  }

  return selected;
}

/**
 * Maps evidence chunks with stable numbered labels ([C1], [CM2], [D3], [PR4]).
 * @param {Array<Object>} rawChunks List of chunks retrieved and reranked.
 * @returns {Array<Object>} Chunks with assigned evidenceId and normalized payload.
 */
export function labelEvidenceChunks(rawChunks = []) {
  let codeIdx = 1;
  let commitIdx = 1;
  let docIdx = 1;
  let prIdx = 1;

  return rawChunks.map((c) => {
    const payload = c.payload || c;
    const docType = (payload.documentType || "CODE").toUpperCase();

    let evidenceId;
    if (docType === "COMMIT") {
      evidenceId = `CM${commitIdx++}`;
    } else if (docType === "DOCUMENTATION") {
      evidenceId = `D${docIdx++}`;
    } else if (docType === "PULL_REQUEST") {
      evidenceId = `PR${prIdx++}`;
    } else {
      evidenceId = `C${codeIdx++}`;
    }

    const startLine = payload.startLine ?? 1;
    const endLine = payload.endLine ?? 1;
    const path = payload.path || payload.filePath || "";

    let url = payload.url || "";
    if (!url && path && payload.commitSha && payload.repositoryFullName) {
      url = `https://github.com/${payload.repositoryFullName}/blob/${payload.commitSha}/${path}#L${startLine}-L${endLine}`;
    }

    return {
      ...c,
      evidenceId,
      chunkId: payload.chunkId || c.id || evidenceId,
      documentType: docType,
      path,
      filePath: path,
      startLine,
      endLine,
      commitSha: payload.commitSha || "",
      prNumber: payload.prNumber || null,
      author: payload.author || "",
      timestamp: payload.timestamp || "",
      url,
      text: payload.text || payload.content || "",
      score: c.score ?? 1,
    };
  });
}

/**
 * Maps cited evidence IDs ([C1], [CM2], etc.) back to exact verified server-side metadata.
 * Drops invalid or fabricated IDs.
 *
 * @param {Array<string>} citedIds Evidence IDs cited in LLM output.
 * @param {Array<Object>} evidenceList Numbered evidence items provided to LLM.
 * @returns {Array<Object>} Verified citations list.
 */
export function mapCitations(citedIds = [], evidenceList = []) {
  const map = new Map();
  for (const item of evidenceList) {
    const payload = item.payload || item;
    if (item.evidenceId) map.set(String(item.evidenceId).toUpperCase(), item);
    if (payload.evidenceId) map.set(String(payload.evidenceId).toUpperCase(), item);
    if (item.chunkId) map.set(String(item.chunkId).toUpperCase(), item);
    if (payload.chunkId) map.set(String(payload.chunkId).toUpperCase(), item);
    if (item.id) map.set(String(item.id).toUpperCase(), item);
  }

  const citations = [];
  const seen = new Set();

  for (const rawId of citedIds) {
    const cleanId = String(rawId).trim().replace(/[\[\]]/g, "").toUpperCase();
    if (seen.has(cleanId)) continue;

    const matched = map.get(cleanId);
    if (matched) {
      seen.add(cleanId);
      const payload = matched.payload || matched;
      const startLine = payload.startLine ?? matched.startLine ?? 1;
      const endLine = payload.endLine ?? matched.endLine ?? 1;
      const path = payload.path || payload.filePath || matched.path || matched.filePath || "";
      const commitSha = payload.commitSha || matched.commitSha || "";
      const url = payload.url || matched.url || "";

      citations.push({
        chunkId: payload.chunkId || matched.chunkId || rawId,
        path,
        lineRange: [startLine, endLine],
        commitSha,
        url,
      });
    }
  }

  return citations;
}

/**
 * Formats evidence items as frontend-ready source list.
 * @param {Array<Object>} evidenceList Evidence chunks.
 * @returns {Array<Object>} Standardized sources.
 */
export function formatRetrievedSources(evidenceList = []) {
  return evidenceList.map((e) => {
    const payload = e.payload || e;
    const startLine = payload.startLine ?? e.startLine ?? 1;
    const endLine = payload.endLine ?? e.endLine ?? 1;
    const path = payload.path || payload.filePath || e.path || e.filePath || "";
    const commitSha = payload.commitSha || e.commitSha || "";
    const prNumber = payload.prNumber || e.prNumber || null;
    const author = payload.author || e.author || "";
    const date = payload.timestamp || e.timestamp || "";
    const url = payload.url || e.url || "";
    const text = payload.text || payload.content || e.text || e.content || "";
    const evidenceId = e.evidenceId || payload.evidenceId || payload.chunkId || e.chunkId || "";

    return {
      evidenceId,
      chunkId: payload.chunkId || e.chunkId || evidenceId,
      type: (e.documentType || payload.documentType || "file").toLowerCase(),
      path,
      lineRange: [startLine, endLine],
      commitSha,
      prNumber,
      author,
      date,
      url,
      excerpt: text.slice(0, 150),
      reference: path ? `${path}#L${startLine}-L${endLine}` : (commitSha ? `commit:${commitSha.slice(0, 7)}` : evidenceId),
    };
  });
}

/**
 * Formats evidence items as frontend-ready citations and sources for Evidence Mode.
 * Labels and fields are built strictly from repository metadata (no generated prose).
 *
 * @param {Array<Object>} evidenceList Evidence chunks.
 * @returns {Array<Object>} Standardized server-built citations.
 */
export function buildEvidenceModeCitations(evidenceList = []) {
  return evidenceList.map((e, idx) => {
    const payload = e.payload || e;
    const startLine = payload.startLine ?? e.startLine ?? 1;
    const endLine = payload.endLine ?? e.endLine ?? 1;
    const path = payload.filePath || payload.path || e.filePath || e.path || "";
    const commitSha = payload.commitSha || e.commitSha || "";
    const prNumber = payload.prNumber || e.prNumber || null;
    const author = payload.author || e.author || "";
    const date = payload.timestamp || e.timestamp || "";
    const url = payload.permalink || payload.url || e.permalink || e.url || "";
    const text = payload.text || payload.content || e.text || e.content || "";
    const evidenceId = e.evidenceId || payload.evidenceId || payload.chunkId || e.chunkId || `E${idx + 1}`;
    const docType = (payload.documentType || e.documentType || (path ? "CODE" : "COMMIT")).toUpperCase();

    // Labels built only from metadata
    const label = path
      ? `${path}#L${startLine}-L${endLine}`
      : (commitSha
        ? `commit:${commitSha.slice(0, 7)}`
        : (prNumber ? `pr:#${prNumber}` : `evidence-${idx + 1}`));

    return {
      evidenceId,
      chunkId: payload.chunkId || e.chunkId || evidenceId,
      type: docType.toLowerCase(),
      file: path,
      filePath: path,
      path,
      lineRange: [startLine, endLine],
      commitSha,
      prNumber,
      permalink: url,
      url,
      label,
      reference: label,
      author,
      date,
      score: e.score,
      excerpt: text.slice(0, 200),
    };
  });
}

/**
 * Orchestrates grounded RAG retrieval pipeline:
 * question -> auth -> company + repository check -> embed -> Qdrant search (30 candidates) ->
 * rerank (top 8) -> evidence gate (0.30) -> context builder (with neighbouring chunks) ->
 * LLM -> server-side citation resolver.
 *
 * @param {Object} authContext Authenticated session context.
 * @param {string} repositoryId Target repository ID.
 * @param {string} query User question.
 * @param {Object} [options={}] Pipeline options.
 * @returns {Promise<{ answer: string, citations: Array<Object>, sources: Array<Object>, grounded: boolean, answerMode?: string, banner?: string, error?: string }>}
 */
export async function queryRepositoryKnowledge(authContext, repositoryId, query, options = {}) {
  // 1. Strict tenant validation before ANY network I/O
  const { companyId } = validateTenantContext(authContext, repositoryId);

  if (!query || typeof query !== "string" || query.trim() === "") {
    return {
      answer: INSUFFICIENT_EVIDENCE_MESSAGE,
      citations: [],
      sources: [],
      grounded: false,
    };
  }

  const collectionName = options.collectionName || "repository_chunks";
  const startTime = Date.now();

  try {
    // 2. Resolve repository document for metadata & query cleaning
    let repoDoc = options.repo || options.repository || null;
    if (!repoDoc && mongoose.connection && mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(repositoryId)) {
      try {
        repoDoc = await Repository.findById(repositoryId).lean();
      } catch (_) {}
    }

    const cleanedQuery = cleanQueryText(query, repoDoc);

    // 3. STRUCTURED INTENT ROUTER: Check if query can be answered directly from structured git history
    const structuredIntent = detectStructuredGitIntent(query) || detectStructuredGitIntent(cleanedQuery);
    logInfo("[QUERY_ROUTER] Intent detection", {
      originalQuery: query,
      cleanedQuery,
      detectedIntent: structuredIntent ? structuredIntent.type : "SEMANTIC_RAG",
      repositoryId,
      companyId,
    });

    if (structuredIntent) {
      const structuredResult = await resolveStructuredGitAnswer(structuredIntent, repositoryId, repoDoc);
      if (structuredResult) {
        logInfo("[QUERY_ROUTER] Structured git intent satisfied directly from CommitMemory", {
          intent: structuredIntent.type,
          citationCount: structuredResult.citations?.length || 0,
          durationMs: Date.now() - startTime,
        });
        return structuredResult;
      }
    }

    // 4. SEMANTIC HYBRID RETRIEVAL:
    let rawMatches = [];
    const intent = classifyQueryIntent(cleanedQuery || query);

    try {
      // Generate vector embedding for cleaned query
      const queryVector = await getEmbedding(cleanedQuery || query);
      console.log("[CHAT] embedding generated");

      // Dense vector search from Qdrant
      const CANDIDATES_COUNT = 30;
      rawMatches = await searchChunks(authContext, repositoryId, collectionName, queryVector, CANDIDATES_COUNT);

      // Fetch dedicated COMMIT chunks from Qdrant if change/commit-related
      if (intent.isChange || intent.isWho || intent.category === "what_changed" || intent.category === "who_wrote") {
        try {
          const commitFilter = {
            must: [
              { key: "companyId", match: { value: companyId } },
              { key: "repositoryId", match: { value: repositoryId } },
              { key: "documentType", match: { value: "COMMIT" } },
            ],
          };
          const commitMatches = await searchChunks(authContext, repositoryId, collectionName, queryVector, 15, commitFilter);
          for (const cm of commitMatches) {
            const id = String(cm.id || cm.payload?.chunkId);
            if (!rawMatches.some((m) => String(m.id || m.payload?.chunkId) === id)) {
              rawMatches.push(cm);
            }
          }
        } catch (commErr) {
          logInfo("Commit candidate fetch skipped", { message: commErr.message });
        }
      }
    } catch (vecErr) {
      logInfo("[CHAT] Vector embedding / Qdrant search unavailable, proceeding with structured & hybrid keyword retrieval", {
        message: vecErr.message,
        code: vecErr.code,
      });
    }

    // Hybrid keyword search against CommitMemory store in MongoDB
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        // Extract search terms including file names, path parts, and keywords
        const searchWords = (cleanedQuery || query)
          .replace(/[\\/._-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 2 && !/^(what|where|when|which|how|why|does|did|the|and|for|with|this|that|from|into|about|exist|exists|history|tell|show|give|code|repo)$/i.test(w));

        if (searchWords.length > 0) {
          const kwRegexes = searchWords.slice(0, 6).map((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
          const repoQuery = {
            $or: [
              { repository: repositoryId },
              ...(mongoose.Types.ObjectId.isValid(repositoryId) ? [{ repository: new mongoose.Types.ObjectId(repositoryId) }] : []),
              ...(repoDoc?._id ? [{ repository: repoDoc._id }, ...(mongoose.Types.ObjectId.isValid(repoDoc._id) ? [{ repository: new mongoose.Types.ObjectId(repoDoc._id) }] : [])] : []),
            ],
            $and: [
              {
                $or: [
                  ...kwRegexes.map((r) => ({ message: r })),
                  ...kwRegexes.map((r) => ({ diffSummary: r })),
                  ...kwRegexes.map((r) => ({ aiSummary: r })),
                  ...kwRegexes.map((r) => ({ filesChanged: r })),
                ],
              },
            ],
          };

          const hybridCommits = await CommitMemory.find(repoQuery).sort({ committedAt: -1, date: -1 }).limit(10).lean();
          for (const hc of hybridCommits) {
            const id = `cm-${hc.commitSha}`;
            if (!rawMatches.some((m) => String(m.id || m.payload?.chunkId) === id)) {
              rawMatches.push({
                id,
                score: 0.75,
                payload: {
                  chunkId: id,
                  documentType: "COMMIT",
                  commitSha: hc.commitSha,
                  author: hc.authorName || hc.author || "",
                  timestamp: hc.committedAt || hc.date || "",
                  url: hc.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${hc.commitSha}` : ""),
                  text: `Commit ${hc.commitSha}\nAuthor: ${hc.authorName || hc.author || ""}\nDate: ${hc.committedAt || hc.date || ""}\nMessage: ${hc.message || ""}\nFiles Changed: ${(hc.filesChanged || []).join(", ")}\nDiff:\n${hc.diffSummary || ""}\nSummary:\n${hc.aiSummary || ""}`,
                },
              });
            }
          }
        }

        // If still no candidates found, pull recent commits as base repository evidence for grounding
        if (rawMatches.length === 0) {
          const repoQuery = {
            $or: [
              { repository: repositoryId },
              ...(mongoose.Types.ObjectId.isValid(repositoryId) ? [{ repository: new mongoose.Types.ObjectId(repositoryId) }] : []),
              ...(repoDoc?._id ? [{ repository: repoDoc._id }, ...(mongoose.Types.ObjectId.isValid(repoDoc._id) ? [{ repository: new mongoose.Types.ObjectId(repoDoc._id) }] : [])] : []),
            ],
          };
          const fallbackCommits = await CommitMemory.find(repoQuery).sort({ committedAt: -1, date: -1 }).limit(5).lean();
          for (const hc of fallbackCommits) {
            const id = `cm-${hc.commitSha}`;
            rawMatches.push({
              id,
              score: 0.75,
              payload: {
                chunkId: id,
                documentType: "COMMIT",
                commitSha: hc.commitSha,
                author: hc.authorName || hc.author || "",
                timestamp: hc.committedAt || hc.date || "",
                url: hc.htmlUrl || (repoDoc?.fullName ? `https://github.com/${repoDoc.fullName}/commit/${hc.commitSha}` : ""),
                text: `Commit ${hc.commitSha}\nAuthor: ${hc.authorName || hc.author || ""}\nDate: ${hc.committedAt || hc.date || ""}\nMessage: ${hc.message || ""}\nFiles Changed: ${(hc.filesChanged || []).join(", ")}\nDiff:\n${hc.diffSummary || ""}\nSummary:\n${hc.aiSummary || ""}`,
              },
            });
          }
        }
      } catch (hybErr) {
        logInfo("Hybrid CommitMemory search skipped", { message: hybErr.message });
      }
    }

    console.log("[CHAT] Candidate retrieval completed");
    console.log(`[CHAT] retrieved candidates: ${rawMatches ? rawMatches.length : 0}`);

    if (!rawMatches || rawMatches.length === 0) {
      logInfo("No raw matches found across vector and structured stores", { repositoryId, companyId, cleanedQuery });
      return {
        type: "text",
        status: "insufficient_evidence",
        answer: INSUFFICIENT_EVIDENCE_MESSAGE,
        refusalReason: `I couldn't find sufficient evidence for "${cleanedQuery}" in ${repoDoc?.name || repoDoc?.fullName || "the connected repository"}.`,
        suggestion: "Try rephrasing with specific file paths, commit hashes, or author names.",
        data: [],
        citations: [],
        sources: [],
        grounded: false,
        confidence: 0,
      };
    }

    // 5. Question-type router & reranking candidate selection
    const thresholdConfig = loadThresholdConfig();
    const TOP_RERANK_LIMIT = options.rerankLimit || thresholdConfig.RERANK_LIMIT || 8;
    const rerankedMatches = await rerank(cleanedQuery || query, rawMatches);
    const topRanked = applyDocumentQuotas(rerankedMatches, intent.category, options.quotas, TOP_RERANK_LIMIT);
    console.log(`[CHAT] reranking and question-type routing (${intent.category}) completed`);

    // 6. Evidence Gate: Swept RERANK_MIN_SCORE and MIN_EVIDENCE_CHUNKS
    const minScoreThreshold = options.minScoreThreshold !== undefined
      ? options.minScoreThreshold
      : (process.env.RERANK_MIN_SCORE !== undefined ? parseFloat(process.env.RERANK_MIN_SCORE) : (thresholdConfig.RERANK_MIN_SCORE || 0.3));
    const minEvidenceChunks = options.minEvidenceChunks !== undefined
      ? options.minEvidenceChunks
      : (process.env.MIN_EVIDENCE_CHUNKS !== undefined ? parseInt(process.env.MIN_EVIDENCE_CHUNKS, 10) : (thresholdConfig.MIN_EVIDENCE_CHUNKS || 1));

    const topScore = topRanked[0]?.score ?? 0;
    const validMatches = topRanked.filter((item) => (item.score ?? 1) >= minScoreThreshold);
    const passesGate = validMatches.length >= minEvidenceChunks;

    logInfo("[GROUNDING] threshold result", {
      companyId,
      repositoryId,
      intentCategory: intent.category,
      rawCandidateCount: rawMatches.length,
      rerankedCount: topRanked.length,
      validMatchCount: validMatches.length,
      minScoreThreshold,
      minEvidenceChunks,
      topScore,
      passed: passesGate,
    });

    if (!passesGate) {
      console.log("[CHAT] grounding decision - below threshold");
      logInfo("Grounding threshold failed - returning refusal without LLM call", {
        companyId,
        repositoryId,
        topScore,
        validMatchCount: validMatches.length,
        minEvidenceChunks,
        cleanedQuery,
        durationMs: Date.now() - startTime,
      });

      return {
        type: "text",
        status: "insufficient_evidence",
        answer: INSUFFICIENT_EVIDENCE_MESSAGE,
        refusalReason: `I couldn't find sufficient evidence for "${cleanedQuery}" in ${repoDoc?.name || repoDoc?.fullName || "the connected repository"}.`,
        suggestion: "Try rephrasing with specific file paths, commit hashes, or author names.",
        data: [],
        citations: [],
        sources: [],
        grounded: false,
        confidence: 0,
      };
    }

    console.log("[CHAT] grounding decision - threshold passed");

    // 7. Context Builder: Add neighbouring chunks of top code/doc files within token budget
    const MAX_CONTEXT_CHARS = 3800;
    const topCodePaths = validMatches
      .map((m) => m.payload?.path || m.payload?.filePath || m.path || m.filePath)
      .filter(Boolean)
      .slice(0, 3);

    let neighbouringChunks = [];
    if (topCodePaths.length > 0) {
      try {
        neighbouringChunks = await fetchNeighbouringChunks(authContext, repositoryId, collectionName, topCodePaths);
      } catch (neighErr) {
        logInfo("Neighbouring chunks skipped", { errorMessage: neighErr.message });
      }
    }

    // Combine prioritized validMatches + neighbouringChunks (deduplicated by chunkId / pointId)
    const combinedMap = new Map();
    let currentChars = 0;

    // Prioritize top-scoring matches
    for (const m of validMatches) {
      const id = String(m.id || m.payload?.chunkId || combinedMap.size);
      const textLen = m.payload?.text?.length || m.text?.length || 0;
      if (!combinedMap.has(id) && (currentChars + textLen <= MAX_CONTEXT_CHARS || combinedMap.size < 2)) {
        combinedMap.set(id, m);
        currentChars += textLen;
      }
    }

    // Append neighbouring chunks within budget
    if (Array.isArray(neighbouringChunks)) {
      for (const n of neighbouringChunks) {
        const id = String(n.id || n.payload?.chunkId || combinedMap.size);
        const textLen = n.payload?.text?.length || n.text?.length || 0;
        if (!combinedMap.has(id) && currentChars + textLen <= MAX_CONTEXT_CHARS) {
          combinedMap.set(id, n);
          currentChars += textLen;
        }
      }
    }

    const finalEvidenceList = labelEvidenceChunks(Array.from(combinedMap.values()));
    const retrievedSources = formatRetrievedSources(finalEvidenceList);

    const activeAnswerMode = (options.answerMode || servicesConfig.answerMode || "generate").toLowerCase();

    // Direct Evidence Mode: return reranked evidence with server-built citations without calling LLM
    if (activeAnswerMode === "evidence") {
      const evidenceCitations = buildEvidenceModeCitations(finalEvidenceList.length > 0 ? finalEvidenceList : validMatches);
      logInfo("[GROUNDING] Evidence mode active - returning server-built citations without LLM call", {
        companyId,
        repositoryId,
        evidenceCount: evidenceCitations.length,
      });

      return {
        type: "text",
        status: "ok",
        answer: "",
        data: [],
        citations: evidenceCitations,
        sources: evidenceCitations,
        retrievedEvidence: evidenceCitations,
        grounded: true,
        confidence: 0.85,
        answerMode: "evidence",
        banner: EVIDENCE_MODE_BANNER,
        answeredBy: {
          engine: "evidence",
          provider: "WhyCode Evidence Engine",
          model: "none",
        },
      };
    }

    // Resolve Company engine mode (AUTO, PRIMARY_ONLY, GEMINI_ONLY)
    let engineMode = options.engineMode || options.mode || "AUTO";
    if (!options.engineMode && !options.mode && mongoose.connection && mongoose.connection.readyState === 1 && companyId) {
      try {
        const compDoc = await Company.findById(companyId).lean();
        if (compDoc?.answerEngineMode) {
          engineMode = compDoc.answerEngineMode;
        }
      } catch (_) {}
    }
    engineMode = String(engineMode || "AUTO").toUpperCase();

    const repoTarget = repoDoc || options.repo || options.repository || { fullName: options.repositoryFullName || options.fullName };

    console.log(`[CHAT] LLM request dispatching (mode: ${engineMode}) with ${finalEvidenceList.length} evidence blocks`);

    // 8. Call LLM according to configured engine mode with Gemini fallback
    let llmResult = null;
    let answeredBy = null;
    let notice = null;

    if (engineMode === "GEMINI_ONLY") {
      try {
        llmResult = await generateGeminiAnswer(cleanedQuery || query, finalEvidenceList, {
          temperature: options.temperature,
          repo: repoTarget,
        });
        answeredBy = {
          engine: "gemini",
          provider: "Google Gemini",
          model: servicesConfig.geminiModel || "gemini-2.5-flash",
        };
        console.log("[CHAT] Gemini answer generated (GEMINI_ONLY)");
      } catch (geminiErr) {
        logError("Gemini call failed in GEMINI_ONLY mode - falling back to evidence mode", {
          errorMessage: geminiErr.message,
          errorCode: geminiErr.code,
          repositoryId,
          companyId,
        });
        await recordModelSwitch({ companyId, to: "evidence", reason: geminiErr.message, mode: "GEMINI_ONLY" });
        const fallbackEvidence = buildEvidenceModeCitations(finalEvidenceList.length > 0 ? finalEvidenceList : validMatches);
        return {
          type: "text",
          status: "ok",
          answer: "",
          data: [],
          citations: fallbackEvidence,
          sources: fallbackEvidence,
          retrievedEvidence: fallbackEvidence,
          grounded: true,
          confidence: 0.85,
          answerMode: "evidence",
          banner: EVIDENCE_MODE_BANNER,
          answeredBy: {
            engine: "evidence",
            provider: "WhyCode Evidence Engine",
            model: "none",
            fallbackReason: `Gemini failed: ${geminiErr.message}`,
          },
        };
      }
    } else if (engineMode === "PRIMARY_ONLY") {
      try {
        llmResult = await generateGroundedAnswer(cleanedQuery || query, finalEvidenceList, {
          temperature: options.temperature,
          repo: repoTarget,
        });
        await recordRecovery(companyId);
        answeredBy = {
          engine: "primary",
          provider: "Ollama",
          model: servicesConfig.llmModel || "qwen2.5-coder:3b",
        };
        console.log("[CHAT] Primary answer generated (PRIMARY_ONLY)");
      } catch (primaryErr) {
        if (primaryErr instanceof PrivacyRefusalError || primaryErr.name === "PrivacyRefusalError" || primaryErr.statusCode === 403) {
          throw primaryErr;
        }
        logError("Primary model failed in PRIMARY_ONLY mode - falling back to evidence mode", {
          errorMessage: primaryErr.message,
          errorCode: primaryErr.code,
          repositoryId,
          companyId,
        });
        await recordModelSwitch({ companyId, to: "evidence", reason: primaryErr.message, mode: "PRIMARY_ONLY" });
        const fallbackEvidence = buildEvidenceModeCitations(finalEvidenceList.length > 0 ? finalEvidenceList : validMatches);
        return {
          type: "text",
          status: "ok",
          answer: "",
          data: [],
          citations: fallbackEvidence,
          sources: fallbackEvidence,
          retrievedEvidence: fallbackEvidence,
          grounded: true,
          confidence: 0.85,
          answerMode: "evidence",
          banner: EVIDENCE_MODE_BANNER,
          answeredBy: {
            engine: "evidence",
            provider: "WhyCode Evidence Engine",
            model: "none",
            fallbackReason: `Primary model offline: ${primaryErr.message}`,
          },
        };
      }
    } else {
      // AUTO MODE (default): primary first, Gemini fallback on failure
      try {
        llmResult = await generateGroundedAnswer(cleanedQuery || query, finalEvidenceList, {
          temperature: options.temperature,
          repo: repoTarget,
        });
        await recordRecovery(companyId);
        answeredBy = {
          engine: "primary",
          provider: "Ollama",
          model: servicesConfig.llmModel || "qwen2.5-coder:3b",
        };
        console.log("[CHAT] Primary answer generated (AUTO)");
      } catch (primaryErr) {
        if (primaryErr instanceof PrivacyRefusalError || primaryErr.name === "PrivacyRefusalError" || primaryErr.statusCode === 403) {
          throw primaryErr;
        }

        logError("Primary answer model offline/failed in AUTO - evaluating Gemini fallback", {
          errorMessage: primaryErr.message,
          errorCode: primaryErr.code,
          repositoryId,
          companyId,
        });

        // Check if Gemini is enabled, allowed for repository (privacy check), and within daily limit
        const isGeminiConfigured = Boolean(servicesConfig.geminiApiKey || process.env.GEMINI_API_KEY) && servicesConfig.geminiEnabled !== false;
        const isAllowedForGemini = isLlmAllowed(repoTarget, { ...servicesConfig, llmExternal: true });
        const isWithinDailyLimit = !geminiDailyTracker.getUsage().limitReached;

        logInfo("[CHAT] Evaluating Gemini fallback conditions", {
          isGeminiConfigured,
          isAllowedForGemini,
          isWithinDailyLimit,
          hasApiKey: Boolean(servicesConfig.geminiApiKey || process.env.GEMINI_API_KEY),
          repoFullName: repoTarget?.fullName,
        });

        let geminiSucceeded = false;

        if (isGeminiConfigured && isAllowedForGemini && isWithinDailyLimit) {
          try {
            llmResult = await generateGeminiAnswer(cleanedQuery || query, finalEvidenceList, {
              temperature: options.temperature,
              repo: repoTarget,
            });
            await recordModelSwitch({ companyId, to: "gemini", reason: primaryErr.message, mode: "AUTO" });
            answeredBy = {
              engine: "gemini",
              provider: "Google Gemini",
              model: servicesConfig.geminiModel || "gemini-2.5-flash",
              fallbackReason: `Primary model offline: ${primaryErr.message}`,
            };
            notice = "Your RAG model is offline. This answer was generated by Gemini as a fallback.";
            geminiSucceeded = true;
            console.log("[CHAT] Gemini fallback answer generated");
          } catch (geminiErr) {
            logError("Gemini fallback call also failed", { errorMessage: geminiErr.message, errorCode: geminiErr.code });
          }
        }

        if (!geminiSucceeded) {
          await recordModelSwitch({ companyId, to: "evidence", reason: primaryErr.message, mode: "AUTO" });
          const fallbackEvidence = buildEvidenceModeCitations(finalEvidenceList.length > 0 ? finalEvidenceList : validMatches);
          return {
            type: "text",
            status: "ok",
            answer: "",
            data: [],
            citations: fallbackEvidence,
            sources: fallbackEvidence,
            retrievedEvidence: fallbackEvidence,
            grounded: true,
            confidence: 0.85,
            answerMode: "evidence",
            banner: EVIDENCE_MODE_BANNER,
            answeredBy: {
              engine: "evidence",
              provider: "WhyCode Evidence Engine",
              model: "none",
              fallbackReason: `Primary model offline: ${primaryErr.message}`,
            },
          };
        }
      }
    }

    // 9. Server-side citation resolver
    let citations = mapCitations(llmResult.citedChunkIds, finalEvidenceList);

    // If answer text mentions commit SHAs or file paths from evidence, auto-resolve
    if (citations.length === 0 && llmResult.answer && !/couldn't find sufficient evidence/i.test(llmResult.answer)) {
      const candidateIds = [];
      for (const ev of finalEvidenceList) {
        if (ev.commitSha && llmResult.answer.includes(ev.commitSha.slice(0, 7))) {
          candidateIds.push(ev.evidenceId);
        } else if (ev.path && llmResult.answer.includes(ev.path)) {
          candidateIds.push(ev.evidenceId);
        }
      }
      if (candidateIds.length > 0) {
        citations = mapCitations(candidateIds, finalEvidenceList);
      }
    }

    // If refusal text or no valid citations remaining
    const isRefusal = /couldn't find sufficient evidence/i.test(llmResult.answer || "");
    if (isRefusal || citations.length === 0) {
      return {
        type: "text",
        status: "insufficient_evidence",
        answer: INSUFFICIENT_EVIDENCE_MESSAGE,
        refusalReason: `I couldn't find sufficient evidence for "${cleanedQuery}" in ${repoDoc?.name || repoDoc?.fullName || "the connected repository"}.`,
        suggestion: "Try rephrasing with specific file paths, commit hashes, or author names.",
        data: [],
        citations: [],
        sources: retrievedSources,
        grounded: false,
        confidence: 0,
        answeredBy,
        ...(notice ? { notice } : {}),
      };
    }

    logInfo("Grounded query succeeded", {
      companyId,
      repositoryId,
      citationCount: citations.length,
      durationMs: Date.now() - startTime,
      engine: answeredBy?.engine,
    });

    return {
      type: "text",
      status: "ok",
      answer: llmResult.answer,
      data: [],
      citations,
      sources: citations.length > 0 ? citations : retrievedSources,
      retrievedEvidence: retrievedSources,
      grounded: true,
      confidence: 0.95,
      answerMode: "generate",
      answeredBy,
      ...(notice ? { notice } : {}),
    };
  } catch (error) {
    logError("Grounded query pipeline failed", {
      companyId,
      repositoryId,
      errorMessage: error.message,
      stack: error.stack,
      durationMs: Date.now() - startTime,
    });

    throw error;
  }
}
