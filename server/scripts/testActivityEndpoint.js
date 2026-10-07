import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Repository from "../models/Repository.js";
import * as repoController from "../controllers/repoController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function testActivity() {
  await mongoose.connect(process.env.MONGO_URI);
  const repo = await Repository.findById("6ac19a3fbb1ce57fae1480a7");

  const req = {
    params: { repoId: repo._id.toString() },
    query: { page: 1, limit: 5 },
    user: { company: repo.companyId, id: repo.owner }
  };
  let result = null;
  const res = {
    status(c) { return this; },
    json(d) { result = d; return this; }
  };

  await repoController.getRepoActivity(req, res, (e) => console.error(e));

  console.log("Activity API response:");
  console.log(" - Total:", result.total);
  console.log(" - Page:", result.page);
  console.log(" - TotalPages:", result.totalPages);
  console.log(" - Commits returned in page:", result.commits.length);
  result.commits.forEach((c) => {
    console.log(`   * [${c.sha.substring(0, 7)}] by ${c.authorName} (@${c.authorLogin}) | ${c.filesChanged.length} files | ${c.message.split("\n")[0]}`);
  });
  process.exit(0);
}

testActivity().catch((e) => {
  console.error(e);
  process.exit(1);
});
