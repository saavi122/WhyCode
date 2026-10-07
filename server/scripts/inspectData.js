import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function inspectData() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections in MongoDB:", collections.map(c => c.name));

  const CommitMemories = mongoose.connection.db.collection("commitmemories");
  const count = await CommitMemories.countDocuments();
  console.log("Total CommitMemory documents:", count);

  const matched = await CommitMemories.find({
    $or: [
      { author: /alex/i },
      { commitSha: /1491a2d/i },
      { commitSha: /3c4c8ff/i },
      { message: /Refactored authentication/i }
    ]
  }).toArray();

  console.log(`Matched fake/alex/3c4c8ff commits (${matched.length}):`);
  for (const c of matched) {
    console.log(JSON.stringify({
      id: c._id,
      repository: c.repository,
      author: c.author,
      commitSha: c.commitSha,
      message: c.message,
      createdAt: c.createdAt
    }, null, 2));
  }

  const allCommits = await CommitMemories.find({}).toArray();
  const authors = {};
  const repos = {};
  for (const c of allCommits) {
    authors[c.author] = (authors[c.author] || 0) + 1;
    const rKey = String(c.repository);
    repos[rKey] = (repos[rKey] || 0) + 1;
  }
  console.log("Authors in commitmemories:", authors);
  console.log("Repositories in commitmemories:", repos);

  // Also check other collections like knowledgeqas, repositories, drifts, etc.
  for (const col of collections) {
    const c = mongoose.connection.db.collection(col.name);
    const alexDocs = await c.find({
      $or: [
        { author: /alex/i },
        { message: /1491a2d/i },
        { answer: /1491a2d/i },
        { question: /1491a2d/i },
        { commitSha: /1491a2d/i }
      ]
    }).toArray();
    if (alexDocs.length > 0) {
      console.log(`Collection ${col.name} has ${alexDocs.length} matching documents.`);
    }
  }

  await mongoose.disconnect();
}

inspectData().catch(console.error);
