import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { queryRepositoryKnowledge } from "../services/groundingService.js";
import { getEmbedding, rerank } from "../services/teiService.js";
import { searchChunks } from "../services/qdrantStore.js";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

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

async function measureTokensPerSecond(promptText) {
  const start = Date.now();
  try {
    const res = await axios.post("http://localhost:11434/api/generate", {
      model: "qwen2.5-coder:3b",
      prompt: promptText,
      stream: false,
    });
    const durationSec = (Date.now() - start) / 1000;
    const evalCount = res.data.eval_count || 0;
    const evalDurationSec = (res.data.eval_duration || 1) / 1e9;
    const tokPerSec = evalCount > 0 ? (evalCount / evalDurationSec).toFixed(2) : (evalCount / durationSec).toFixed(2);
    return {
      tokens: evalCount,
      durationSec: durationSec.toFixed(2),
      tokensPerSecond: tokPerSec,
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function runProof() {
  console.log("================================================================================");
  console.log("WHYCODE GROUNDED RAG PROOF & EVALUATION BENCHMARK");
  console.log("================================================================================");

  // 1. Five In-Repository Questions
  const fiveQuestions = [
    "What endpoints or routes are configured in the ML service FastAPI application in main.py?",
    "How does the estimate-loss endpoint calculate loss in ml-service/main.py?",
    "What is the architecture and purpose of the GigSure platform described in the README?",
    "What test routes and functions are tested in ml-service/test_endpoints.py?",
    "What commits exist in the repository history for GigSure?",
  ];

  console.log("\n### PART 1: 5 REAL IN-REPOSITORY QUESTIONS WITH RETRIEVED PATHS, SCORES & CITATIONS\n");

  for (let i = 0; i < fiveQuestions.length; i++) {
    const q = fiveQuestions[i];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[Q${i + 1}] Question: "${q}"`);

    // Trace retrieval & reranking directly
    const queryVec = await getEmbedding(q);
    const rawMatches = await searchChunks(USER_SESSION, REPO_ID, "repository_chunks", queryVec, 30);
    const reranked = await rerank(q, rawMatches);
    const top8 = reranked.slice(0, 8);

    console.log(`\n  Top Retrieved Candidates (Post-Rerank):`);
    top8.slice(0, 5).forEach((m, idx) => {
      const p = m.payload?.filePath || m.payload?.path || "unknown";
      const dt = m.payload?.documentType || "CODE";
      console.log(`   ${idx + 1}. [score: ${m.score.toFixed(4)}] [type: ${dt}] ${p} (lines: ${m.payload?.startLine ?? 1}-${m.payload?.endLine ?? 1})`);
    });

    // Run full pipeline
    const evalEngine = process.argv.find((a) => a.startsWith("--engine="))?.split("=")[1] || process.env.EVAL_ENGINE || "PRIMARY_ONLY";
    const startT = Date.now();
    const result = await queryRepositoryKnowledge(USER_SESSION, REPO_ID, q, {
      engineMode: evalEngine.toUpperCase(),
    });
    const duration = ((Date.now() - startT) / 1000).toFixed(2);

    console.log(`\n  Answer generated in ${duration}s (Grounded: ${result.grounded}) [Engine: ${result.answeredBy?.engine || 'primary'} | Provider: ${result.answeredBy?.provider || 'Ollama'}]:`);
    console.log(`  "${result.answer}"`);

    console.log(`\n  Resolved Citations (${result.citations.length}):`);
    result.citations.forEach((c, idx) => {
      console.log(`   [${idx + 1}] chunkId: ${c.chunkId} | path: ${c.path} | lines: [${c.lineRange}] | url: ${c.url || 'N/A'}`);
    });
    console.log("");
  }

  // 2. Three Out-of-Repository Questions
  const outOfRepoQuestions = [
    "How does the Bitcoin lightning payment network channel settlement work in this repository?",
    "Where is the Kubernetes Helm chart deployment configuration for the Rust microservice?",
    "How does the Kotlin Android mobile app sync offline sqlite database records?",
  ];

  console.log("================================================================================");
  console.log("### PART 2: 3 OUT-OF-REPOSITORY QUESTIONS (EXACT REFUSAL VERIFICATION)\n");

  for (let i = 0; i < outOfRepoQuestions.length; i++) {
    const q = outOfRepoQuestions[i];
    console.log(`[OutOfRepo ${i + 1}] Question: "${q}"`);
    const result = await queryRepositoryKnowledge(USER_SESSION, REPO_ID, q);
    console.log(`  Grounded: ${result.grounded}`);
    console.log(`  Citations: ${result.citations.length}`);
    console.log(`  Answer: "${result.answer}"`);
    const matchesRefusal = result.answer.includes("I couldn't find sufficient evidence in the connected repository");
    console.log(`  -> Exact Refusal Matched: ${matchesRefusal}\n`);
  }

  // 3. Question about commit by "alex"
  console.log("================================================================================");
  console.log("### PART 3: QUESTION ABOUT COMMIT BY 'ALEX' (MUST SAY NO EVIDENCE)\n");

  const alexQuestion = "Show me the commits authored by alex regarding payment service logic.";
  console.log(`Question: "${alexQuestion}"`);
  const alexResult = await queryRepositoryKnowledge(USER_SESSION, REPO_ID, alexQuestion);
  console.log(`  Grounded: ${alexResult.grounded}`);
  console.log(`  Citations: ${alexResult.citations.length}`);
  console.log(`  Answer: "${alexResult.answer}"`);
  const alexRefusal = alexResult.answer.includes("I couldn't find sufficient evidence in the connected repository");
  console.log(`  -> Exact Refusal / No Evidence Matched: ${alexRefusal}\n`);

  // 4. Tenant Isolation Check
  console.log("================================================================================");
  console.log("### PART 4: TENANT ISOLATION CHECK WITH SECOND COMPANY\n");

  try {
    const isolationResult = await queryRepositoryKnowledge(ISOLATED_SESSION, REPO_ID, "What endpoints exist?");
    console.log("Tenant search returned:", isolationResult);
  } catch (isoErr) {
    console.log("Isolated tenant access blocked as expected:", isoErr.message);
  }

  // 5. Measure tokens per second on active Ollama instance
  console.log("\n================================================================================");
  console.log("### PART 5: OLLAMA GENERATION TOKENS PER SECOND BENCHMARK\n");

  const benchmark = await measureTokensPerSecond("Explain briefly in 3 sentences what software testing is.");
  console.log("Tokens generated:", benchmark.tokens);
  console.log("Duration:", benchmark.durationSec, "seconds");
  console.log("Tokens Per Second:", benchmark.tokensPerSecond, "tok/s");
}

runProof().catch((err) => {
  console.error("Proof execution error:", err);
  process.exit(1);
});
