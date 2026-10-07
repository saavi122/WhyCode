# WhyCode Scripts Catalog & Operational Manual

This directory contains operational, verification, calibration, and evaluation scripts for WhyCode.

---

## 🚀 Core Operational & Verification Scripts

| Script | Purpose | Mode / Safety Guards | Target |
| :--- | :--- | :--- | :--- |
| `checkGithubApp.js` | Signs in-memory JWT from `GITHUB_PRIVATE_KEY_B64`, calls `/app`, prints app name/slug & detects clock skew. | Read-Only | GitHub API |
| `llmProviders.js` | Audits configured LLM providers (Gemini, vLLM/Ollama, Groq) with `/models` and structured request. Never logs keys. | Read-Only | LLM APIs |
| `verifyEmbeddings.js <url>` | Verifies TEI embedding endpoint returns vector with `EMBED_DIM` dimensions (authorized) and 401/403 (unauthorized). | Read-Only | TEI Service |
| `verifyReranker.js <url>` | Verifies TEI reranker returns scores on sample query/passages and tests unauthorized access. | Read-Only | TEI Service |
| `verifyIndex.js` | Audits local/remote Qdrant repository index against GitHub tree HEAD, verifying file & commit coverage >= 95%. | Read-Only | Qdrant / GitHub |
| `smokeTest.js` | Validates end-to-end local & remote Qdrant health, vector count, and point existence. | Read-Only | Qdrant |
| `reindexRepository.js` | Re-indexes repository using structure-aware parser with dry-run default. | **Writes** (Requires `--apply`) | Qdrant / Mongo |
| `calibrateThresholds.js`| Generates optimal retrieval and similarity thresholds from eval query benchmarks. | Read-Only (writes JSON file) | Local File |
| `runEvaluation.js` | Executes full RAG evaluation benchmark across DEV and TEST splits in `eval/questions.jsonl`. | Read-Only (writes report) | Local / Qdrant |
| `dedupeRepositories.js` | Audits and deduplicates duplicate repository records in MongoDB. | **Writes** (Dry-run by default, requires `--apply`) | Mongo |
| `purgeSeedData.js` | Safely purges test/seed tenants and synthetic data. | **Writes** (Dry-run by default, requires `--apply`) | Mongo / Qdrant |

---

## 📸 Client & UI Automation Scripts

| Script | Purpose |
| :--- | :--- |
| `serveDist.js` | Lightweight static HTTP server for serving `client/dist` locally during testing. |
| `takeScreenshots.ps1` | PowerShell headless Chrome runner to capture 1440px, 1024px, and 390px viewport renders into `docs/screenshots/`. |
| `captureScreenshots.js` | Node.js automation script for viewport snapshot generation. |

---

## 📋 Proposed Script Organization (One-Off Diagnostics -> `scripts/dev/`)

The following one-off diagnostic, inspection, and experimental scripts are proposed to be moved to `scripts/dev/` to maintain a clean root scripts directory:

| Proposed Destination | Source File | Purpose |
| :--- | :--- | :--- |
| `scripts/dev/diagQ4.js` | `server/scripts/diagQ4.js` | One-off diagnostic for question #4 retrieval trace. |
| `scripts/dev/debugQueries.js` | `server/scripts/debugQueries.js` | Diagnostic query inspector for vector similarity debugging. |
| `scripts/dev/checkQdrantStatus.js` | `server/scripts/checkQdrantStatus.js` | Ad-hoc Qdrant health and collection point counters. |
| `scripts/dev/checkRawCommit.js` | `server/scripts/checkRawCommit.js` | GitHub commit payload and metadata inspector. |
| `scripts/dev/inspectCommitsDetail.js` | `server/scripts/inspectCommitsDetail.js` | Detailed commit message and author inspector. |
| `scripts/dev/inspectData.js` | `server/scripts/inspectData.js` | MongoDB raw collections and tenant document inspector. |
| `scripts/dev/inspectDb.js` | `scripts/inspectDb.js` | Database document counter and tenant isolation viewer. |
| `scripts/dev/inspectPoints.js` | `server/scripts/inspectPoints.js` | Qdrant raw payload and vector point viewer. |
| `scripts/dev/inspectQdrant.js` | `server/scripts/inspectQdrant.js` | Qdrant collection schema and index metadata inspector. |
| `scripts/dev/listRepoFiles.js` | `server/scripts/listRepoFiles.js` | GitHub repository tree flat file listing utility. |
| `scripts/dev/testActivityEndpoint.js` | `server/scripts/testActivityEndpoint.js` | Ad-hoc tester for `/api/activity` route. |
| `scripts/dev/testFiveQuestions.js` | `server/scripts/testFiveQuestions.js` | Experimental mini RAG benchmark test. |
| `scripts/dev/testIsolation.js` | `server/scripts/testIsolation.js` | Ad-hoc tenant vector boundary tester. |
| `scripts/dev/testOllamaGrounding.js` | `server/scripts/testOllamaGrounding.js` | Ad-hoc Ollama local model grounding test. |
| `scripts/dev/verifyPurge.js` | `server/scripts/verifyPurge.js` | One-off post-purge database consistency verifier. |
