import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "../server");
const serverNodeModules = path.resolve(serverDir, "node_modules");

// Import packages from server node_modules
const dotenvPath = pathToFileURL(path.join(serverNodeModules, "dotenv", "lib", "main.js")).href;
const dotenvModule = await import(dotenvPath);
const dotenv = dotenvModule.default || dotenvModule;
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(serverDir, ".env") });

const axiosPath = pathToFileURL(path.join(serverNodeModules, "axios", "index.js")).href;
const axiosModule = await import(axiosPath);
const axios = axiosModule.default || axiosModule;

/**
 * Verifies TEI Reranker endpoint.
 * Returns scores and verifies unauthorized fails when token configured.
 */
export async function verifyReranker(targetUrl) {
  const url = (targetUrl || process.env.TEI_RERANKER_URL || process.env.TEI_RERANK_URL || "http://127.0.0.1:8081").replace(/\/+$/, "");
  const token = process.env.INTERNAL_SERVICE_TOKEN || process.env.HF_TOKEN || "";

  console.log("================================================================================");
  console.log("                   WHYCODE TEI RERANKER ENDPOINT AUDIT                          ");
  console.log("================================================================================");
  console.log(`Target URL:        ${url}`);
  console.log(`Auth Configured:   ${token ? "YES (Bearer Token)" : "NO (Unauthenticated / Open)"}`);
  console.log("--------------------------------------------------------------------------------\n");

  let authCheckPass = false;
  let unauthCheckPass = false;

  // 1. Authorized Request
  const authHeaders = { "Content-Type": "application/json" };
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const testPayload = {
    query: "How does WhyCode extract engineering intent?",
    texts: [
      "WhyCode parses AST trees and commit history to document technical reasons.",
      "The kitchen recipe requires 2 cups of sugar and vanilla extract."
    ]
  };

  const startTime = Date.now();

  try {
    const res = await axios.post(`${url}/rerank`, testPayload, { headers: authHeaders, timeout: 15000 });
    const duration = Date.now() - startTime;
    const scores = res.data;

    if (Array.isArray(scores) && scores.length === 2 && typeof scores[0]?.score === "number") {
      authCheckPass = true;
      console.log(`[TEST 1: Authorized Request]     PASS (HTTP ${res.status}, ${scores.length} scores returned in ${duration}ms)`);
      console.log(`  Top Score (Index ${scores[0].index}): ${scores[0].score.toFixed(4)}`);
      console.log(`  2nd Score (Index ${scores[1].index}): ${scores[1].score.toFixed(4)}`);
    } else {
      console.log(`[TEST 1: Authorized Request]     FAIL (Unexpected response shape: ${JSON.stringify(scores)})`);
    }
  } catch (err) {
    const status = err.response?.status || "ERR";
    const msg = err.response?.data?.message || err.message;
    console.log(`[TEST 1: Authorized Request]     FAIL (HTTP ${status}: ${msg})`);
  }

  // 2. Unauthorized Request
  if (token) {
    try {
      const unauthRes = await axios.post(`${url}/rerank`, testPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      });
      console.log(`[TEST 2: Unauthorized Request]   FAIL (Expected HTTP 401/403, but got HTTP ${unauthRes.status} open response)`);
      unauthCheckPass = false;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        unauthCheckPass = true;
        console.log(`[TEST 2: Unauthorized Request]   PASS (HTTP ${status} Forbidden/Unauthorized properly enforced)`);
      } else {
        console.log(`[TEST 2: Unauthorized Request]   FAIL (Expected 401/403, got HTTP ${status || err.code})`);
      }
    }
  } else {
    console.log(`[TEST 2: Unauthorized Request]   SKIP (INTERNAL_SERVICE_TOKEN not configured; endpoint operating in local/open mode)`);
    unauthCheckPass = true;
  }

  console.log("\n--------------------------------------------------------------------------------");
  const overallPass = authCheckPass && unauthCheckPass;
  console.log(`VERIFY RERANKER RESULT: ${overallPass ? "PASS" : "FAIL"}`);
  console.log("================================================================================");

  return { pass: overallPass, authCheckPass, unauthCheckPass };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const targetUrl = process.argv[2];
  verifyReranker(targetUrl).then((r) => {
    process.exit(r.pass ? 0 : 1);
  }).catch((err) => {
    console.error("Reranker verification error:", err.message);
    process.exit(1);
  });
}
