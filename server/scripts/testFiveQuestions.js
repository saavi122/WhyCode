import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { queryRepositoryKnowledge } from "../services/groundingService.js";
import { getEmbedding, rerank } from "../services/teiService.js";
import { searchChunks } from "../services/qdrantStore.js";

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

async function testFiveQuestions() {
  const questions = [
    "What is the purpose of the GigSure platform according to the README?",
    "What endpoints or routes are configured in the ML service FastAPI application in main.py?",
    "What functions or tests are in ml-service/test_endpoints.py?",
    "How does the estimate-loss endpoint calculate loss in ml-service/main.py?",
    "What commits exist in the repository history for GigSure?",
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\n================================================================================`);
    console.log(`[Question ${i + 1}] "${q}"`);

    const queryVec = await getEmbedding(q);
    const rawMatches = await searchChunks(USER_SESSION, REPO_ID, "repository_chunks", queryVec, 30);
    const reranked = await rerank(q, rawMatches);
    const top8 = reranked.slice(0, 8);

    console.log(`\nRetrieved Paths & Scores (Top 5 Reranked):`);
    top8.slice(0, 5).forEach((m, idx) => {
      const p = m.payload?.filePath || m.payload?.path || "unknown";
      const dt = m.payload?.documentType || "CODE";
      console.log(` ${idx + 1}. [score: ${m.score.toFixed(4)}] [type: ${dt}] ${p} (lines: ${m.payload?.startLine ?? 1}-${m.payload?.endLine ?? 1})`);
    });

    const result = await queryRepositoryKnowledge(USER_SESSION, REPO_ID, q, { minScoreThreshold: 0.3 });
    console.log(`\nGrounded Status: ${result.grounded}`);
    console.log(`Answer:\n${result.answer}`);
    console.log(`\nResolved Citations (${result.citations.length}):`);
    result.citations.forEach((c, idx) => {
      console.log(` [${idx + 1}] chunkId: ${c.chunkId} | path: ${c.path} | lines: [${c.lineRange}] | url: ${c.url || 'N/A'}`);
    });
  }
}

testFiveQuestions().catch(console.error);
