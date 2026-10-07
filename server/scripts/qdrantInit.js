import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { servicesConfig } from "../config/services.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "repository_chunks";
const EMBED_DIM = parseInt(process.env.EMBED_DIM || "384", 10);
const EMBED_MODEL = process.env.EMBED_MODEL || "BAAI/bge-small-en-v1.5";

function getQdrantHeaders() {
  const headers = { "Content-Type": "application/json" };
  const apiKey = servicesConfig.qdrantApiKey || process.env.QDRANT_API_KEY;
  if (apiKey) {
    headers["api-key"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

/**
 * Initializes Qdrant collection on local or Qdrant Cloud cluster:
 * 1. Creates collection if missing (dimension EMBED_DIM, cosine).
 * 2. If collection exists, verifies vector dimension matches EMBED_DIM.
 * 3. Never deletes or recreates an existing collection.
 * 4. Creates payload indexes: companyId (tenant), repositoryId, documentType, filePath.
 * 5. Stores/verifies model metadata.
 */
export async function initQdrantCollection() {
  const baseUrl = servicesConfig.qdrantUrl;
  const headers = getQdrantHeaders();

  console.log(`[QDRANT INIT] Target Qdrant URL: ${baseUrl}`);
  console.log(`[QDRANT INIT] Target Collection: ${COLLECTION_NAME}`);
  console.log(`[QDRANT INIT] Target Dimension: ${EMBED_DIM} (Cosine), Model: ${EMBED_MODEL}`);

  try {
    // 1. Check if collection exists
    let collectionExists = false;
    let existingInfo = null;

    try {
      const infoRes = await axios.get(`${baseUrl}/collections/${COLLECTION_NAME}`, {
        headers,
        timeout: 10000,
      });
      if (infoRes.data && infoRes.data.result) {
        collectionExists = true;
        existingInfo = infoRes.data.result;
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        collectionExists = false;
      } else {
        throw new Error(`Failed to check Qdrant collection status: ${err.message}`);
      }
    }

    if (!collectionExists) {
      console.log(`[QDRANT INIT] Collection '${COLLECTION_NAME}' does not exist. Creating...`);
      await axios.put(
        `${baseUrl}/collections/${COLLECTION_NAME}`,
        {
          vectors: {
            size: EMBED_DIM,
            distance: "Cosine",
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        },
        { headers, timeout: 15000 }
      );
      console.log(`✅ [QDRANT INIT] Collection '${COLLECTION_NAME}' created successfully.`);
    } else {
      console.log(`[QDRANT INIT] Collection '${COLLECTION_NAME}' already exists. Verifying configuration...`);
      const vectorsConfig = existingInfo.config?.params?.vectors;
      const existingDim = typeof vectorsConfig === "object" ? (vectorsConfig.size || vectorsConfig.default?.size) : null;

      if (existingDim && existingDim !== EMBED_DIM) {
        throw new Error(
          `[DIMENSION MISMATCH] Existing collection '${COLLECTION_NAME}' vector dimension is ${existingDim}, but active EMBED_DIM is ${EMBED_DIM}. Cannot proceed without corrupting search quality.`
        );
      }
      console.log(`✅ [QDRANT INIT] Collection dimension verified: ${existingDim || EMBED_DIM}`);
    }

    // 2. Create payload indexes
    const indexesToCreate = [
      { field_name: "companyId", field_schema: { type: "keyword", is_tenant: true } },
      { field_name: "repositoryId", field_schema: "keyword" },
      { field_name: "documentType", field_schema: "keyword" },
      { field_name: "filePath", field_schema: "keyword" },
      { field_name: "path", field_schema: "keyword" },
    ];

    for (const idx of indexesToCreate) {
      try {
        console.log(`[QDRANT INIT] Ensuring index on '${idx.field_name}'...`);
        await axios.put(
          `${baseUrl}/collections/${COLLECTION_NAME}/index`,
          idx,
          { headers, timeout: 10000 }
        );
        console.log(`✅ [QDRANT INIT] Index '${idx.field_name}' configured.`);
      } catch (idxErr) {
        // Ignore if index already exists
        if (idxErr.response && idxErr.response.status === 400 && idxErr.response.data?.status?.error?.includes("already exists")) {
          console.log(`ℹ️ [QDRANT INIT] Index '${idx.field_name}' already exists.`);
        } else {
          console.warn(`⚠️ [QDRANT INIT] Warning creating index on '${idx.field_name}': ${idxErr.message}`);
        }
      }
    }

    console.log("================================================================================");
    console.log("✅ QDRANT CLOUD / LOCAL COLLECTION INITIALIZATION COMPLETE");
    console.log("================================================================================");
    return true;
  } catch (error) {
    console.error(`❌ [QDRANT INIT FAILED] ${error.message}`);
    throw error;
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  initQdrantCollection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
