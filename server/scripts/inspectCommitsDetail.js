import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import CommitMemory from "../models/CommitMemory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const commits = await CommitMemory.find({}).sort({ committedAt: -1 }).lean();

  console.log("Total CommitMemory records:", commits.length);
  commits.forEach((c) => {
    console.log(JSON.stringify({
      sha: c.commitSha.slice(0, 7),
      author: c.author,
      authorName: c.authorName,
      authorLogin: c.authorLogin,
      authorEmail: c.authorEmail,
      avatarUrl: c.avatarUrl,
      filesCount: c.filesChanged?.length,
      committedAt: c.committedAt,
      htmlUrl: c.htmlUrl,
    }));
  });
  await mongoose.disconnect();
}

main().catch(console.error);
