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
 * Validates configured LLM providers by testing /models and a minimal structured generation request.
 * NEVER prints API keys or secrets in logs.
 */
async function testGemini(apiKey) {
  const result = {
    name: "Google Gemini",
    configured: Boolean(apiKey),
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    modelsCheck: { pass: false, status: null, reason: "" },
    structuredCheck: { pass: false, status: null, reason: "" }
  };

  if (!apiKey) {
    result.modelsCheck.reason = "GEMINI_API_KEY not configured";
    result.structuredCheck.reason = "GEMINI_API_KEY not configured";
    return result;
  }

  let supportedModel = null;
  // 1. Check /models
  try {
    const listRes = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      timeout: 10000
    });
    result.modelsCheck.status = listRes.status;
    const models = listRes.data?.models || [];
    result.modelsCheck.pass = listRes.status === 200 && Array.isArray(models);
    result.modelsCheck.reason = `Found ${models.length} models`;
    
    // Find first model supporting generateContent
    const genModel = models.find(m => m.supportedGenerationMethods?.includes("generateContent"));
    if (genModel) {
      supportedModel = genModel.name; // e.g. "models/gemini-1.5-flash"
    }
  } catch (err) {
    result.modelsCheck.status = err.response?.status || 500;
    result.modelsCheck.reason = err.response?.data?.error?.message || err.message;
  }

  // 2. Structured request
  try {
    const modelTarget = supportedModel || "models/gemini-1.5-flash";
    const genRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/${modelTarget}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: "Output JSON only: {\"status\":\"ok\",\"service\":\"gemini\"}" }] }]
      },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );
    result.structuredCheck.status = genRes.status;
    const text = genRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    result.structuredCheck.pass = genRes.status === 200 && text.length > 0;
    result.structuredCheck.reason = result.structuredCheck.pass ? `Valid response (${modelTarget})` : "Empty candidate text";
  } catch (err) {
    result.structuredCheck.status = err.response?.status || 500;
    result.structuredCheck.reason = err.response?.data?.error?.message || err.message;
  }

  return result;
}

async function testOpenAICompatible(name, baseUrl, apiKey, modelName) {
  const result = {
    name,
    configured: Boolean(baseUrl),
    endpoint: baseUrl ? baseUrl.replace(/\/+$/, "") : "(not set)",
    modelsCheck: { pass: false, status: null, reason: "" },
    structuredCheck: { pass: false, status: null, reason: "" }
  };

  if (!baseUrl) {
    result.modelsCheck.reason = "Base URL not configured";
    result.structuredCheck.reason = "Base URL not configured";
    return result;
  }

  const cleanUrl = baseUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // 1. Check /models
  try {
    const listRes = await axios.get(`${cleanUrl}/models`, { headers, timeout: 10000 });
    result.modelsCheck.status = listRes.status;
    const modelsCount = Array.isArray(listRes.data?.data) ? listRes.data.data.length : (Array.isArray(listRes.data) ? listRes.data.length : 1);
    result.modelsCheck.pass = listRes.status === 200;
    result.modelsCheck.reason = `Endpoint responded OK (${modelsCount} models)`;
  } catch (err) {
    result.modelsCheck.status = err.response?.status || 500;
    result.modelsCheck.reason = err.response?.data?.error?.message || err.message;
  }

  // 2. Structured request on /chat/completions
  try {
    const targetModel = modelName || "qwen2.5-coder:3b";
    const chatRes = await axios.post(
      `${cleanUrl}/chat/completions`,
      {
        model: targetModel,
        messages: [{ role: "user", content: "Reply strictly with JSON: {\"status\":\"ok\"}" }],
        temperature: 0.1,
        max_tokens: 300
      },
      { headers, timeout: 15000 }
    );
    result.structuredCheck.status = chatRes.status;
    const content = chatRes.data?.choices?.[0]?.message?.content || "";
    result.structuredCheck.pass = chatRes.status === 200 && content.length > 0;
    result.structuredCheck.reason = result.structuredCheck.pass ? `Valid response (${targetModel})` : "Empty message content";
  } catch (err) {
    result.structuredCheck.status = err.response?.status || 500;
    result.structuredCheck.reason = err.response?.data?.error?.message || err.message;
  }

  return result;
}

async function testGroq(apiKey) {
  if (!apiKey) {
    return {
      name: "Groq Cloud",
      configured: false,
      endpoint: "https://api.groq.com/openai/v1",
      modelsCheck: { pass: false, status: null, reason: "GROQ_API_KEY not set" },
      structuredCheck: { pass: false, status: null, reason: "GROQ_API_KEY not set" }
    };
  }
  return testOpenAICompatible("Groq Cloud", "https://api.groq.com/openai/v1", apiKey, process.env.GROQ_MODEL || "openai/gpt-oss-20b");
}

export async function checkAllLlmProviders() {
  console.log("================================================================================");
  console.log("                   WHYCODE LLM PROVIDERS CONNECTIVITY AUDIT                     ");
  console.log("================================================================================");
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);
  console.log(`Node Environment:    ${process.env.NODE_ENV || "development"}`);
  console.log("--------------------------------------------------------------------------------\n");

  const providers = [];

  // 1. Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  providers.push(await testGemini(geminiKey));

  // 2. Primary Configured LLM (vLLM / Ollama / Local / Remote)
  const llmBaseUrl = process.env.LLM_BASE_URL || process.env.VLLM_BASE_URL;
  const llmApiKey = process.env.LLM_API_KEY;
  const llmModel = process.env.LLM_MODEL || process.env.VLLM_MODEL || "qwen2.5-coder:3b";
  if (llmBaseUrl) {
    providers.push(await testOpenAICompatible("Configured LLM (LLM_BASE_URL)", llmBaseUrl, llmApiKey, llmModel));
  }

  // 3. Groq (if key set)
  if (process.env.GROQ_API_KEY) {
    providers.push(await testGroq(process.env.GROQ_API_KEY));
  }

  // Print formatted report table
  let anyPassed = false;
  for (const p of providers) {
    console.log(`[PROVIDER] ${p.name}`);
    if (p.endpoint) console.log(`  Endpoint:         ${p.endpoint}`);
    console.log(`  Configured:       ${p.configured ? "YES" : "NO"}`);
    
    const mPass = p.modelsCheck.pass ? "PASS" : "FAIL";
    console.log(`  /models:          [${mPass}] (HTTP ${p.modelsCheck.status || "N/A"}) - ${p.modelsCheck.reason}`);
    
    const sPass = p.structuredCheck.pass ? "PASS" : "FAIL";
    console.log(`  Structured Req:   [${sPass}] (HTTP ${p.structuredCheck.status || "N/A"}) - ${p.structuredCheck.reason}`);
    console.log("");

    if (p.modelsCheck.pass || p.structuredCheck.pass) {
      anyPassed = true;
    }
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`OVERALL LLM STATUS: ${anyPassed ? "PASS (At least one active provider available)" : "FAIL (No configured providers reachable)"}`);
  console.log("================================================================================");

  return providers;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  checkAllLlmProviders().then(() => process.exit(0)).catch((err) => {
    console.error("Provider audit error:", err.message);
    process.exit(1);
  });
}
