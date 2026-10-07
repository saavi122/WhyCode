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
 * Verifies TEI Embeddings endpoint.
 * Expects EMBED_DIM numbers with the token, and 401/403 without it (when token is configured).
 */
export async function verifyEmbeddings(targetUrl) {
  const url = (targetUrl || process.env.TEI_EMBEDDINGS_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
  const expectedDim = parseInt(process.env.EMBED_DIM || "384", 10);
  const token = process.env.INTERNAL_SERVICE_TOKEN || process.env.HF_TOKEN || "";

  console.log("================================================================================");
  console.log("                   WHYCODE TEI EMBEDDINGS ENDPOINT AUDIT                        ");
  console.log("================================================================================");
  console.log(`Target URL:        ${url}`);
  console.log(`Expected Dim:      ${expectedDim}`);
  console.log(`Auth Configured:   ${token ? "YES (Bearer Token)" : "NO (Unauthenticated / Open)"}`);
  console.log("--------------------------------------------------------------------------------\n");

  let authCheckPass = false;
  let unauthCheckPass = false;

  // 1. Authorized Request
  const authHeaders = { "Content-Type": "application/json" };
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const testText = "WhyCode semantic vector embedding integrity verification query.";
  const startTime = Date.now();

  try {
    const res = await axios.post(`${url}/embed`, { inputs: testText }, { headers: authHeaders, timeout: 15000 });
    const duration = Date.now() - startTime;
    const data = res.data;
    const vector = Array.isArray(data[0]) ? data[0] : (Array.isArray(data) ? data : null);

    if (vector && Array.isArray(vector) && vector.length === expectedDim) {
      authCheckPass = true;
      console.log(`[TEST 1: Authorized Request]     PASS (HTTP ${res.status}, ${vector.length} dimensions in ${duration}ms)`);
    } else {
      const actualDim = vector ? vector.length : "invalid shape";
      console.log(`[TEST 1: Authorized Request]     FAIL (Expected ${expectedDim} dim, got ${actualDim})`);
    }
  } catch (err) {
    const status = err.response?.status || "ERR";
    const msg = err.response?.data?.message || err.message;
    console.log(`[TEST 1: Authorized Request]     FAIL (HTTP ${status}: ${msg})`);
  }

  // 2. Unauthorized Request (Expects 401/403 if token is required)
  if (token) {
    try {
      const unauthRes = await axios.post(`${url}/embed`, { inputs: testText }, {
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
  console.log(`VERIFY EMBEDDINGS RESULT: ${overallPass ? "PASS" : "FAIL"}`);
  console.log("================================================================================");

  return { pass: overallPass, authCheckPass, unauthCheckPass };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const targetUrl = process.argv[2];
  verifyEmbeddings(targetUrl).then((r) => {
    process.exit(r.pass ? 0 : 1);
  }).catch((err) => {
    console.error("Embeddings verification error:", err.message);
    process.exit(1);
  });
}
