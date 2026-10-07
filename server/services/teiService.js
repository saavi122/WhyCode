import axios from "axios";
import http from "http";
import { servicesConfig } from "../config/services.js";
import { logInfo, logError } from "../utils/logger.js";
import { withRetry } from "../utils/retryHelper.js";

/**
 * Gets Hugging Face TEI Embeddings service URL.
 * @returns {string} TEI Embeddings URL.
 */
export function getTeiEmbeddingsUrl() {
  return servicesConfig.teiEmbeddingsUrl;
}

/**
 * Gets Hugging Face TEI Rerank service URL.
 * @returns {string} TEI Rerank URL.
 */
export function getTeiRerankUrl() {
  return servicesConfig.teiRerankUrl;
}

/**
 * Gets common authorization headers for TEI service.
 * @returns {Object} HTTP headers.
 */
function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = servicesConfig.internalServiceToken;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Creates a fresh Axios instance without keep-alive socket reuse for retries.
 */
function createFreshClient() {
  if (typeof axios.create === "function") {
    const instance = axios.create({
      httpAgent: new http.Agent({ keepAlive: false }),
      headers: getHeaders(),
      timeout: 30000,
    });
    if (instance && typeof instance.post === "function") {
      return instance;
    }
  }
  return axios;
}

/**
 * Generates vector embeddings for a given input text using Hugging Face TEI.
 * Truncates text to 2000 characters to stay within model token limits.
 *
 * @param {string} text Input text to embed.
 * @returns {Promise<Array<number>>} Dense vector embedding array.
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid text input for TEI embedding generation.");
  }

  const cleanText = text.slice(0, 2000);
  const startTime = Date.now();
  const url = `${getTeiEmbeddingsUrl()}/embed`;

  try {
    const response = await withRetry(async () => {
      const client = createFreshClient();
      return await client.post(url, { inputs: cleanText });
    });

    const embedding = Array.isArray(response.data[0]) ? response.data[0] : response.data;

    logInfo("TEI embedding generated", {
      textSize: cleanText.length,
      vectorDim: embedding.length,
      durationMs: Date.now() - startTime,
    });

    return embedding;
  } catch (error) {
    logError("TEI embedding request failed", {
      textLength: cleanText.length,
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorCause: error.cause?.code,
      stack: error.stack,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Generates vector embeddings for a batch of input texts using Hugging Face TEI.
 * Enforces maximum 32 texts per HTTP call and truncates each text to 2000 chars.
 *
 * @param {Array<string>} texts Input texts to embed.
 * @param {number} [batchSize=32] Max items per HTTP call.
 * @returns {Promise<Array<Array<number>>>} Array of dense vector embedding arrays.
 */
export async function getEmbeddingsBatch(texts, batchSize = 32) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const cappedBatchSize = Math.min(batchSize, 32);
  const results = [];
  const url = `${getTeiEmbeddingsUrl()}/embed`;

  for (let i = 0; i < texts.length; i += cappedBatchSize) {
    const batch = texts.slice(i, i + cappedBatchSize).map((t) => (typeof t === "string" ? t.slice(0, 2000) : ""));
    const startTime = Date.now();
    try {
      const response = await withRetry(async () => {
        const client = createFreshClient();
        return await client.post(url, { inputs: batch });
      });

      const embeddings = response.data;
      if (Array.isArray(embeddings)) {
        results.push(...embeddings);
      } else {
        results.push(embeddings);
      }

      logInfo("TEI batch embedding generated", {
        count: batch.length,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      logError("TEI batch embedding failed", {
        count: batch.length,
        errorMessage: error.message,
        errorName: error.name,
        errorCode: error.code,
        errorCause: error.cause?.code,
        stack: error.stack,
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  return results;
}

/**
 * Reranks retrieved code chunk candidates against a search query using Hugging Face TEI Reranker.
 */
export async function rerank(query, chunks) {
  if (!query || typeof query !== "string") {
    throw new Error("Invalid query input for TEI reranking.");
  }

  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  // Cap chunks to max 30 to prevent TEI HTTP 422 payload limit
  const cappedChunks = chunks.slice(0, 30);
  const startTime = Date.now();
  const url = `${getTeiRerankUrl()}/rerank`;
  const texts = cappedChunks.map((c) => (c.payload?.text || c.text || c.payload?.content || c.content || "").slice(0, 2000));

  try {
    const response = await withRetry(async () => {
      const client = createFreshClient();
      return await client.post(url, { query, texts });
    });

    const rerankResults = response.data || [];
    const scoredChunks = rerankResults.map((item) => ({
      ...cappedChunks[item.index],
      score: item.score,
    }));

    scoredChunks.sort((a, b) => b.score - a.score);

    logInfo("[RERANK] candidate count + top score", {
      query,
      candidateCount: chunks.length,
      topScore: scoredChunks[0]?.score || 0,
      durationMs: Date.now() - startTime,
    });

    return scoredChunks;
  } catch (error) {
    logError("TEI reranking unavailable - falling back to vector score ordering", {
      query,
      candidateCount: chunks.length,
      errorMessage: error.message,
      errorCode: error.code || error.cause?.code,
      durationMs: Date.now() - startTime,
    });
    return chunks;
  }
}
