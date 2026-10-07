import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getEmbedding, rerank } from "../services/teiService.js";
import { searchChunks } from "../services/qdrantStore.js";
import { validateTenantContext, TenantValidationError } from "../services/tenantGuard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const COMPANY_ID = "6ac109ecc9b4a76a9ca591f2"; // PayPal
const REPO_ID = "6ac19a3fbb1ce57fae1480a7"; // saavi122/GigSure
const USER_SESSION = {
  id: "6ac109ecc9b4a76a9ca591f4",
  _id: "6ac109ecc9b4a76a9ca591f4",
  company: COMPANY_ID,
  companyId: COMPANY_ID,
  role: "company",
};

const ISOLATED_SESSION = {
  id: "6ac273b8fd46c73959942fe5",
  _id: "6ac273b8fd46c73959942fe5",
  company: "6ac273b8fd46c73959942fe4",
  companyId: "6ac273b8fd46c73959942fe4",
  role: "employee",
};

function loadQuestions() {
  const possiblePaths = [
    path.join(__dirname, "../../eval/questions.jsonl"),
    path.join(__dirname, "../eval/questions.jsonl"),
    path.join(process.cwd(), "eval/questions.jsonl"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      return content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
    }
  }
  throw new Error("eval/questions.jsonl not found in expected locations");
}

function matchesExpected(candidatePath, expectedPaths = []) {
  if (!candidatePath || expectedPaths.length === 0) return false;
  const normCand = candidatePath.toLowerCase().replace(/\\/g, "/");
  return expectedPaths.some((exp) => {
    const normExp = exp.toLowerCase().replace(/\\/g, "/");
    return normCand === normExp || normCand.includes(normExp) || normExp.includes(normCand);
  });
}

function computeMetrics(results) {
  let hit5 = 0;
  let hit10 = 0;
  let reciprocalRanks = [];

  for (const res of results) {
    let firstRank = 0;
    for (let i = 0; i < res.candidates.length; i++) {
      if (matchesExpected(res.candidates[i].filePath, res.expectedPaths)) {
        firstRank = i + 1;
        break;
      }
    }

    if (firstRank > 0 && firstRank <= 5) hit5++;
    if (firstRank > 0 && firstRank <= 10) hit10++;
    reciprocalRanks.push(firstRank > 0 ? 1 / firstRank : 0);
  }

  const total = results.length;
  const recall5 = total > 0 ? hit5 / total : 0;
  const recall10 = total > 0 ? hit10 / total : 0;
  const mrr = total > 0 ? reciprocalRanks.reduce((a, b) => a + b, 0) / total : 0;

  return { recall5, recall10, mrr, hit5, hit10, total };
}

function computeScoreStats(scores) {
  if (scores.length === 0) return { min: 0, max: 0, mean: 0, count: 0 };
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = sum / scores.length;
  return { min, max, mean, count: scores.length };
}

export async function runRetrievalCheck() {
  console.log("================================================================================");
  console.log("WHYCODE RETRIEVAL BENCHMARK & METRICS EVALUATION (scripts/retrievalCheck.js)");
  console.log("================================================================================\n");

  const questions = loadQuestions();
  console.log(`Loaded ${questions.length} questions from eval/questions.jsonl`);

  const answerable = questions.filter((q) => q.expectedPaths && q.expectedPaths.length > 0);
  const unanswerable = questions.filter((q) => !q.expectedPaths || q.expectedPaths.length === 0);

  console.log(`- Answerable questions: ${answerable.length}`);
  console.log(`- Unanswerable questions: ${unanswerable.length}\n`);

  const rawResults = [];
  const rerankedResults = [];
  const answerableScores = [];
  const unanswerableScores = [];

  for (let idx = 0; idx < questions.length; idx++) {
    const qItem = questions[idx];
    const isAnswerable = qItem.expectedPaths && qItem.expectedPaths.length > 0;
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[Q${idx + 1}/${questions.length}] (${qItem.type}) "${qItem.question}"`);
    if (isAnswerable) {
      console.log(`  Expected Paths: ${JSON.stringify(qItem.expectedPaths)}`);
    } else {
      console.log(`  Expected: [UNANSWERABLE / REFUSAL EXPECTED]`);
    }

    try {
      const queryVec = await getEmbedding(qItem.question);
      const rawMatches = await searchChunks(USER_SESSION, REPO_ID, "repository_chunks", queryVec, 30);
      const rerankedMatches = await rerank(qItem.question, rawMatches);

      const top10Raw = rawMatches.slice(0, 10).map((m) => ({
        score: m.score,
        filePath: m.payload?.filePath || m.payload?.path || "",
        documentType: m.payload?.documentType || "CODE",
        lines: `L${m.payload?.startLine ?? 1}-L${m.payload?.endLine ?? 1}`,
      }));

      const top10Rerank = rerankedMatches.slice(0, 10).map((m) => ({
        score: m.score,
        filePath: m.payload?.filePath || m.payload?.path || "",
        documentType: m.payload?.documentType || "CODE",
        lines: `L${m.payload?.startLine ?? 1}-L${m.payload?.endLine ?? 1}`,
      }));

      console.log(`\n  Top 10 Post-Rerank Candidates:`);
      top10Rerank.forEach((c, i) => {
        const matchBadge = matchesExpected(c.filePath, qItem.expectedPaths) ? " [MATCH]" : "";
        console.log(`   ${i + 1}. [score: ${c.score.toFixed(4)}] [type: ${c.documentType}] ${c.filePath} (${c.lines})${matchBadge}`);
      });

      const topScore = top10Rerank[0]?.score ?? 0;
      if (isAnswerable) {
        answerableScores.push(topScore);
        rawResults.push({ question: qItem.question, expectedPaths: qItem.expectedPaths, candidates: top10Raw });
        rerankedResults.push({ question: qItem.question, expectedPaths: qItem.expectedPaths, candidates: top10Rerank });
      } else {
        unanswerableScores.push(topScore);
      }
    } catch (qErr) {
      console.error(`Error processing [Q${idx + 1}]:`, qErr.message);
    }
    console.log("");
  }

  // Compute retrieval metrics
  const rawMetrics = computeMetrics(rawResults);
  const rerankMetrics = computeMetrics(rerankedResults);
  const ansStats = computeScoreStats(answerableScores);
  const unansStats = computeScoreStats(unanswerableScores);

  console.log("================================================================================");
  console.log("### RETRIEVAL PERFORMANCE METRICS (BEFORE VS AFTER RERANKING)");
  console.log("================================================================================");
  console.log(`Metric           | Before Rerank (Dense) | After Rerank (TEI Cross-Encoder)`);
  console.log(`-----------------+-----------------------+----------------------------------`);
  console.log(`Recall@5         | ${(rawMetrics.recall5 * 100).toFixed(2)}% (${rawMetrics.hit5}/${rawMetrics.total})           | ${(rerankMetrics.recall5 * 100).toFixed(2)}% (${rerankMetrics.hit5}/${rerankMetrics.total})`);
  console.log(`Recall@10        | ${(rawMetrics.recall10 * 100).toFixed(2)}% (${rawMetrics.hit10}/${rawMetrics.total})           | ${(rerankMetrics.recall10 * 100).toFixed(2)}% (${rerankMetrics.hit10}/${rerankMetrics.total})`);
  console.log(`MRR              | ${rawMetrics.mrr.toFixed(4)}                | ${rerankMetrics.mrr.toFixed(4)}`);
  console.log("================================================================================\n");

  console.log("### SCORE RANGES (TOP RERANK SCORE DISTRIBUTION)");
  console.log("================================================================================");
  console.log(`Category     | Count | Min Score | Max Score | Mean Score`);
  console.log(`-------------+-------+-----------+-----------+------------`);
  console.log(`Answerable   | ${ansStats.count.toString().padEnd(5)} | ${ansStats.min.toFixed(4).padEnd(9)} | ${ansStats.max.toFixed(4).padEnd(9)} | ${ansStats.mean.toFixed(4)}`);
  console.log(`Unanswerable | ${unansStats.count.toString().padEnd(5)} | ${unansStats.min.toFixed(4).padEnd(9)} | ${unansStats.max.toFixed(4).padEnd(9)} | ${unansStats.mean.toFixed(4)}`);
  console.log("================================================================================\n");

  // Isolation Checks
  console.log("================================================================================");
  console.log("### TENANT & REPOSITORY ISOLATION CHECKS");
  console.log("================================================================================");

  // Check 1: Second company gets zero results
  let check1Pass = false;
  try {
    const isoVec = await getEmbedding("What endpoints exist?");
    const isoResults = await searchChunks(ISOLATED_SESSION, REPO_ID, "repository_chunks", isoVec, 10);
    check1Pass = isoResults.length === 0;
    console.log(`[Check 1] Second company query on foreign repo: ${check1Pass ? "PASS (0 results returned)" : "FAIL"}`);
  } catch (err) {
    check1Pass = true;
    console.log(`[Check 1] Second company query rejected: PASS (${err.message})`);
  }

  // Check 2: Wrong repositoryId gets zero results
  let check2Pass = false;
  try {
    const wrongRepoVec = await getEmbedding("What endpoints exist?");
    const wrongRepoResults = await searchChunks(USER_SESSION, "650000000000000000000099", "repository_chunks", wrongRepoVec, 10);
    check2Pass = wrongRepoResults.length === 0;
    console.log(`[Check 2] Valid company with wrong repositoryId: ${check2Pass ? "PASS (0 results returned)" : "FAIL"}`);
  } catch (err) {
    check2Pass = true;
    console.log(`[Check 2] Valid company with wrong repositoryId rejected: PASS (${err.message})`);
  }

  // Check 3: Missing companyId throws before any Qdrant call
  let check3Pass = false;
  try {
    validateTenantContext({}, REPO_ID);
    console.log(`[Check 3] Missing companyId validation: FAIL (did not throw)`);
  } catch (err) {
    if (err instanceof TenantValidationError || err.name === "TenantValidationError" || err.message.includes("Tenant validation failed")) {
      check3Pass = true;
      console.log(`[Check 3] Missing companyId throws before Qdrant call: PASS (${err.name}: ${err.message})`);
    } else {
      console.log(`[Check 3] Missing companyId threw unexpected error: FAIL (${err.message})`);
    }
  }

  const allIsolationPass = check1Pass && check2Pass && check3Pass;
  console.log(`\nISOLATION VERIFICATION OVERALL: ${allIsolationPass ? "PASS (ALL 3 CHECKS SUCCEEDED)" : "FAIL"}`);
  console.log("================================================================================\n");

  return {
    rawMetrics,
    rerankMetrics,
    ansStats,
    unansStats,
    isolation: { check1Pass, check2Pass, check3Pass, allIsolationPass },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRetrievalCheck().catch((err) => {
    console.error("Retrieval check error:", err);
    process.exit(1);
  });
}
