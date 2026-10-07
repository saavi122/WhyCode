import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import { getEmbedding as getTeiEmbedding } from "../services/teiService.js";
import { getLocalEmbedding } from "../services/localEmbeddingService.js";
import { searchChunks } from "../services/qdrantStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { servicesConfig } from "../config/services.js";

// Enforce strict local Qdrant usage for comparison
process.env.QDRANT_URL = "http://127.0.0.1:6333";
process.env.QDRANT_API_KEY = "";
servicesConfig.qdrantUrl = "http://127.0.0.1:6333";
servicesConfig.qdrantApiKey = "";

const QDRANT_URL = "http://127.0.0.1:6333";
const COLLECTION_NAME = "repository_chunks";

// Active benchmark session context for saavi122/GigSure
const COMPANY_ID = "6ac109ecc9b4a76a9ca591f2";
const REPO_ID = "6ac19a3fbb1ce57fae1480a7";
const USER_SESSION = {
  id: "6ac109ecc9b4a76a9ca591f4",
  _id: "6ac109ecc9b4a76a9ca591f4",
  company: COMPANY_ID,
  companyId: COMPANY_ID,
  role: "company",
};

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function checkRecall(retrievedChunks, expectedPaths, k) {
  if (!expectedPaths || expectedPaths.length === 0) return { hit: true, rank: 1 };
  const topK = retrievedChunks.slice(0, k);
  for (let rank = 1; rank <= topK.length; rank++) {
    const chunk = topK[rank - 1];
    const path = chunk.payload?.filePath || chunk.payload?.path || "";
    const isCommit = (chunk.payload?.documentType || "") === "COMMIT" || path.startsWith("commits/");
    
    for (const exp of expectedPaths) {
      if (path === exp || path.endsWith(exp) || (isCommit && exp.startsWith("commits/"))) {
        return { hit: true, rank };
      }
    }
  }
  return { hit: false, rank: Infinity };
}

async function getQdrantPointCount() {
  const res = await axios.get(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
  return res.data?.result?.points_count ?? 0;
}

export async function runEmbeddingComparison() {
  console.log("================================================================================");
  console.log("       WHYCODE EMBEDDING RETRIEVAL COMPARISON: TEI vs IN-PROCESS ONNX           ");
  console.log("================================================================================");
  console.log(`Qdrant URL:        ${QDRANT_URL}`);
  console.log(`Collection:        ${COLLECTION_NAME}`);
  console.log(`TEI Service:       http://127.0.0.1:8080 (BAAI/bge-small-en-v1.5)`);
  console.log(`ONNX Service:      In-Process @huggingface/transformers (BAAI/bge-small-en-v1.5)`);
  console.log("--------------------------------------------------------------------------------\n");

  // 1. Initial Qdrant Point Count Guard
  const pointCountBefore = await getQdrantPointCount();
  console.log(`[QDRANT POINT COUNT BEFORE]: ${pointCountBefore} points`);

  // 2. Load DEV Questions (First 20 answerable questions)
  const questionsPath = path.resolve(__dirname, "../../eval/questions.jsonl");
  const rawLines = fs.readFileSync(questionsPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
  const devQuestions = rawLines.slice(0, 20).map((l) => JSON.parse(l));

  console.log(`Loaded ${devQuestions.length} DEV split evaluation questions from ${questionsPath}\n`);

  const cosineSimilarities = [];
  let top1Matches = 0;
  let totalTop5Intersection = 0;
  let totalTop10Intersection = 0;

  let teiRecall5Hits = 0;
  let onnxRecall5Hits = 0;
  let teiRecall10Hits = 0;
  let onnxRecall10Hits = 0;

  let teiReciprocalRankSum = 0;
  let onnxReciprocalRankSum = 0;

  const disagreements = [];

  for (let i = 0; i < devQuestions.length; i++) {
    const item = devQuestions[i];
    const q = item.question;
    const expected = item.expectedPaths || [];

    // A. Embed with TEI and ONNX
    const vecTEI = await getTeiEmbedding(q);
    const vecONNX = await getLocalEmbedding(q);

    const cosSim = cosineSimilarity(vecTEI, vecONNX);
    cosineSimilarities.push(cosSim);

    // B. Search Qdrant with TEI and ONNX vectors (Read-only searches)
    const resultsTEI = await searchChunks(USER_SESSION, REPO_ID, COLLECTION_NAME, vecTEI, 10);
    const resultsONNX = await searchChunks(USER_SESSION, REPO_ID, COLLECTION_NAME, vecONNX, 10);

    // C. Measure Overlaps
    const top1TEI = resultsTEI[0]?.id || resultsTEI[0]?.payload?.chunkId;
    const top1ONNX = resultsONNX[0]?.id || resultsONNX[0]?.payload?.chunkId;
    const isTop1Match = top1TEI === top1ONNX;
    if (isTop1Match) top1Matches++;

    const idsTEI5 = new Set(resultsTEI.slice(0, 5).map((r) => r.id || r.payload?.chunkId));
    const idsONNX5 = new Set(resultsONNX.slice(0, 5).map((r) => r.id || r.payload?.chunkId));
    const top5Intersection = [...idsTEI5].filter((id) => idsONNX5.has(id)).length;
    totalTop5Intersection += top5Intersection;

    const idsTEI10 = new Set(resultsTEI.map((r) => r.id || r.payload?.chunkId));
    const idsONNX10 = new Set(resultsONNX.map((r) => r.id || r.payload?.chunkId));
    const top10Intersection = [...idsTEI10].filter((id) => idsONNX10.has(id)).length;
    totalTop10Intersection += top10Intersection;

    // D. Measure Quality Metrics
    const teiEval5 = checkRecall(resultsTEI, expected, 5);
    const onnxEval5 = checkRecall(resultsONNX, expected, 5);
    const teiEval10 = checkRecall(resultsTEI, expected, 10);
    const onnxEval10 = checkRecall(resultsONNX, expected, 10);

    if (teiEval5.hit) teiRecall5Hits++;
    if (onnxEval5.hit) onnxRecall5Hits++;
    if (teiEval10.hit) teiRecall10Hits++;
    if (onnxEval10.hit) onnxRecall10Hits++;

    if (teiEval10.hit && teiEval10.rank <= 10) teiReciprocalRankSum += 1 / teiEval10.rank;
    if (onnxEval10.hit && onnxEval10.rank <= 10) onnxReciprocalRankSum += 1 / onnxEval10.rank;

    // E. Track Disagreements
    const teiTopFile = resultsTEI[0]?.payload?.filePath || resultsTEI[0]?.payload?.path || "N/A";
    const onnxTopFile = resultsONNX[0]?.payload?.filePath || resultsONNX[0]?.payload?.path || "N/A";

    if (!isTop1Match || teiEval5.hit !== onnxEval5.hit) {
      disagreements.push({
        qIndex: i + 1,
        question: q,
        expected,
        cosineSim: cosSim,
        teiTop1: { file: teiTopFile, score: resultsTEI[0]?.score },
        onnxTop1: { file: onnxTopFile, score: resultsONNX[0]?.score },
        teiHit5: teiEval5.hit,
        onnxHit5: onnxEval5.hit,
        note: !isTop1Match ? "Different Top-1 chunk" : (teiEval5.hit && !onnxEval5.hit ? "ONNX lost Top-5 hit" : "ONNX gained Top-5 hit"),
      });
    }
  }

  // 3. Final Qdrant Point Count Guard
  const pointCountAfter = await getQdrantPointCount();
  console.log(`[QDRANT POINT COUNT AFTER]:  ${pointCountAfter} points`);
  const pointCountMatches = pointCountBefore === pointCountAfter;
  console.log(`[ZERO WRITE INTEGRITY]:      ${pointCountMatches ? "PASS (Exact match, zero writes/deletes)" : "FAIL (Point count modified!)"}\n`);

  // 4. Calculate Aggregate Statistics
  const totalQ = devQuestions.length;
  const meanCosSim = cosineSimilarities.reduce((a, b) => a + b, 0) / totalQ;
  const medianCosSim = calculateMedian(cosineSimilarities);
  const minCosSim = Math.min(...cosineSimilarities);
  const maxCosSim = Math.max(...cosineSimilarities);

  const top1OverlapPct = (top1Matches / totalQ) * 100;
  const top5OverlapPct = (totalTop5Intersection / (totalQ * 5)) * 100;
  const top10OverlapPct = (totalTop10Intersection / (totalQ * 10)) * 100;

  const teiRecall5 = (teiRecall5Hits / totalQ) * 100;
  const onnxRecall5 = (onnxRecall5Hits / totalQ) * 100;
  const teiRecall10 = (teiRecall10Hits / totalQ) * 100;
  const onnxRecall10 = (onnxRecall10Hits / totalQ) * 100;

  const teiMRR = teiReciprocalRankSum / totalQ;
  const onnxMRR = onnxReciprocalRankSum / totalQ;

  console.log("--------------------------------------------------------------------------------");
  console.log("                        EVALUATION RESULTS COMPARISON                           ");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Questions Evaluated:               ${totalQ} (DEV Split)`);
  console.log("");
  console.log("A. QUERY VECTOR SIMILARITY (TEI vs ONNX):");
  console.log(`   - Mean Cosine Similarity:       ${meanCosSim.toFixed(6)}`);
  console.log(`   - Median Cosine Similarity:     ${medianCosSim.toFixed(6)}`);
  console.log(`   - Min Cosine Similarity:        ${minCosSim.toFixed(6)}`);
  console.log(`   - Max Cosine Similarity:        ${maxCosSim.toFixed(6)}`);
  console.log("");
  console.log("B. RETRIEVAL OVERLAP:");
  console.log(`   - Top-1 Candidate Overlap:      ${top1Matches}/${totalQ} (${top1OverlapPct.toFixed(1)}%)`);
  console.log(`   - Top-5 Mean Overlap:           ${top5OverlapPct.toFixed(1)}%`);
  console.log(`   - Top-10 Mean Overlap:          ${top10OverlapPct.toFixed(1)}%`);
  console.log("");
  console.log("C. RETRIEVAL QUALITY BENCHMARK:");
  console.log(`   - Recall@5:   TEI = ${teiRecall5.toFixed(1)}% (${teiRecall5Hits}/${totalQ})  |  ONNX = ${onnxRecall5.toFixed(1)}% (${onnxRecall5Hits}/${totalQ})`);
  console.log(`   - Recall@10:  TEI = ${teiRecall10.toFixed(1)}% (${teiRecall10Hits}/${totalQ})  |  ONNX = ${onnxRecall10.toFixed(1)}% (${onnxRecall10Hits}/${totalQ})`);
  console.log(`   - MRR:        TEI = ${teiMRR.toFixed(4)}          |  ONNX = ${onnxMRR.toFixed(4)}`);
  console.log("--------------------------------------------------------------------------------\n");

  console.log(`D. DISAGREEMENTS / DIVERGENCE ANALYSIS (${disagreements.length} instances):`);
  if (disagreements.length === 0) {
    console.log("   Zero disagreements. Both models produced identical retrieval ranks.");
  } else {
    disagreements.forEach((d) => {
      console.log(`   [Q${d.qIndex}] "${d.question.slice(0, 60)}..."`);
      console.log(`       CosSim: ${d.cosineSim.toFixed(4)} | Note: ${d.note}`);
      console.log(`       TEI Top-1:  ${d.teiTop1.file} (score: ${d.teiTop1.score?.toFixed(4)}) | Hit@5: ${d.teiHit5}`);
      console.log(`       ONNX Top-1: ${d.onnxTop1.file} (score: ${d.onnxTop1.score?.toFixed(4)}) | Hit@5: ${d.onnxHit5}`);
    });
  }
  console.log("\n--------------------------------------------------------------------------------");

  // Determine Recommendation
  let recommendation = "NOT COMPATIBLE";
  let isPass = false;

  if (pointCountMatches && meanCosSim >= 0.99 && Math.abs(onnxRecall10 - teiRecall10) <= 5.0) {
    recommendation = "COMPATIBLE";
    isPass = true;
  } else if (pointCountMatches && meanCosSim >= 0.95 && onnxRecall10 >= 65.0) {
    recommendation = "COMPATIBLE WITH QUALITY REGRESSION";
    isPass = true;
  } else {
    recommendation = "NOT COMPATIBLE";
    isPass = false;
  }

  console.log(`RECOMMENDATION: ${recommendation}`);
  console.log(`B2.3 GATE: ${isPass ? "PASS" : "FAIL"}`);
  console.log("================================================================================");

  return {
    pass: isPass,
    recommendation,
    questionsCount: totalQ,
    meanCosSim,
    medianCosSim,
    minCosSim,
    maxCosSim,
    top1OverlapPct,
    top5OverlapPct,
    top10OverlapPct,
    teiRecall5,
    onnxRecall5,
    teiRecall10,
    onnxRecall10,
    teiMRR,
    onnxMRR,
    pointCountBefore,
    pointCountAfter,
    disagreements,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runEmbeddingComparison()
    .then((res) => {
      process.exit(res.pass ? 0 : 1);
    })
    .catch((err) => {
      console.error("Comparison execution failed:", err);
      process.exit(1);
    });
}
