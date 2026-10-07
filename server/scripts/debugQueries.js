import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { queryRepositoryKnowledge } from "../services/groundingService.js";
import { generateGroundedAnswer } from "../services/vllmService.js";
import { getEmbedding, rerank } from "../services/teiService.js";
import { searchChunks } from "../services/qdrantStore.js";
import { labelEvidenceChunks } from "../services/groundingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const COMPANY_ID = "6ac109ecc9b4a76a9ca591f2";
const REPO_ID = "6ac19a3fbb1ce57fae1480a7";
const USER_SESSION = {
  id: "6ac109ecc9b4a76a9ca591f4",
  _id: "6ac109ecc9b4a76a9ca591f4",
  company: COMPANY_ID,
  companyId: COMPANY_ID,
};

async function testQuestions() {
  const questions = [
    "How does the estimate-loss endpoint calculate loss in ml-service/main.py?",
    "What test routes and functions are tested in ml-service/test_endpoints.py?",
    "What commits exist in the repository history for GigSure?",
  ];

  for (const q of questions) {
    console.log("==================================================");
    console.log("QUERY:", q);

    const vec = await getEmbedding(q);
    const raw = await searchChunks(USER_SESSION, REPO_ID, "repository_chunks", vec, 30);
    const reranked = await rerank(q, raw);
    const valid = reranked.slice(0, 8);
    const labeled = labelEvidenceChunks(valid);

    console.log("Top Chunks:", labeled.map(l => ({ id: l.evidenceId, chunkId: l.chunkId, path: l.path, score: l.score })));

    try {
      const llmRes = await generateGroundedAnswer(q, labeled);
      console.log("Raw LLM Answer:", llmRes.answer);
      console.log("LLM Cited:", llmRes.citedChunkIds);
    } catch (err) {
      console.error("LLM Generation Error:", err.message);
    }
  }
}

testQuestions().catch(console.error);
