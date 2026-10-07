import path from "path";
import { fileURLToPath } from "url";
import { pipeline, env } from "@huggingface/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure model cache path inside server/.cache/transformers
env.cacheDir = path.resolve(__dirname, "../.cache/transformers");

export const LOCAL_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";
export const LOCAL_EMBEDDING_DIM = 384;

let pipelinePromise = null;

/**
 * Initializes and caches the feature-extraction pipeline in memory.
 * Singleton pattern ensures model weights are loaded only once.
 *
 * @returns {Promise<Function>} Loaded transformer pipeline instance.
 */
export async function getLocalEmbeddingPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const extractor = await pipeline("feature-extraction", LOCAL_EMBEDDING_MODEL, {
        dtype: "fp32",
        device: "cpu",
      });
      return extractor;
    })();
  }
  return pipelinePromise;
}

/**
 * Generates dense vector embedding for input text using in-process ONNX BGE-small model.
 * Applies mean pooling and L2 normalization (standard for BGE embeddings).
 *
 * @param {string} text Input text to embed.
 * @returns {Promise<Array<number>>} 384-dimensional dense embedding array.
 */
export async function getLocalEmbedding(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Invalid text input for local embedding generation.");
  }

  const cleanText = text.slice(0, 2000);
  const extractor = await getLocalEmbeddingPipeline();

  const output = await extractor(cleanText, {
    pooling: "cls",
    normalize: true,
  });

  // Extract flat array of numbers from tensor data
  const vector = Array.from(output.data);

  if (!Array.isArray(vector) || vector.length !== LOCAL_EMBEDDING_DIM) {
    throw new Error(`Invalid local embedding vector dimension: expected ${LOCAL_EMBEDDING_DIM}, got ${vector?.length}`);
  }

  return vector;
}

/**
 * Generates dense vector embeddings for a batch of input texts.
 *
 * @param {Array<string>} texts Array of input texts.
 * @returns {Promise<Array<Array<number>>>} Array of 384-dimensional dense vectors.
 */
export async function getLocalEmbeddingsBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const extractor = await getLocalEmbeddingPipeline();
  const cleanTexts = texts.map((t) => (typeof t === "string" ? t.slice(0, 2000) : ""));

  const outputs = await extractor(cleanTexts, {
    pooling: "cls",
    normalize: true,
  });

  // Convert tensor outputs to nested array of numbers
  const results = [];
  const total = cleanTexts.length;
  for (let i = 0; i < total; i++) {
    const slice = Array.from(outputs[i].data);
    results.push(slice);
  }

  return results;
}
