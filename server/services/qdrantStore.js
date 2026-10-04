import axios from "axios";
import http from "http";
import { validateTenantContext } from "./tenantGuard.js";
import { logInfo, logError } from "../utils/logger.js";
import { withRetry } from "../utils/retryHelper.js";

/**
 * Gets the configured Qdrant URL from environment variables.
 * Defaults to 127.0.0.1:6333 to prevent IPv6/IPv4 localhost resolution issues.
 * @returns {string} Qdrant base URL.
 */
export function getQdrantUrl() {
  const url = process.env.QDRANT_URL || "http://127.0.0.1:6333";
  return url.replace("localhost", "127.0.0.1");
}

/**
 * Gets common HTTP headers for Qdrant API calls.
 * @returns {Object} Headers object.
 */
function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (serviceToken) {
    headers["Authorization"] = `Bearer ${serviceToken}`;
  }
  return headers;
}

/**
 * Builds standard Qdrant tenant filter forcing companyId and repositoryId match.
 * @param {string} companyId Authenticated company ID.
 * @param {string} repositoryId Validated repository ID.
 * @returns {Object} Qdrant filter object.
 */
export function buildTenantFilter(companyId, repositoryId) {
  return {
    must: [
      { key: "companyId", match: { value: companyId } },
      { key: "repositoryId", match: { value: repositoryId } },
    ],
  };
}

function createFreshClient() {
  if (typeof axios.create === "function") {
    const instance = axios.create({
      httpAgent: new http.Agent({ keepAlive: false }),
      headers: getHeaders(),
      timeout: 30000,
    });
    if (instance && typeof instance.put === "function") {
      return instance;
    }
  }
  return axios;
}

/**
 * Upserts repository code chunks into Qdrant collection under tenant isolation.
 *
 * @param {Object} authContext Authenticated session context.
 * @param {string} repositoryId Repository ID.
 * @param {string} collectionName Qdrant collection name.
 * @param {Array<Object>} points Points to insert/upsert.
 * @returns {Promise<Object>} Qdrant API response.
 * @throws {TenantValidationError} If tenancy parameters are missing before network I/O.
 */
export async function upsertChunks(authContext, repositoryId, collectionName, points) {
  const { companyId } = validateTenantContext(authContext, repositoryId);

  if (!Array.isArray(points) || points.length === 0) {
    return { status: "ok", updated: 0 };
  }

  // Ensure every point strictly carries tenant payload
  const tenantPoints = points.map((pt) => ({
    id: pt.id || pt.chunkId,
    vector: pt.vector,
    payload: {
      ...pt.payload,
      companyId,
      repositoryId,
      chunkId: pt.payload?.chunkId || pt.chunkId || pt.id,
      path: pt.payload?.path || pt.payload?.filePath || "",
      filePath: pt.payload?.filePath || pt.payload?.path || "",
      startLine: pt.payload?.startLine ?? 1,
      endLine: pt.payload?.endLine ?? 1,
      commitSha: pt.payload?.commitSha || "",
      url: pt.payload?.url || "",
      text: pt.payload?.text || pt.payload?.content || "",
      content: pt.payload?.content || pt.payload?.text || "",
    },
  }));

  const startTime = Date.now();
  const BATCH_SIZE = 100;
  let lastResult = null;

  try {
    const url = `${getQdrantUrl()}/collections/${collectionName}/points`;
    for (let i = 0; i < tenantPoints.length; i += BATCH_SIZE) {
      const batch = tenantPoints.slice(i, i + BATCH_SIZE);
      const response = await withRetry(async () => {
        const client = createFreshClient();
        return await client.put(url, { points: batch });
      });
      lastResult = response.data;
    }

    logInfo("Qdrant upsert succeeded", {
      companyId,
      repositoryId,
      collectionName,
      pointCount: tenantPoints.length,
      durationMs: Date.now() - startTime,
    });

    return lastResult || { status: "ok", updated: tenantPoints.length };
  } catch (error) {
    logError("Qdrant upsert failed", {
      companyId,
      repositoryId,
      collectionName,
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
 * Searches Qdrant for matching code chunks strictly filtered by tenant companyId and repositoryId.
 *
 * @param {Object} authContext Authenticated session context.
 * @param {string} repositoryId Repository ID.
 * @param {string} collectionName Qdrant collection name.
 * @param {Array<number>} queryVector Dense query vector.
 * @param {number} [topK=5] Number of matches to retrieve.
 * @param {Object} [extraFilter] Additional filter conditions.
 * @returns {Promise<Array<Object>>} Retrieved points matching tenant filter.
 * @throws {TenantValidationError} If tenancy parameters are missing before network I/O.
 */
export async function searchChunks(authContext, repositoryId, collectionName, queryVector, topK = 5, extraFilter = null) {
  const { companyId } = validateTenantContext(authContext, repositoryId);

  const filter = buildTenantFilter(companyId, repositoryId);
  if (extraFilter && Array.isArray(extraFilter.must)) {
    filter.must.push(...extraFilter.must);
  }
  if (extraFilter && Array.isArray(extraFilter.should)) {
    filter.should = extraFilter.should;
  }

  const startTime = Date.now();

  try {
    const url = `${getQdrantUrl()}/collections/${collectionName}/points/search`;
    const response = await axios.post(
      url,
      {
        vector: queryVector,
        filter,
        limit: topK,
        with_payload: true,
      },
      { headers: getHeaders(), timeout: 10000 }
    );

    const results = response.data?.result || [];
    const textAvailableCount = results.filter((r) =>
      Boolean(r.payload?.text || r.payload?.content || r.text || r.content)
    ).length;

    logInfo("[QDRANT] search results with text availability", {
      companyId,
      repositoryId,
      collectionName,
      resultCount: results.length,
      textAvailableCount,
      durationMs: Date.now() - startTime,
    });

    return results;
  } catch (error) {
    logError("Qdrant search failed", {
      companyId,
      repositoryId,
      collectionName,
      errorMessage: error.message,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Fetches neighbouring chunks for given file paths in the repository.
 *
 * @param {Object} authContext Authenticated session context.
 * @param {string} repositoryId Repository ID.
 * @param {string} collectionName Collection name.
 * @param {Array<string>} filePaths File paths to fetch chunks for.
 * @returns {Promise<Array<Object>>} Retrieved chunks for the files.
 */
export async function fetchNeighbouringChunks(authContext, repositoryId, collectionName, filePaths = []) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) return [];
  const { companyId } = validateTenantContext(authContext, repositoryId);

  const cleanPaths = Array.from(new Set(filePaths.filter(Boolean)));
  if (cleanPaths.length === 0) return [];

  try {
    const filter = {
      must: [
        { key: "companyId", match: { value: companyId } },
        { key: "repositoryId", match: { value: repositoryId } },
      ],
      should: [
        ...cleanPaths.map((p) => ({ key: "filePath", match: { value: p } })),
        ...cleanPaths.map((p) => ({ key: "path", match: { value: p } })),
      ],
    };

    const url = `${getQdrantUrl()}/collections/${collectionName}/points/scroll`;
    const response = await axios.post(
      url,
      {
        filter,
        limit: 50,
        with_payload: true,
      },
      { headers: getHeaders(), timeout: 10000 }
    );

    return response.data?.result?.points || [];
  } catch (err) {
    logInfo("Neighbouring chunks fetch skipped", { errorMessage: err.message });
    return [];
  }
}

/**
 * Deletes repository points from Qdrant strictly scoped to tenant.
 *
 * @param {Object} authContext Authenticated session context.
 * @param {string} repositoryId Repository ID.
 * @param {string} collectionName Qdrant collection name.
 * @returns {Promise<Object>} Qdrant deletion response.
 * @throws {TenantValidationError} If tenancy parameters are missing before network I/O.
 */
export async function deleteRepositoryChunks(authContext, repositoryId, collectionName) {
  const { companyId } = validateTenantContext(authContext, repositoryId);

  const filter = buildTenantFilter(companyId, repositoryId);
  const startTime = Date.now();

  try {
    const url = `${getQdrantUrl()}/collections/${collectionName}/points/delete`;
    const response = await axios.post(
      url,
      { filter },
      { headers: getHeaders(), timeout: 10000 }
    );

    logInfo("Qdrant delete repository chunks completed", {
      companyId,
      repositoryId,
      collectionName,
      durationMs: Date.now() - startTime,
    });

    return response.data;
  } catch (error) {
    logError("Qdrant delete repository chunks failed", {
      companyId,
      repositoryId,
      collectionName,
      errorMessage: error.message,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Deletes vectors for specific file paths in a repository, strictly scoped to tenant.
 *
 * @param {Object} authContext Authenticated session context.
 * @param {string} repositoryId Repository ID.
 * @param {string} collectionName Qdrant collection name.
 * @param {Array<string>} filePaths Array of file paths to remove.
 * @returns {Promise<Object>} Qdrant deletion response.
 */
export async function deleteFileChunks(authContext, repositoryId, collectionName, filePaths = []) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) return { status: "ok" };
  const { companyId } = validateTenantContext(authContext, repositoryId);
  const cleanPaths = Array.from(new Set(filePaths.filter(Boolean)));
  if (cleanPaths.length === 0) return { status: "ok" };

  const startTime = Date.now();
  try {
    const filter = {
      must: [
        { key: "companyId", match: { value: companyId } },
        { key: "repositoryId", match: { value: repositoryId } },
      ],
      should: [
        ...cleanPaths.map((p) => ({ key: "filePath", match: { value: p } })),
        ...cleanPaths.map((p) => ({ key: "path", match: { value: p } })),
      ],
    };

    const url = `${getQdrantUrl()}/collections/${collectionName}/points/delete`;
    const response = await axios.post(
      url,
      { filter },
      { headers: getHeaders(), timeout: 10000 }
    );

    logInfo("Qdrant delete file chunks completed", {
      companyId,
      repositoryId,
      fileCount: cleanPaths.length,
      durationMs: Date.now() - startTime,
    });

    return response.data;
  } catch (error) {
    logError("Qdrant delete file chunks failed", {
      companyId,
      repositoryId,
      fileCount: cleanPaths.length,
      errorMessage: error.message,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Deletes all Qdrant vectors belonging to an entire company.
 *
 * @param {string} companyId Company identifier.
 * @param {string} [collectionName="repository_chunks"] Qdrant collection name.
 * @returns {Promise<Object>} Deletion result.
 */
export async function deleteCompanyChunks(companyId, collectionName = "repository_chunks") {
  if (!companyId) return { status: "ok" };
  const filter = {
    must: [{ key: "companyId", match: { value: String(companyId) } }],
  };

  const startTime = Date.now();
  try {
    const url = `${getQdrantUrl()}/collections/${collectionName}/points/delete`;
    const response = await axios.post(
      url,
      { filter },
      { headers: getHeaders(), timeout: 10000 }
    );

    logInfo("Qdrant delete company chunks completed", {
      companyId: String(companyId),
      collectionName,
      durationMs: Date.now() - startTime,
    });

    return response.data;
  } catch (error) {
    logError("Qdrant delete company chunks failed", {
      companyId: String(companyId),
      collectionName,
      errorMessage: error.message,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Counts Qdrant points matching company and optional repository filter.
 *
 * @param {string} companyId Company identifier.
 * @param {string} [repositoryId] Optional repository identifier.
 * @param {string} [collectionName="repository_chunks"] Qdrant collection name.
 * @returns {Promise<number>} Number of matching points.
 */
export async function countPoints(companyId, repositoryId = null, collectionName = "repository_chunks") {
  if (!companyId) return 0;
  const filter = {
    must: [{ key: "companyId", match: { value: String(companyId) } }],
  };
  if (repositoryId) {
    filter.must.push({ key: "repositoryId", match: { value: String(repositoryId) } });
  }

  try {
    const url = `${getQdrantUrl()}/collections/${collectionName}/points/count`;
    const response = await axios.post(
      url,
      { filter, exact: true },
      { headers: getHeaders(), timeout: 5000 }
    );
    return response.data?.result?.count ?? 0;
  } catch (err) {
    logError("Qdrant count points failed", {
      companyId: String(companyId),
      repositoryId: repositoryId ? String(repositoryId) : undefined,
      errorMessage: err.message,
    });
    return 0;
  }
}

