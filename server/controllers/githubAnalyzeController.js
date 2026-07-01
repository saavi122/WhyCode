import { getAIClient } from "../config/ai.js";

/**
 * POST /api/github/analyze-commit
 * Body: { username, repoName, commitSha, commitMessage, commitDate, authorName }
 *
 * Fetches real commit diff from GitHub public API, then sends to Gemini
 * for a real intent + impact + documentation suggestion analysis.
 */
export const analyzeCommit = async (req, res, next) => {
  try {
    const { username, repoName, commitSha, commitMessage, commitDate, authorName } = req.body;

    if (!username || !repoName || !commitSha) {
      return res.status(400).json({ message: "username, repoName and commitSha are required" });
    }

    // 1. Fetch commit detail from GitHub public API (no token required for public repos)
    const commitUrl = `https://api.github.com/repos/${username}/${repoName}/commits/${commitSha}`;
    const commitRes = await fetch(commitUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "WhyCode-App",
      },
    });

    let diffContext = "";
    let filesChanged = [];

    if (commitRes.ok) {
      const commitData = await commitRes.json();
      filesChanged = (commitData.files || []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: (f.patch || "").slice(0, 800), // cap patch size for token limits
      }));

      // Build a readable diff context for the AI
      diffContext = filesChanged
        .map((f) => `File: ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n${f.patch}`)
        .join("\n\n---\n\n");
    } else {
      // If GitHub API rate limits or private repo — use commit message as context
      diffContext = `Commit message only (diff unavailable): ${commitMessage}`;
    }

    // 2. Send to Gemini AI for real analysis
    const ai = getAIClient();

    const analysisSchema = {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description: "WHY this commit was made — the business or technical reason, not just what the code does",
        },
        impact: {
          type: "string",
          description: "What is the functional impact of this commit on the system, users, or other developers",
        },
        riskLevel: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
        riskReason: {
          type: "string",
          description: "Why was this risk level assigned",
        },
        suggestedDocComment: {
          type: "string",
          description: "A professional JSDoc/docstring comment that should be added to document this change",
        },
        keyChangeSummary: {
          type: "array",
          items: { type: "string" },
          description: "3-5 bullet points summarizing the key technical changes",
        },
        confidence: {
          type: "number",
          description: "Confidence score 0-100 for this analysis",
        },
      },
      required: ["intent", "impact", "riskLevel", "riskReason", "suggestedDocComment", "keyChangeSummary", "confidence"],
    };

    const prompt = `You are WhyCode AI — an expert at reverse-engineering the intent and business reasoning behind code commits.

Analyze this Git commit and explain WHY it exists, not just what it does.

Repository: ${username}/${repoName}
Commit SHA: ${commitSha}
Author: ${authorName || "Unknown"}
Date: ${commitDate || "Unknown"}
Commit Message: "${commitMessage}"

Code Diff:
${diffContext || "No diff available"}

Instructions:
- Explain the real reason/intent behind this commit (business need, bug being fixed, performance goal, etc.)
- Assess the functional impact on the system
- Rate the risk level (breaking changes? Security? Data?)
- Suggest a professional documentation comment for this change
- List 3-5 bullet points of key technical changes

Be specific and insightful. Reference the actual files and changes shown.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const analysis = JSON.parse(response.text);

    res.json({
      success: true,
      commitSha,
      repoName: `${username}/${repoName}`,
      filesChanged: filesChanged.length,
      analysis,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/github/analyze-repo
 * Body: { username, repoName }
 *
 * Fetches recent commits (last 10) + repo metadata from GitHub,
 * runs a full repository health analysis via Gemini AI.
 */
export const analyzeRepo = async (req, res, next) => {
  try {
    const { username, repoName } = req.body;
    if (!username || !repoName) {
      return res.status(400).json({ message: "username and repoName are required" });
    }

    // 1. Fetch repo metadata
    const [repoRes, commitsRes, languagesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${username}/${repoName}`, {
        headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "WhyCode-App" },
      }),
      fetch(`https://api.github.com/repos/${username}/${repoName}/commits?per_page=10`, {
        headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "WhyCode-App" },
      }),
      fetch(`https://api.github.com/repos/${username}/${repoName}/languages`, {
        headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "WhyCode-App" },
      }),
    ]);

    let repoMeta = {};
    let commits = [];
    let languages = {};

    if (repoRes.ok) repoMeta = await repoRes.json();
    if (commitsRes.ok) commits = await commitsRes.json();
    if (languagesRes.ok) languages = await languagesRes.json();

    const commitSummaries = commits.map((c) => ({
      sha: c.sha?.slice(0, 7),
      message: c.commit?.message?.split("\n")[0],
      author: c.commit?.author?.name,
      date: c.commit?.author?.date,
    }));

    // 2. Gemini AI repo health analysis
    const ai = getAIClient();

    const repoAnalysisSchema = {
      type: "object",
      properties: {
        overallHealthScore: { type: "number", description: "0-100 score of the repo's overall code health" },
        healthGrade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
        summary: { type: "string", description: "2-3 sentence executive summary of the repository" },
        strengths: { type: "array", items: { type: "string" } },
        concerns: { type: "array", items: { type: "string" } },
        commitPatterns: { type: "string", description: "Analysis of commit message quality and development patterns" },
        documentationScore: { type: "number" },
        activityScore: { type: "number" },
        recommendations: { type: "array", items: { type: "string" } },
        busFactor: { type: "number", description: "Estimated bus factor based on commit authors" },
      },
      required: [
        "overallHealthScore", "healthGrade", "summary", "strengths",
        "concerns", "commitPatterns", "documentationScore", "activityScore",
        "recommendations", "busFactor",
      ],
    };

    const repoPrompt = `You are WhyCode AI — a senior code intelligence system that analyzes repositories.

Analyze this GitHub repository and provide a comprehensive health report.

Repository: ${username}/${repoName}
Description: ${repoMeta.description || "None"}
Primary Language: ${repoMeta.language || "Unknown"}
Stars: ${repoMeta.stargazers_count || 0}
Open Issues: ${repoMeta.open_issues_count || 0}
Forks: ${repoMeta.forks_count || 0}
Created: ${repoMeta.created_at || "Unknown"}
Last Updated: ${repoMeta.updated_at || "Unknown"}
Default Branch: ${repoMeta.default_branch || "main"}

Languages Used: ${JSON.stringify(languages)}

Recent Commits (last 10):
${commitSummaries.map((c) => `- [${c.sha}] ${c.author} (${c.date?.slice(0, 10)}): ${c.message}`).join("\n")}

Provide:
1. Overall health score (0-100) and grade (A-F)
2. Repository summary
3. Strengths observed
4. Concerns or risks
5. Commit pattern analysis (frequency, message quality, development style)
6. Documentation score
7. Activity score
8. Actionable recommendations
9. Bus factor estimate (how many unique contributors are active)`;

    const repoResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: repoPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: repoAnalysisSchema,
      },
    });

    const repoAnalysis = JSON.parse(repoResponse.text);

    res.json({
      success: true,
      repo: `${username}/${repoName}`,
      meta: {
        language: repoMeta.language,
        stars: repoMeta.stargazers_count,
        forks: repoMeta.forks_count,
        openIssues: repoMeta.open_issues_count,
        languages,
        totalCommitsAnalyzed: commitSummaries.length,
      },
      recentCommits: commitSummaries,
      analysis: repoAnalysis,
    });
  } catch (err) {
    next(err);
  }
};
