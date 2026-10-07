import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getEmbedding, rerank } from "../services/teiService.js";
import { searchChunks } from "../services/qdrantStore.js";
import { labelEvidenceChunks } from "../services/groundingService.js";
import { generateGroundedAnswer } from "../services/vllmService.js";

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

async function diag() {
  const q = "How does the estimate-loss endpoint calculate loss in ml-service/main.py?";
  const vec = await getEmbedding(q);
  const matches = await searchChunks(USER_SESSION, REPO_ID, "repository_chunks", vec, 30);
  const reranked = await rerank(q, matches);
  const valid = reranked.filter(m => m.score >= 0.3);
  const labeled = labelEvidenceChunks(valid);

  console.log("Labeled evidence items:", labeled.map(l => ({ id: l.evidenceId, chunkId: l.chunkId, path: l.path })));

  const res = await generateGroundedAnswer(q, labeled);
  console.log("LLM Raw Answer:", res.answer);
  console.log("LLM Cited Chunk IDs:", res.citedChunkIds);
}

diag().catch(console.error);
