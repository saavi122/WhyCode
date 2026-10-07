import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import "../models/Company.js";
import "../models/Repository.js";
import "../models/User.js";
import { queryRepositoryKnowledge } from "../services/groundingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runIsolationCheck() {
  await mongoose.connect(process.env.MONGO_URI);
  const Company = mongoose.model("Company");
  const Repository = mongoose.model("Repository");
  const User = mongoose.model("User");

  console.log("================================================================================");
  console.log("WHYCODE MULTI-TENANT ISOLATION VERIFICATION CHECK");
  console.log("================================================================================\n");

  // Company 1: PayPal (saavi122/GigSure)
  const comp1 = await Company.findOne({ name: "PayPal" });
  const repo1 = await Repository.findOne({ companyId: comp1._id, name: "GigSure" });
  const user1 = await User.findOne({ email: "ria@paypal.com" });

  // Company 2: Acme Logistics Corp (acmelogistics/acme-backend)
  const comp2 = await Company.findOne({ name: "Acme Logistics Corp" });
  const repo2 = await Repository.findOne({ companyId: comp2._id, name: "acme-backend" });
  const user2 = await User.findOne({ email: "engineer@acmelogistics.com" });

  console.log(`[COMPANY 1] ${comp1.name} (ID: ${comp1._id})`);
  console.log(` - Connected Repo: ${repo1.fullName} (ID: ${repo1._id})`);
  console.log(` - User: ${user1.name} <${user1.email}>\n`);

  console.log(`[COMPANY 2] ${comp2.name} (ID: ${comp2._id})`);
  console.log(` - Connected Repo: ${repo2.fullName} (ID: ${repo2._id})`);
  console.log(` - User: ${user2.name} <${user2.email}>\n`);

  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 1: Company 1 queries its own secret fact (ZEBRA-CANARY-7391)");
  console.log("--------------------------------------------------------------------------------");
  const auth1 = { companyId: String(comp1._id), user: { companyId: String(comp1._id), id: user1._id } };
  const res1 = await queryRepositoryKnowledge(
    auth1,
    String(repo1._id),
    "What is the ZEBRA-CANARY-7391 service and what port does it run on?"
  );
  console.log(`Result: Grounded = ${res1.grounded}`);
  console.log(`Answer: "${res1.answer}"`);
  console.log(`Citations: ${JSON.stringify(res1.citations)}\n`);

  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 2: Company 2 queries Company 1's secret fact (ZEBRA-CANARY-7391)");
  console.log("--------------------------------------------------------------------------------");
  const auth2 = { companyId: String(comp2._id), user: { companyId: String(comp2._id), id: user2._id } };
  const res2 = await queryRepositoryKnowledge(
    auth2,
    String(repo2._id),
    "What is the ZEBRA-CANARY-7391 service and what port does it run on?"
  );
  console.log(`Result: Grounded = ${res2.grounded}`);
  console.log(`Answer: "${res2.answer}"`);
  console.log(`Citations: ${JSON.stringify(res2.citations)}\n`);

  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 3: Company 2 queries its own repository (Acme Logistics routing)");
  console.log("--------------------------------------------------------------------------------");
  const res3 = await queryRepositoryKnowledge(
    auth2,
    String(repo2._id),
    "What technologies does Acme Logistics backend use for communication and indexing?"
  );
  console.log(`Result: Grounded = ${res3.grounded}`);
  console.log(`Answer: "${res3.answer}"`);
  console.log(`Citations: ${JSON.stringify(res3.citations)}\n`);

  console.log("================================================================================");
  console.log("SUMMARY:");
  console.log(`- Company 1 Self-Access: ${res1.grounded ? "PASS (Grounded with Citations)" : "FAIL"}`);
  console.log(`- Cross-Tenant Isolation: ${!res2.grounded ? "PASS (Refusal with 0 Citations)" : "FAIL (Data Leaked!)"}`);
  console.log(`- Company 2 Self-Access: ${res3.grounded ? "PASS (Grounded with Citations)" : "FAIL"}`);
  console.log("================================================================================");

  process.exit(0);
}

runIsolationCheck().catch((err) => {
  console.error("Isolation check error:", err);
  process.exit(1);
});
