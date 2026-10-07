import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import axios from "axios";
import { getInstallationToken } from "../services/githubApp.js";
import Repository from "../models/Repository.js";
import GitHubConnection from "../models/GitHubConnection.js";
import CommitMemory from "../models/CommitMemory.js";
import * as scanController from "../controllers/scanController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const repo = await Repository.findById("6ac19a3fbb1ce57fae1480a7");
  console.log("Target repository:", repo.fullName, repo._id.toString());

  const connection = await GitHubConnection.findOne({ status: "CONNECTED" });
  const token = await getInstallationToken(connection.installationId);
  console.log("GitHub App installation token generated.");

  const req = {
    params: { repoId: repo._id.toString() },
    user: { company: repo.companyId, id: repo.owner, githubAccessToken: token },
  };
  const res = {
    status() { return this; },
    json(d) { console.log("Scan initiated response:", d); return this; },
  };

  await scanController.scanRepository(req, res, (err) => {
    if (err) console.error("Scan error:", err);
  });

  console.log("Waiting for scan to complete...");
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const current = await Repository.findById("6ac19a3fbb1ce57fae1480a7");
    console.log(`[${(i + 1) * 2}s] Repo status: ${current.status}, syncStatus: ${current.syncStatus}`);
    if (current.status === "completed" || current.status === "failed") {
      break;
    }
  }

  const mongoCommits = await CommitMemory.find({ repository: repo._id }).lean();
  console.log("\n==========================================");
  console.log(`MongoDB CommitMemory count: ${mongoCommits.length}`);
  mongoCommits.forEach((c) => {
    console.log(`  - SHA: ${c.commitSha.substring(0, 7)} | Author: ${c.author} | Name: ${c.authorName} | Msg: ${c.message.split("\n")[0]}`);
  });

  const qdrantUrl = process.env.QDRANT_URL || "http://127.0.0.1:6333";
  const qHeaders = { "Content-Type": "application/json" };
  if (process.env.QDRANT_API_KEY) {
    qHeaders["api-key"] = process.env.QDRANT_API_KEY;
  }

  const qdrantRes = await axios.post(
    `${qdrantUrl}/collections/repository_chunks/points/scroll`,
    {
      filter: {
        must: [
          { key: "repositoryId", match: { value: repo._id.toString() } },
          { key: "documentType", match: { value: "COMMIT" } },
        ],
      },
      limit: 100,
      with_payload: true,
    },
    { headers: qHeaders }
  );
  const qdrantCommitPoints = qdrantRes.data?.result?.points || [];
  console.log(`Qdrant COMMIT chunk points count: ${qdrantCommitPoints.length}`);

  const qdrantTotalRes = await axios.post(
    `${qdrantUrl}/collections/repository_chunks/points/scroll`,
    {
      filter: {
        must: [{ key: "repositoryId", match: { value: repo._id.toString() } }],
      },
      limit: 500,
      with_payload: false,
    },
    { headers: qHeaders }
  );
  console.log(`Total Qdrant points for repository: ${qdrantTotalRes.data?.result?.points?.length}`);
  console.log("==========================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
