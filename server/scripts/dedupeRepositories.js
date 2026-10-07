import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isApply = process.argv.includes("--apply");

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
  console.log(`MODE: ${isApply ? "APPLY (performing actual deletions)" : "DRY RUN (no changes will be made, pass --apply to execute)"}\n`);

  const repos = await mongoose.connection.db.collection("repositories").find({}).toArray();

  // Group repositories by company + fullName/repoKey
  const groups = new Map();
  for (const r of repos) {
    const companyId = String(r.companyId || r.company || "unknown");
    const key = `${companyId}:${(r.fullName || r.repoName || "").toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(r);
  }

  let totalDuplicatesFound = 0;
  let totalDeleted = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue;

    totalDuplicatesFound += group.length - 1;
    console.log(`Found ${group.length} duplicates for group key [${key}]:`);

    // Sort group to pick best record to keep:
    // Prefer: records with lastScanAt or lastSyncedAt, then latest updatedAt/createdAt
    group.sort((a, b) => {
      const aDate = new Date(a.lastScanAt || a.lastSyncedAt || a.updatedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.lastScanAt || b.lastSyncedAt || b.updatedAt || b.createdAt || 0).getTime();
      return bDate - aDate;
    });

    const keepRecord = group[0];
    const toDelete = group.slice(1);

    console.log(`  KEEP -> ID: ${keepRecord._id} | fullName: ${keepRecord.fullName} | githubRepoId: ${keepRecord.githubRepositoryId || keepRecord.githubRepoId} | lastScanAt: ${keepRecord.lastScanAt || 'Never'}`);

    for (const del of toDelete) {
      console.log(`  REMOVE -> ID: ${del._id} | fullName: ${del.fullName} | githubRepoId: ${del.githubRepositoryId || del.githubRepoId} | lastScanAt: ${del.lastScanAt || 'Never'}`);

      if (isApply) {
        // Delete repository document
        await mongoose.connection.db.collection("repositories").deleteOne({ _id: del._id });

        // Remove Qdrant points belonging to this deleted duplicate
        try {
          const qdrantUrl = (process.env.QDRANT_URL || "http://127.0.0.1:6333").replace("localhost", "127.0.0.1");
          await axios.post(
            `${qdrantUrl}/collections/repository_chunks/points/delete`,
            {
              filter: {
                must: [
                  { key: "companyId", match: { value: String(del.companyId || del.company) } },
                  { key: "repositoryId", match: { value: String(del._id) } },
                ],
              },
            },
            { timeout: 5000 }
          );
          console.log(`  [QDRANT] Cleaned vector points for deleted duplicate ${del._id}`);
        } catch (qErr) {
          console.log(`  [QDRANT] Vector deletion notice: ${qErr.message}`);
        }
        totalDeleted++;
      }
    }
    console.log("");
  }

  if (!isApply && totalDuplicatesFound > 0) {
    console.log(`Summary: Found ${totalDuplicatesFound} duplicate repository record(s). Run with --apply to remove them.`);
  } else if (isApply) {
    console.log(`Summary: Successfully deleted ${totalDeleted} duplicate repository record(s) and cleaned Qdrant points.`);
  } else {
    console.log("Summary: No duplicate repositories found.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Deduplication error:", err);
  process.exit(1);
});
