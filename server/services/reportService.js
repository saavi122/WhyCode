import axios from "axios";
import Report from "../models/Report.js";
import Repository from "../models/Repository.js";
import CommitMemory from "../models/CommitMemory.js";
import { fetchNeighbouringChunks, searchChunks } from "./qdrantStore.js";
import { getEmbedding } from "./teiService.js";
import { getChatCompletionsUrl, getVllmBaseUrl } from "./vllmService.js";
import { validateTenantContext } from "./tenantGuard.js";
import { logInfo, logError } from "../utils/logger.js";

const SEVERITY_ORDER = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

/**
 * Merges chunk-level drift analysis results:
 * - Any drift = driftDetected: true
 * - Severity = max(chunk severities)
 * - Confidence = min(chunk confidences)
 *
 * @param {Array<Object>} chunkResults List of chunk evaluations
 * @returns {{ driftDetected: boolean, severity: string, confidence: number }}
 */
export function mergeDriftChunkResults(chunkResults = []) {
  if (!Array.isArray(chunkResults) || chunkResults.length === 0) {
    return { driftDetected: false, severity: "LOW", confidence: 0.9 };
  }

  const driftDetected = chunkResults.some((c) => Boolean(c.driftDetected));

  let maxSeverityScore = 1;
  let maxSeverity = "LOW";
  let minConfidence = 1.0;

  for (const c of chunkResults) {
    const sev = (c.severity || "LOW").toUpperCase();
    const score = SEVERITY_ORDER[sev] || 1;
    if (score > maxSeverityScore) {
      maxSeverityScore = score;
      maxSeverity = sev;
    }
    const conf = typeof c.confidence === "number" ? c.confidence : 0.85;
    if (conf < minConfidence) {
      minConfidence = conf;
    }
  }

  // If no drift is detected, default severity is LOW
  if (!driftDetected) {
    maxSeverity = "LOW";
  }

  return {
    driftDetected,
    severity: maxSeverity,
    confidence: Number(minConfidence.toFixed(2)),
  };
}

/**
 * Validates that all candidate commit SHAs are strictly present in the retrieved commit list.
 * Strips out any hallucinated commit SHAs.
 *
 * @param {Array<string>} candidateShas Output commit SHAs from LLM
 * @param {Array<string>} retrievedShas Known SHAs from retrieved evidence
 * @returns {Array<string>} Filtered valid commit SHAs
 */
export function postCheckCommitShas(candidateShas = [], retrievedShas = []) {
  if (!Array.isArray(candidateShas) || candidateShas.length === 0) return [];
  if (!Array.isArray(retrievedShas) || retrievedShas.length === 0) return [];

  const cleanRetrieved = retrievedShas.map((s) => String(s).toLowerCase().trim());

  return candidateShas
    .map((s) => String(s).trim())
    .filter((candidate) => {
      const candLower = candidate.toLowerCase();
      return cleanRetrieved.some((r) => r === candLower || r.startsWith(candLower) || candLower.startsWith(r));
    });
}

/**
 * Generates a Documentation Drift Report for a file or code unit.
 */
export async function generateDriftReport({ authContext, repositoryId, targetPath, triggerType = "MANUAL" }) {
  const { companyId } = validateTenantContext(authContext, repositoryId);

  try {
    // 1. Retrieve chunks for targetPath
    const chunks = await fetchNeighbouringChunks(authContext, repositoryId, "repository_chunks", [targetPath]);

    if (!chunks || chunks.length === 0) {
      const errorMsg = `No indexed chunks found for target path: ${targetPath}`;
      const failedReport = await Report.create({
        companyId,
        repositoryId,
        reportType: "DRIFT",
        targetPath,
        status: "FAILED",
        error: errorMsg,
        triggerType,
      });
      return failedReport;
    }

    const chunkIds = chunks.map((c) => c.payload?.chunkId || c.id || "chunk_unknown");
    const commitShas = Array.from(new Set(chunks.map((c) => c.payload?.commitSha).filter(Boolean)));
    const lineRanges = chunks.map((c) => ({
      start: c.payload?.startLine || 1,
      end: c.payload?.endLine || 1,
    }));

    // 2. Query LLM to evaluate code vs docstrings/README
    const contextBlocks = chunks
      .map(
        (c) =>
          `<code_chunk id="${c.payload?.chunkId || c.id}" file="${c.payload?.filePath || targetPath}" lines="${c.payload?.startLine}-${c.payload?.endLine}">\n${c.payload?.text || c.payload?.content || ""}\n</code_chunk>`
      )
      .join("\n\n");

    const prompt = `Analyze the provided code and documentation chunks for ${targetPath}.
Determine if the documentation, comments, or docstrings drift/disagree with the actual code implementation.

Context Chunks:
${contextBlocks}

Respond in strict JSON format:
{
  "driftDetected": true | false,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": 0.0 to 1.0,
  "summary": "High-level summary of documentation state",
  "driftDetails": "Specific points where documentation disagrees with code",
  "suggestedDoc": "Updated documentation or docstring",
  "citations": ["chunk_ids"]
}`;

    let parsed = null;
    try {
      const chatUrl = getChatCompletionsUrl();
      const response = await axios.post(
        chatUrl,
        {
          model: process.env.LLM_MODEL || "qwen2.5-coder:3b",
          messages: [
            { role: "system", content: "You are WhyCode Documentation Drift Analyzer. You detect mismatches between code and docs." },
            { role: "user", content: prompt },
          ],
          temperature: 0.0,
        },
        { timeout: 35000 }
      );

      const raw = response.data?.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (llmErr) {
      logError("[REPORT] LLM Drift generation failed", { errorMessage: llmErr.message, targetPath });
    }

    if (!parsed) {
      const failedReport = await Report.create({
        companyId,
        repositoryId,
        reportType: "DRIFT",
        targetPath,
        status: "FAILED",
        error: "LLM drift analysis failed to return structured response. Please retry.",
        triggerType,
      });
      return failedReport;
    }

    // 3. Apply chunk merge logic
    const merged = mergeDriftChunkResults([parsed]);
    const requiresReview = merged.severity === "HIGH" || merged.severity === "CRITICAL" || merged.confidence < 0.8;

    const report = await Report.create({
      companyId,
      repositoryId,
      reportType: "DRIFT",
      targetPath,
      status: "PENDING_REVIEW",
      isAiGenerated: true,
      severity: merged.severity,
      confidence: merged.confidence,
      requiresReview,
      inputReferences: {
        chunkIds,
        commitShas,
        filePaths: [targetPath],
        lineRanges,
      },
      output: {
        title: `Documentation Drift: ${targetPath}`,
        summary: parsed.summary || (merged.driftDetected ? "Documentation drift detected." : "Documentation is up to date."),
        driftDetected: merged.driftDetected,
        driftDetails: parsed.driftDetails || "",
        suggestedDoc: parsed.suggestedDoc || "",
        citations: Array.isArray(parsed.citations) ? parsed.citations : chunkIds,
      },
      model: process.env.LLM_MODEL || "qwen2.5-coder:3b",
      promptVersion: "v1.0.0",
      triggerType,
    });

    logInfo("[REPORT] Drift report generated", { reportId: report._id, targetPath, severity: report.severity });
    return report;
  } catch (err) {
    logError("[REPORT] Drift report creation failed", { errorMessage: err.message, targetPath });
    return await Report.create({
      companyId,
      repositoryId,
      reportType: "DRIFT",
      targetPath,
      status: "FAILED",
      error: err.message,
      triggerType,
    });
  }
}

/**
 * Generates an Intent Reconstruction Report (Why a file or function exists).
 */
export async function generateIntentReport({ authContext, repositoryId, targetPath, targetSymbol = null, triggerType = "MANUAL" }) {
  const { companyId } = validateTenantContext(authContext, repositoryId);

  try {
    // 1. Retrieve chunks and commit memories for target
    const chunks = await fetchNeighbouringChunks(authContext, repositoryId, "repository_chunks", [targetPath]);
    const commitMemories = await CommitMemory.find({
      repository: repositoryId,
      filePath: targetPath,
    }).limit(10);

    const retrievedShas = Array.from(
      new Set([
        ...chunks.map((c) => c.payload?.commitSha).filter(Boolean),
        ...commitMemories.map((m) => m.commitSha).filter(Boolean),
      ])
    );

    if (chunks.length === 0 && commitMemories.length === 0) {
      return await Report.create({
        companyId,
        repositoryId,
        reportType: "INTENT",
        targetPath,
        targetSymbol,
        status: "FAILED",
        error: `Insufficient historical context or vector chunks found for ${targetPath}`,
        triggerType,
      });
    }

    const chunkIds = chunks.map((c) => c.payload?.chunkId || c.id || "chunk_unknown");
    const commitContext = commitMemories
      .map((m) => `Commit [${m.commitSha.slice(0, 7)}]: ${m.summary || m.message || ""}`)
      .join("\n");

    const codeContext = chunks
      .map((c) => `<code_block lines="${c.payload?.startLine}-${c.payload?.endLine}">\n${c.payload?.text || ""}\n</code_block>`)
      .join("\n\n");

    const prompt = `Reconstruct the architectural intent and purpose behind ${targetPath} ${targetSymbol ? `(symbol: ${targetSymbol})` : ""}.

Code context:
${codeContext}

Commit context:
${commitContext}

Available Commit SHAs: ${retrievedShas.join(", ")}

Respond in strict JSON format:
{
  "title": "Intent: Purpose of ${targetSymbol || targetPath}",
  "summary": "Concise summary of why this code exists and its historical evolution",
  "intentDescription": "Detailed architectural rationale and design decisions",
  "evidenceCommits": ["list_of_commit_shas_cited_strictly_from_available"],
  "confidence": 0.85
}`;

    let parsed = null;
    try {
      const response = await axios.post(
        getChatCompletionsUrl(),
        {
          model: process.env.LLM_MODEL || "qwen2.5-coder:3b",
          messages: [
            { role: "system", content: "You are WhyCode Intent Reconstruction Engine. Explain why code was written using only real commit evidence." },
            { role: "user", content: prompt },
          ],
          temperature: 0.0,
        },
        { timeout: 35000 }
      );

      const raw = response.data?.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (llmErr) {
      logError("[REPORT] LLM Intent generation failed", { errorMessage: llmErr.message, targetPath });
    }

    if (!parsed) {
      return await Report.create({
        companyId,
        repositoryId,
        reportType: "INTENT",
        targetPath,
        targetSymbol,
        status: "FAILED",
        error: "LLM intent reconstruction timed out or failed to return JSON.",
        triggerType,
      });
    }

    // 2. Strict SHA post-check: only allow SHAs present in retrieved context
    const verifiedEvidenceCommits = postCheckCommitShas(parsed.evidenceCommits || [], retrievedShas);

    const report = await Report.create({
      companyId,
      repositoryId,
      reportType: "INTENT",
      targetPath,
      targetSymbol,
      status: "PENDING_REVIEW",
      isAiGenerated: true,
      severity: "LOW",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.88,
      requiresReview: false,
      inputReferences: {
        chunkIds,
        commitShas: retrievedShas,
        filePaths: [targetPath],
        lineRanges: chunks.map((c) => ({ start: c.payload?.startLine || 1, end: c.payload?.endLine || 1 })),
      },
      output: {
        title: parsed.title || `Intent Analysis: ${targetPath}`,
        summary: parsed.summary || "",
        intentDescription: parsed.intentDescription || parsed.summary || "",
        evidenceCommits: verifiedEvidenceCommits,
        citations: chunkIds,
      },
      model: process.env.LLM_MODEL || "qwen2.5-coder:3b",
      promptVersion: "v1.0.0",
      triggerType,
    });

    logInfo("[REPORT] Intent report generated", { reportId: report._id, targetPath, verifiedShas: verifiedEvidenceCommits.length });
    return report;
  } catch (err) {
    logError("[REPORT] Intent report failed", { errorMessage: err.message, targetPath });
    return await Report.create({
      companyId,
      repositoryId,
      reportType: "INTENT",
      targetPath,
      targetSymbol,
      status: "FAILED",
      error: err.message,
      triggerType,
    });
  }
}

/**
 * Generates a Change Summary Report for a file or repository.
 */
export async function generateChangeSummaryReport({ authContext, repositoryId, targetPath = "*", triggerType = "MANUAL" }) {
  const { companyId } = validateTenantContext(authContext, repositoryId);

  try {
    const recentMemories = await CommitMemory.find({
      repository: repositoryId,
      ...(targetPath !== "*" ? { filePath: targetPath } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const commitShas = recentMemories.map((m) => m.commitSha).filter(Boolean);

    if (recentMemories.length === 0) {
      return await Report.create({
        companyId,
        repositoryId,
        reportType: "CHANGE_SUMMARY",
        targetPath,
        status: "FAILED",
        error: "No recent commits or change history found for target.",
        triggerType,
      });
    }

    const memorySummaries = recentMemories.map((m) => `- ${m.commitSha.slice(0, 7)}: ${m.summary || m.message || "Code updated"}`).join("\n");

    const prompt = `Summarize the recent changes and evolution for ${targetPath}:\n\n${memorySummaries}\n\nRespond in JSON:\n{\n  "title": "Change Summary: ${targetPath}",\n  "summary": "Executive overview of changes",\n  "changeSummary": "Detailed bullet points of what changed and architectural impacts",\n  "evidenceCommits": [${commitShas.map((s) => `"${s}"`).join(", ")}]\n}`;

    let parsed = null;
    try {
      const response = await axios.post(
        getChatCompletionsUrl(),
        {
          model: process.env.LLM_MODEL || "qwen2.5-coder:3b",
          messages: [
            { role: "system", content: "You are WhyCode Change Summary Generator." },
            { role: "user", content: prompt },
          ],
          temperature: 0.0,
        },
        { timeout: 35000 }
      );
      const raw = response.data?.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (llmErr) {
      logError("[REPORT] Change summary LLM failed", { errorMessage: llmErr.message });
    }

    const verifiedCommits = postCheckCommitShas(parsed?.evidenceCommits || commitShas, commitShas);

    const report = await Report.create({
      companyId,
      repositoryId,
      reportType: "CHANGE_SUMMARY",
      targetPath,
      status: "PENDING_REVIEW",
      isAiGenerated: true,
      severity: "LOW",
      confidence: 0.95,
      requiresReview: false,
      inputReferences: {
        chunkIds: [],
        commitShas,
        filePaths: targetPath !== "*" ? [targetPath] : [],
        lineRanges: [],
      },
      output: {
        title: parsed?.title || `Change Summary: ${targetPath}`,
        summary: parsed?.summary || memorySummaries,
        changeSummary: parsed?.changeSummary || memorySummaries,
        evidenceCommits: verifiedCommits,
        citations: [],
      },
      model: process.env.LLM_MODEL || "qwen2.5-coder:3b",
      promptVersion: "v1.0.0",
      triggerType,
    });

    return report;
  } catch (err) {
    return await Report.create({
      companyId,
      repositoryId,
      reportType: "CHANGE_SUMMARY",
      targetPath,
      status: "FAILED",
      error: err.message,
      triggerType,
    });
  }
}

/**
 * Approves a report and creates a published record.
 */
export async function approveReport({ reportId, companyId, user }) {
  const report = await Report.findOne({ _id: reportId, companyId });
  if (!report) {
    const error = new Error("Report not found or access denied.");
    error.status = 404;
    throw error;
  }

  if (report.status === "PUBLISHED") {
    const error = new Error("Report is already published.");
    error.status = 400;
    throw error;
  }

  if (report.status === "REJECTED") {
    const error = new Error("Cannot approve a rejected report.");
    error.status = 400;
    throw error;
  }

  report.status = "PUBLISHED";
  report.publishedVersion = {
    publishedBy: user._id || user.id,
    publishedAt: new Date(),
    title: report.output.title,
    summary: report.output.summary,
    suggestedDoc: report.output.suggestedDoc,
    intentDescription: report.output.intentDescription,
    changeSummary: report.output.changeSummary,
    notes: "Approved without modifications",
    isCustomEdited: false,
  };

  await report.save();
  logInfo("[REPORT] Report approved and published", { reportId: report._id, userId: user.id });
  return report;
}

/**
 * Edits content and approves report, preserving original draft append-only.
 */
export async function editAndApproveReport({ reportId, companyId, user, editedData = {} }) {
  const report = await Report.findOne({ _id: reportId, companyId });
  if (!report) {
    const error = new Error("Report not found or access denied.");
    error.status = 404;
    throw error;
  }

  if (report.status === "PUBLISHED" || report.status === "REJECTED") {
    const error = new Error(`Cannot edit and approve a report with status: ${report.status}`);
    error.status = 400;
    throw error;
  }

  // Preserve original report.output intact (append-only) and save edits in publishedVersion
  report.status = "PUBLISHED";
  report.publishedVersion = {
    publishedBy: user._id || user.id,
    publishedAt: new Date(),
    title: editedData.title || report.output.title,
    summary: editedData.summary || report.output.summary,
    suggestedDoc: editedData.suggestedDoc || report.output.suggestedDoc,
    intentDescription: editedData.intentDescription || report.output.intentDescription,
    changeSummary: editedData.changeSummary || report.output.changeSummary,
    notes: editedData.notes || "Edited and published by reviewer",
    isCustomEdited: true,
  };

  await report.save();
  logInfo("[REPORT] Report edited and published", { reportId: report._id, userId: user.id });
  return report;
}

/**
 * Rejects a report with a mandatory reason.
 */
export async function rejectReport({ reportId, companyId, user, reason }) {
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    const error = new Error("A valid rejection reason is required.");
    error.status = 400;
    throw error;
  }

  const report = await Report.findOne({ _id: reportId, companyId });
  if (!report) {
    const error = new Error("Report not found or access denied.");
    error.status = 404;
    throw error;
  }

  if (report.status === "PUBLISHED") {
    const error = new Error("Cannot reject an already published report.");
    error.status = 400;
    throw error;
  }

  report.status = "REJECTED";
  report.rejectionReason = reason.trim();
  report.rejectedBy = user._id || user.id;
  report.rejectedAt = new Date();

  await report.save();
  logInfo("[REPORT] Report rejected", { reportId: report._id, userId: user.id, reason });
  return report;
}

/**
 * Exports a report to clean GitHub Markdown format.
 */
export function exportReportMarkdown(report) {
  if (!report) return "";
  const isPublished = report.status === "PUBLISHED";
  const activeContent = isPublished && report.publishedVersion ? report.publishedVersion : report.output;

  let md = `# ${activeContent.title || `Report: ${report.targetPath}`}\n\n`;
  md += `- **Report Type**: ${report.reportType}\n`;
  md += `- **Target File**: \`${report.targetPath}\`\n`;
  md += `- **Status**: ${report.status} ${report.isAiGenerated ? "(AI-Generated Draft)" : ""}\n`;
  md += `- **Severity**: ${report.severity} | **Confidence**: ${Math.round((report.confidence || 0.85) * 100)}%\n`;
  md += `- **Model**: \`${report.model}\` | **Prompt Version**: \`${report.promptVersion}\`\n`;
  md += `- **Generated At**: ${new Date(report.createdAt).toISOString()}\n\n`;

  if (isPublished) {
    md += `> **Published By**: User \`${report.publishedVersion?.publishedBy}\` on ${new Date(report.publishedVersion?.publishedAt).toISOString()}\n`;
    if (report.publishedVersion?.isCustomEdited) {
      md += `> **Reviewer Notes**: ${report.publishedVersion?.notes}\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## 📋 Summary\n${activeContent.summary || "No summary available."}\n\n`;

  if (report.reportType === "DRIFT") {
    md += `## 🔍 Documentation Drift Analysis\n`;
    md += `- **Drift Detected**: ${report.output.driftDetected ? "YES ⚠️" : "NO ✅"}\n`;
    if (report.output.driftDetails) {
      md += `\n### Drift Details\n${report.output.driftDetails}\n`;
    }
    if (activeContent.suggestedDoc) {
      md += `\n### 📝 Suggested Documentation Update\n\`\`\`markdown\n${activeContent.suggestedDoc}\n\`\`\`\n`;
    }
  } else if (report.reportType === "INTENT") {
    md += `## 🎯 Reconstructed Intent & Architectural Rationale\n${activeContent.intentDescription || activeContent.summary}\n\n`;
    if (report.output.evidenceCommits?.length > 0) {
      md += `### 🔗 Verified Evidence Commits\n`;
      for (const sha of report.output.evidenceCommits) {
        md += `- \`${sha}\`\n`;
      }
    }
  } else if (report.reportType === "CHANGE_SUMMARY") {
    md += `## 📈 Change Evolution\n${activeContent.changeSummary || activeContent.summary}\n\n`;
    if (report.output.evidenceCommits?.length > 0) {
      md += `### 🔗 Associated Commits\n`;
      for (const sha of report.output.evidenceCommits) {
        md += `- \`${sha}\`\n`;
      }
    }
  }

  return md;
}
