import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function checkQdrant() {
  const url = process.env.QDRANT_URL || "http://localhost:6333";
  const apiKey = process.env.QDRANT_API_KEY;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["api-key"] = apiKey;

  try {
    const res = await axios.get(`${url}/collections/repository_chunks`, { headers });
    console.log("Collection info points count:", res.data.result.points_count);

    const scrollRes = await axios.post(
      `${url}/collections/repository_chunks/points/scroll`,
      {
        limit: 1000,
        with_payload: true,
        with_vector: false,
      },
      { headers }
    );

    const points = scrollRes.data?.result?.points || [];
    console.log("Total points retrieved:", points.length);

    const types = {};
    const commitChunks = [];
    points.forEach((p) => {
      const type = p.payload?.documentType;
      types[type] = (types[type] || 0) + 1;
      if (type === "COMMIT") {
        commitChunks.push({
          id: p.id,
          sha: p.payload?.commitSha,
          author: p.payload?.author,
          timestamp: p.payload?.timestamp,
          url: p.payload?.url,
          repo: p.payload?.repositoryId,
        });
      }
    });

    console.log("Document types count in Qdrant:", types);
    console.log(`Found ${commitChunks.length} COMMIT chunk(s) in Qdrant:`);
    commitChunks.forEach((c) => {
      console.log(`  - SHA: ${c.sha?.slice(0, 7)} | Author: ${c.author} | Time: ${c.timestamp} | URL: ${c.url}`);
    });
  } catch (err) {
    console.error("Qdrant error:", err.message, err.response?.data);
  }
}

checkQdrant();
