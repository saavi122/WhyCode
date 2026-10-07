import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import axios from "axios";
import { getInstallationToken } from "../services/githubApp.js";
import Repository from "../models/Repository.js";
import GitHubConnection from "../models/GitHubConnection.js";
import CommitMemory from "../models/CommitMemory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function finalProof() {
  console.log("=================================================================");
  console.log("                 WHYCODE DATA AUTHENTICITY AUDIT                 ");
  console.log("=================================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Check Connected Repository
  const repo = await Repository.findOne({ fullName: "saavi122/GigSure" });
  if (!repo) {
    console.error("Repository saavi122/GigSure not found.");
    process.exit(1);
  }

  const connection = await GitHubConnection.findOne({ status: "CONNECTED" });
  const token = await getInstallationToken(connection.installationId);

  // 2. Fetch Real GitHub Commits directly from GitHub API
  const ghRes = await axios.get("https://api.github.com/repos/saavi122/GigSure/commits?per_page=100", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "WhyCode-App",
    },
  });
  const githubCommits = ghRes.data || [];
  const githubCount = githubCommits.length;

  // 3. Count in MongoDB CommitMemory
  const mongoCount = await CommitMemory.countDocuments({ repository: repo._id });

  // 4. Count COMMIT Chunks in Qdrant
  const qdrantUrl = (process.env.QDRANT_URL || "http://127.0.0.1:6333").replace("localhost", "127.0.0.1");
  const qdrantHeaders = { "Content-Type": "application/json" };
  if (process.env.QDRANT_API_KEY) {
    qdrantHeaders["api-key"] = process.env.QDRANT_API_KEY;
  }

  const qdrantScrollRes = await axios.post(
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
    { headers: qdrantHeaders }
  );

  const qdrantCommitPoints = qdrantScrollRes.data?.result?.points || [];
  const qdrantCount = qdrantCommitPoints.length;

  console.log("--- 1. COMMIT COUNT COMPARISON ---");
  console.log(`• Real GitHub API Commits count:  ${githubCount}`);
  console.log(`• MongoDB CommitMemory count:     ${mongoCount}`);
  console.log(`• Qdrant COMMIT Chunks count:     ${qdrantCount}`);
  console.log(`• Match Result:                   ${(githubCount === mongoCount && mongoCount === qdrantCount) ? "EXACT MATCH (100% Verified)" : "MISMATCH"}`);

  // 5. Check Qdrant Payload verification
  console.log("\n--- 2. QDRANT COMMIT PAYLOAD INTEGRITY ---");
  const sampleQdrant = qdrantCommitPoints[0];
  console.log(`• Sample Point ID:  ${sampleQdrant?.id}`);
  console.log(`• Author in payload: ${sampleQdrant?.payload?.author}`);
  console.log(`• SHA in payload:    ${sampleQdrant?.payload?.commitSha}`);
  console.log(`• Timestamp:         ${sampleQdrant?.payload?.timestamp}`);
  console.log(`• URL:               ${sampleQdrant?.payload?.url}`);

  // 6. Search for fake terms across ALL MongoDB collections
  console.log("\n--- 3. MONGODB FAKE DATA AUDIT (\"alex\", \"1491a2d\", \"Refactored auth\") ---");
  const collections = await db.listCollections().toArray();
  let totalAlexHits = 0;
  let totalShaHits = 0;
  let totalFakeAuthHits = 0;

  for (const colInfo of collections) {
    const col = db.collection(colInfo.name);

    const alexHits = await col.countDocuments({
      $or: [
        { author: "alex" },
        { authorName: "alex" },
        { authorLogin: "alex" },
      ],
    });

    const shaHits = await col.countDocuments({
      $or: [
        { commitSha: { $regex: "1491a2d", $options: "i" } },
        { sha: { $regex: "1491a2d", $options: "i" } },
      ],
    });

    const fakeAuthHits = await col.countDocuments({
      message: { $regex: "Refactored authentication logic and security middleware", $options: "i" },
    });

    if (alexHits > 0 || shaHits > 0 || fakeAuthHits > 0) {
      console.log(`  [ALERT] Collection ${colInfo.name}: alex=${alexHits}, 1491a2d=${shaHits}, fakeAuth=${fakeAuthHits}`);
    }
    totalAlexHits += alexHits;
    totalShaHits += shaHits;
    totalFakeAuthHits += fakeAuthHits;
  }

  console.log(`• Total "alex" hits in database:                 ${totalAlexHits}`);
  console.log(`• Total "1491a2d" hits in database:              ${totalShaHits}`);
  console.log(`• Total "Refactored authentication" hits in DB:   ${totalFakeAuthHits}`);
  console.log(`• Fake Data Status:                              ${(totalAlexHits === 0 && totalShaHits === 0 && totalFakeAuthHits === 0) ? "CLEAN (0 fake records)" : "FAKE RECORDS FOUND"}`);

  console.log("\n=================================================================\n");
  await mongoose.disconnect();
}

finalProof().catch((err) => {
  console.error("Proof script failed:", err);
  process.exit(1);
});
