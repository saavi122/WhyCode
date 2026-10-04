import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { queryRepositoryKnowledge } from "../services/groundingService.js";
import Company from "../models/Company.js";
import Repository from "../models/Repository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runSmokeTests() {
  console.log("================================================================================");
  console.log("🚀 WHYCODE PRODUCTION / DEMO SMOKE TEST SUITE");
  console.log("================================================================================");

  await mongoose.connect(process.env.MONGO_URI);

  let passed = 0;
  let failed = 0;

  // 1. Resolve Company 1 & Repo 1
  const company1 = await Company.findOne({ name: "PayPal" });
  const repo1 = await Repository.findOne({ fullName: "saavi122/GigSure", companyId: company1?._id });

  // 2. Resolve Company 2 & Repo 2
  const company2 = await Company.findOne({ name: "Acme Logistics Corp" });
  const repo2 = await Repository.findOne({ fullName: "acmelogistics/acme-backend", companyId: company2?._id });

  if (!company1 || !repo1 || !company2 || !repo2) {
    console.error("❌ Smoke test setup error: Seed companies or repositories not found.");
    process.exit(1);
  }

  const authCompany1 = { company: company1._id, companyId: company1._id, id: "smoke-user-1" };
  const authCompany2 = { company: company2._id, companyId: company2._id, id: "smoke-user-2" };

  // ─────────────────────────────────────────────────────────────────────────────
  // SMOKE TEST 1: Known question returns citations
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[SMOKE TEST 1] Known question returns grounded answer & citations...");
  try {
    const q1 = "What is the ZEBRA-CANARY-7391 service and what port does it run on?";
    const res1 = await queryRepositoryKnowledge(authCompany1, repo1._id.toString(), q1);

    if (res1.grounded && res1.citations && res1.citations.length > 0) {
      console.log(`✅ PASS: Answer grounded (${res1.citations.length} citation(s)). Answer: "${res1.answer.slice(0, 80)}..."`);
      passed++;
    } else {
      console.error(`❌ FAIL: Expected grounded response with citations, got:`, res1);
      failed++;
    }
  } catch (err) {
    console.error(`❌ FAIL: Smoke test 1 threw error:`, err.message);
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SMOKE TEST 2: Cross-tenant isolation returns refusal for canary
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[SMOKE TEST 2] Cross-tenant isolation query returns exact refusal...");
  try {
    const q2 = "What is the ZEBRA-CANARY-7391 service and what port does it run on?";
    const res2 = await queryRepositoryKnowledge(authCompany2, repo2._id.toString(), q2);

    const isRefusal =
      !res2.grounded &&
      (!res2.citations || res2.citations.length === 0) &&
      res2.answer.includes("I couldn't find sufficient evidence in the connected repository");

    if (isRefusal) {
      console.log(`✅ PASS: Cross-tenant refusal enforced without hallucinations.`);
      passed++;
    } else {
      console.error(`❌ FAIL: Expected refusal for cross-tenant canary query, got:`, res2);
      failed++;
    }
  } catch (err) {
    console.error(`❌ FAIL: Smoke test 2 threw error:`, err.message);
    failed++;
  }

  console.log("\n================================================================================");
  console.log(`SMOKE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error("Fatal smoke test error:", err);
  process.exit(1);
});
