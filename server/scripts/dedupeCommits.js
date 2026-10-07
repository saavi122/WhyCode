import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isApply = process.argv.includes("--apply");

async function dedupeCommits() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB Atlas\n");
  console.log(`MODE: ${isApply ? ">>> APPLY (Executing permanent deduplication) <<<" : ">>> DRY RUN (No records deleted. Pass --apply to execute) <<<\n"}`);

  const CommitMemories = mongoose.connection.db.collection("commitmemories");

  // Group commits by repository + commitSha
  const allCommits = await CommitMemories.find({}).toArray();
  const groups = new Map();

  for (const c of allCommits) {
    const repoId = String(c.repository || c.repositoryId || "");
    const sha = String(c.commitSha || c.sha || "");
    const key = `${repoId}:${sha}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(c);
  }

  let totalDuplicatesFound = 0;
  let totalDeleted = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue;

    totalDuplicatesFound += group.length - 1;
    console.log(`Found ${group.length} duplicates for [${key}]:`);

    // Sort to keep the most complete or latest record
    group.sort((a, b) => {
      const aScore = (a.filesChanged?.length || 0) + (a.authorLogin ? 2 : 0) + (a.avatarUrl ? 1 : 0);
      const bScore = (b.filesChanged?.length || 0) + (b.authorLogin ? 2 : 0) + (b.avatarUrl ? 1 : 0);
      return bScore - aScore;
    });

    const keepRecord = group[0];
    const toDelete = group.slice(1);

    console.log(`  [KEEP]   ID: ${keepRecord._id} | SHA: ${keepRecord.commitSha?.slice(0, 7)} | Author: ${keepRecord.author} | Files: ${keepRecord.filesChanged?.length || 0}`);

    for (const del of toDelete) {
      console.log(`  [REMOVE] ID: ${del._id} | SHA: ${del.commitSha?.slice(0, 7)} | Author: ${del.author}`);
      if (isApply) {
        await CommitMemories.deleteOne({ _id: del._id });
        totalDeleted++;
      }
    }
    console.log("");
  }

  if (isApply) {
    // Ensure unique index
    try {
      await CommitMemories.createIndex({ repository: 1, commitSha: 1 }, { unique: true });
      console.log("✓ Created/verified unique compound index on CommitMemory ({ repository: 1, commitSha: 1 }).");
    } catch (idxErr) {
      console.log(`Index notice: ${idxErr.message}`);
    }
    console.log(`\nSummary: Successfully deduplicated ${totalDeleted} commit record(s).`);
  } else {
    if (totalDuplicatesFound > 0) {
      console.log(`\nDRY RUN SUMMARY: Found ${totalDuplicatesFound} duplicate commit record(s). Run with --apply to delete them.`);
    } else {
      console.log("\nDRY RUN SUMMARY: No duplicate commits found in MongoDB.");
    }
  }

  await mongoose.disconnect();
}

dedupeCommits().catch((err) => {
  console.error("Deduplication error:", err);
  process.exit(1);
});
