import path from "path";
import { fileURLToPath } from "url";
import {
  getLocalEmbedding,
  getLocalEmbeddingPipeline,
  LOCAL_EMBEDDING_MODEL,
  LOCAL_EMBEDDING_DIM,
} from "../services/localEmbeddingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
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

export async function runLocalEmbeddingsVerification() {
  console.log("================================================================================");
  console.log("             WHYCODE EXPERIMENTAL IN-PROCESS ONNX EMBEDDING AUDIT              ");
  console.log("================================================================================");
  console.log(`Target Model:      ${LOCAL_EMBEDDING_MODEL}`);
  console.log(`Expected Dim:      ${LOCAL_EMBEDDING_DIM}`);
  console.log(`Execution Engine:  @huggingface/transformers (ONNX CPU Runtime)`);
  console.log("--------------------------------------------------------------------------------\n");

  const startTime = Date.now();

  // 1. Model Loading / Initialization
  console.log("[STEP 1] Loading model pipeline into memory...");
  const initStart = Date.now();
  await getLocalEmbeddingPipeline();
  const initDuration = Date.now() - initStart;
  console.log(`[PASS] Model initialized in ${initDuration}ms (cached in memory)\n`);

  // 2. Embed Known Test Sentence
  const testSentence = "WhyCode reconstructs engineering intent from Git commits and AST structure.";
  console.log(`[STEP 2] Embedding test sentence: "${testSentence}"`);
  
  const embedStart = Date.now();
  const vector1 = await getLocalEmbedding(testSentence);
  const embedDuration = Date.now() - embedStart;

  console.log(`Model Name:        ${LOCAL_EMBEDDING_MODEL}`);
  console.log(`Vector Dimension:  ${vector1.length}`);
  
  const preview = vector1.slice(0, 5).map((n) => n.toFixed(6)).join(", ");
  console.log(`Vector Preview:    [${preview}, ...]`);

  if (!Array.isArray(vector1) || vector1.length !== LOCAL_EMBEDDING_DIM) {
    console.error(`\n[FAIL] Invalid dimension: expected ${LOCAL_EMBEDDING_DIM}, got ${vector1?.length}`);
    return { pass: false, reason: "Dimension mismatch" };
  }
  console.log(`[PASS] Dimension verified strictly === ${LOCAL_EMBEDDING_DIM} in ${embedDuration}ms\n`);

  // 3. Consistency Check (Run second inference on identical input)
  console.log("[STEP 3] Testing consistency on identical input (Run #2)...");
  const vector2 = await getLocalEmbedding(testSentence);
  const similarity = cosineSimilarity(vector1, vector2);
  const maxDiff = Math.max(...vector1.map((v, i) => Math.abs(v - vector2[i])));

  console.log(`Cosine Similarity: ${similarity.toFixed(8)}`);
  console.log(`Max Abs Difference: ${maxDiff.toExponential(4)}`);

  if (similarity < 0.999999 || maxDiff > 1e-5) {
    console.error(`\n[FAIL] Consistency check failed: similarity=${similarity}, maxDiff=${maxDiff}`);
    return { pass: false, reason: "Inconsistent outputs on identical input" };
  }
  console.log("[PASS] Output is 100% deterministic and consistent\n");

  // 4. Safe Empty/Invalid Input Handling
  console.log("[STEP 4] Testing safe empty input handling...");
  let emptyHandled = false;
  try {
    await getLocalEmbedding("");
  } catch (err) {
    emptyHandled = true;
    console.log(`[PASS] Empty input safely rejected with: "${err.message}"`);
  }

  if (!emptyHandled) {
    console.error("\n[FAIL] Empty input did not throw validation error.");
    return { pass: false, reason: "Empty input not rejected" };
  }

  const totalDuration = Date.now() - startTime;
  console.log("\n--------------------------------------------------------------------------------");
  console.log(`TOTAL EXECUTION TIME: ${totalDuration}ms`);
  console.log("B2.2 GATE: PASS");
  console.log("================================================================================");

  return {
    pass: true,
    modelName: LOCAL_EMBEDDING_MODEL,
    dimension: vector1.length,
    similarity,
    maxDiff,
    initDuration,
    embedDuration,
    totalDuration,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runLocalEmbeddingsVerification()
    .then((res) => {
      process.exit(res.pass ? 0 : 1);
    })
    .catch((err) => {
      console.error("Local embedding verification failed:", err);
      process.exit(1);
    });
}
