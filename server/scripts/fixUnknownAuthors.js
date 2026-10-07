import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import CommitMemory from "../models/CommitMemory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function fixUnknownAuthors() {
  await mongoose.connect(process.env.MONGO_URI);
  const commits = await CommitMemory.find({});
  let fixedCount = 0;

  for (const c of commits) {
    let changed = false;
    const authorLogin = c.authorLogin && c.authorLogin !== "unknown" ? c.authorLogin : "";
    let authorName = c.authorName && c.authorName !== "unknown" ? c.authorName : "";

    if (!authorName && authorLogin) {
      authorName = authorLogin;
      changed = true;
    }

    const displayAuthor = authorLogin || authorName || (c.author && c.author !== "unknown" ? c.author : "unknown");
    if (c.author !== displayAuthor) {
      changed = true;
    }

    if (changed) {
      c.author = displayAuthor;
      c.authorName = authorName || displayAuthor;
      await c.save();
      fixedCount++;
    }
  }

  console.log(`Fixed ${fixedCount} CommitMemory records with unknown authorName.`);
  await mongoose.disconnect();
}

fixUnknownAuthors().catch(console.error);
