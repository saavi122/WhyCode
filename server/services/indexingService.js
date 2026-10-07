import { chunkCode, chunkMarkdown, buildPointId, formatEmbeddingText } from "./chunker.js";
import { getEmbedding } from "./teiService.js";
import { upsertChunks } from "./qdrantStore.js";
import { scrubSecrets } from "../utils/scrubber.js";
import { logInfo, logError } from "../utils/logger.js";

const COLLECTION_NAME = "repository_chunks";

/**
 * Indexes a single repository file into Qdrant after chunking and embedding generation.
 *
 * @param {Object} authContext Authenticated session context (req.user or session).
 * @param {string} repositoryId Target repository ID.
 * @param {Object} file File object with path and content properties.
 * @param {string} file.path Relative file path.
 * @param {string} file.content Raw file text.
 * @param {string} [commitSha=""] Target commit SHA hash.
 * @param {string} [url=""] Target source file URL.
 * @param {Object} [extraMetadata={}] Additional file metadata (author, timestamp, githubRepositoryId).
 * @returns {Promise<{ indexed: number, path: string }>} Indexing summary result.
 */
export async function indexFile(
  authContext,
  repositoryId,
  file,
  commitSha = "",
  url = "",
  extraMetadata = {}
) {
  const isDoc =
    file.path.endsWith(".md") ||
    file.path.endsWith(".rst") ||
    file.path.startsWith("docs/");

  const { text: cleanContent } = scrubSecrets(file.content || "");
  const chunks = isDoc
    ? chunkMarkdown(cleanContent, file.path)
    : chunkCode(cleanContent, file.path);

  if (chunks.length === 0) {
    return {
      indexed: 0,
      path: file.path,
    };
  }

  const points = [];
  const companyId =
    authContext?.user?.company ||
    authContext?.user?.companyId ||
    authContext?.companyId ||
    authContext?.company ||
    "";

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const embeddingInput = formatEmbeddingText(chunk);
    const vector = await getEmbedding(embeddingInput);
    const docType = isDoc ? "DOCUMENTATION" : "CODE";
    const pointId = buildPointId({
      companyId,
      repositoryId,
      documentType: docType,
      pathOrSha: file.path,
      chunkIndex: idx,
    });

    const chunkId = chunk.chunkId || `${file.path}:${points.length}`;
    const startLine = chunk.startLine || 1;
    const endLine = chunk.endLine || 1;
    const chunkUrl = url || (commitSha
      ? `https://github.com/${extraMetadata.fullName || "repo"}/blob/${commitSha}/${file.path}#L${startLine}-L${endLine}`
      : `https://github.com/${file.path}`);

    points.push({
      id: pointId,
      chunkId,
      vector,
      payload: {
        companyId: String(companyId),
        repositoryId: String(repositoryId),
        githubRepositoryId: Number(extraMetadata.githubRepositoryId) || 0,
        documentType: isDoc ? "DOCUMENTATION" : "CODE",
        filePath: chunk.path || file.path,
        path: chunk.path || file.path,
        startLine,
        endLine,
        commitSha: commitSha || "",
        url: chunkUrl,
        author: extraMetadata.author || "unknown",
        timestamp: extraMetadata.timestamp || new Date().toISOString(),
        contentHash: chunk.contentHash || "",
        embedModel: "BAAI/bge-small-en-v1.5",
        embedVersion: "1.0",
        text: chunk.text,
        content: chunk.text,
      },
    });

    logInfo("[INDEX] chunk stored with text", {
      path: chunk.path || file.path,
      chunkId,
      hasText: Boolean(chunk.text),
      textSize: chunk.text ? chunk.text.length : 0,
    });
  }

  logInfo("[SCAN] embeddings generated", { path: file.path, count: points.length });

  await upsertChunks(
    authContext,
    repositoryId,
    COLLECTION_NAME,
    points
  );

  logInfo("[SCAN] Qdrant upsert completed", { path: file.path, pointCount: points.length });

  return {
    indexed: points.length,
    path: file.path,
  };
}
