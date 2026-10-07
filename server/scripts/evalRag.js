import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Parse command line arguments
const args = process.argv.slice(2);
let baseUrl = "http://localhost:5000";
let thresholdsPath = process.env.THRESHOLDS_FILE || path.join(__dirname, "../config/thresholds.demo.json");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--url" && args[i + 1]) {
    baseUrl = args[i + 1].replace(/\/+$/, "");
    i++;
  } else if (args[i] === "--thresholds" && args[i + 1]) {
    thresholdsPath = path.resolve(process.cwd(), args[i + 1]);
    i++;
  }
}

const EVALUATION_BENCHMARK = [
  {
    id: "Q1_ARCH",
    category: "architecture",
    question: "What is WhyCode and what is its system architecture?",
    expectedGrounded: true,
    mustContainInCitations: ["README.md"],
  },
  {
    id: "Q2_IMPL",
    category: "implementation",
    question: "How does user authentication and JWT session token generation work?",
    expectedGrounded: true,
    mustContainInCitations: ["auth", "User"],
  },
  {
    id: "Q3_COMMITS",
    category: "commits",
    question: "What recent commits were made to the authentication service?",
    expectedGrounded: true,
  },
  {
    id: "Q4_CANARY_ISOLATION",
    category: "unanswerable",
    question: "What is the internal ZEBRA-CANARY-7391 heartbeat service port?",
    expectedGrounded: false, // For non-canary tenant, must refuse
    expectedRefusalSubstrings: ["couldn't find sufficient evidence", "insufficient evidence"],
  },
  {
    id: "Q5_OUT_OF_DOMAIN",
    category: "unanswerable",
    question: "What is the recipe for chocolate chip cookies?",
    expectedGrounded: false,
    expectedRefusalSubstrings: ["couldn't find sufficient evidence", "insufficient evidence"],
  },
];

async function runEvaluation() {
  console.log("================================================================================");
  console.log("🎯 WHYCODE RAG EVALUATION & BENCHMARK SUITE");
  console.log(`Target URL: ${baseUrl}`);
  console.log(`Thresholds Configuration: ${thresholdsPath}`);
  console.log("================================================================================\n");

  let thresholdConfig = null;
  if (fs.existsSync(thresholdsPath)) {
    try {
      thresholdConfig = JSON.parse(fs.readFileSync(thresholdsPath, "utf-8"));
      console.log(`[EVAL] Loaded threshold config: ${thresholdConfig.name || "Custom"}`);
    } catch (err) {
      console.warn(`[EVAL] Could not parse thresholds file: ${err.message}`);
    }
  }

  // 1. Health & Readiness check
  console.log("[EVAL] Checking server readiness...");
  try {
    const readyRes = await axios.get(`${baseUrl}/api/health/ready`, { timeout: 10000 });
    console.log(`✅ Server is ready. Dependencies:`, readyRes.data.dependencies || "OK");
  } catch (err) {
    console.warn(`⚠️ Readiness check failed or degraded (${err.message}). Proceeding with evaluation...`);
  }

  // 2. Obtain Demo Token
  let token = null;
  let repoId = "saavi122/GigSure";

  try {
    const loginRes = await axios.post(
      `${baseUrl}/api/auth/login`,
      { email: "demo@whycode.local", password: "DemoPassword123!" },
      { timeout: 10000 }
    );
    token = loginRes.data?.token;
    console.log(`✅ Authenticated demo session.`);
  } catch (err) {
    console.warn(`ℹ️ Demo login bypassed or unavailable (${err.message}). Attempting public query path...`);
  }

  const authHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const testCase of EVALUATION_BENCHMARK) {
    const startTime = Date.now();
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[RUNNING ${testCase.id}] [${testCase.category.toUpperCase()}] "${testCase.question}"`);

    try {
      const response = await axios.post(
        `${baseUrl}/api/chat/ask/${encodeURIComponent(repoId)}`,
        { question: testCase.question },
        { headers: authHeaders, timeout: 45000 }
      );

      const data = response.data;
      const durationMs = Date.now() - startTime;
      const citations = data.citations || [];
      const answer = data.answer || "";
      const grounded = Boolean(data.grounded);

      let passed = true;
      const failureReasons = [];

      if (testCase.expectedGrounded) {
        if (!grounded) {
          passed = false;
          failureReasons.push("Expected grounded answer, but got grounded: false");
        }
        if (citations.length === 0 && !data.cached) {
          passed = false;
          failureReasons.push("Expected citations, but received 0 citations");
        }
      } else {
        // Expected Refusal
        const containsRefusal = testCase.expectedRefusalSubstrings.some((sub) =>
          answer.toLowerCase().includes(sub.toLowerCase())
        );
        if (grounded || (!containsRefusal && citations.length > 0)) {
          passed = false;
          failureReasons.push(`Expected refusal message for unanswerable question, but got grounded response.`);
        }
      }

      if (passed) {
        passedCount++;
        console.log(`✅ PASS (${durationMs}ms) - Grounded: ${grounded}, Citations: ${citations.length}`);
        console.log(`   Sample: "${answer.slice(0, 100)}..."`);
      } else {
        failedCount++;
        console.log(`❌ FAIL (${durationMs}ms) - ${failureReasons.join(" | ")}`);
        console.log(`   Response: "${answer.slice(0, 150)}..."`);
      }

      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        passed,
        durationMs,
        grounded,
        citationCount: citations.length,
        answerSnippet: answer.slice(0, 120),
        failureReasons,
      });
    } catch (err) {
      failedCount++;
      const durationMs = Date.now() - startTime;
      const errMsg = err.response?.data?.message || err.message;
      console.log(`❌ FAIL (${durationMs}ms) - HTTP ${err.response?.status || "ERR"}: ${errMsg}`);

      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        passed: false,
        durationMs,
        grounded: false,
        citationCount: 0,
        error: errMsg,
      });
    }
  }

  console.log("\n================================================================================");
  console.log(`EVALUATION SUMMARY: ${passedCount}/${EVALUATION_BENCHMARK.length} PASSED (${failedCount} Failed)`);
  console.log("================================================================================");

  // Write evaluation report
  const reportPath = path.join(__dirname, "../evaluation_report.json");
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl,
    passedCount,
    failedCount,
    total: EVALUATION_BENCHMARK.length,
    results,
  }, null, 2));
  console.log(`📁 Report written to ${reportPath}\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Execute evaluation
runEvaluation().catch((err) => {
  console.error("Fatal evaluation error:", err);
  process.exit(1);
});
