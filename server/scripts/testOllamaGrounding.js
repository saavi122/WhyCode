import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { queryRepositoryKnowledge } from "../services/groundingService.js";
import Repository from "../models/Repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const repo = await Repository.findOne({ fullName: "saavi122/GigSure" });
  if (!repo) {
    console.error("Repo not found");
    process.exit(1);
  }

  const authContext = { user: { company: repo.companyId || repo.company, id: repo.owner } };

  console.log("=== 1. Testing Grounded Query with Ollama ===");
  const posRes = await queryRepositoryKnowledge(
    authContext,
    repo._id.toString(),
    "Sync wallet balance with user walletBalance on payout request"
  );
  console.log("Grounded:", posRes.grounded);
  console.log("Answer:\n", posRes.answer);
  console.log("Citations:", posRes.citations);

  await mongoose.disconnect();
}

main().catch(console.error);
