import path from "path";
import fs from "fs";
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

const jwtPath = pathToFileURL(path.join(serverNodeModules, "jsonwebtoken", "index.js")).href;
const jwtModule = await import(jwtPath);
const jwt = jwtModule.default || jwtModule;

/**
 * Loads GitHub App private key in memory (never logs or writes to disk).
 */
function getAppPrivateKey() {
  if (process.env.GITHUB_PRIVATE_KEY_B64 || process.env.PRIVATE_KEY_B64) {
    const b64 = process.env.GITHUB_PRIVATE_KEY_B64 || process.env.PRIVATE_KEY_B64;
    return Buffer.from(b64, "base64").toString("utf8");
  }

  if (process.env.GITHUB_PRIVATE_KEY) {
    return process.env.GITHUB_PRIVATE_KEY;
  }

  if (process.env.GITHUB_PRIVATE_KEY_PATH) {
    const candidatePaths = [
      path.isAbsolute(process.env.GITHUB_PRIVATE_KEY_PATH) ? process.env.GITHUB_PRIVATE_KEY_PATH : null,
      path.resolve(process.cwd(), process.env.GITHUB_PRIVATE_KEY_PATH),
      path.resolve(serverDir, process.env.GITHUB_PRIVATE_KEY_PATH),
      path.resolve(serverDir, "whycode-dev.2026-10-03.private-key.pem")
    ].filter(Boolean);

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, "utf8");
      }
    }
  }

  const defaultKeyPath = path.resolve(serverDir, "whycode-dev.2026-10-03.private-key.pem");
  if (fs.existsSync(defaultKeyPath)) {
    return fs.readFileSync(defaultKeyPath, "utf8");
  }

  throw new Error("GitHub App private key not found. Please set GITHUB_PRIVATE_KEY_B64 or GITHUB_PRIVATE_KEY_PATH.");
}

/**
 * Signs a GitHub App JWT with RS256 algorithm.
 */
function generateAppJwt(appId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // 60s in the past to allow small clock skew
    exp: now + 540, // 9 minutes expiry
    iss: appId
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

export async function checkGithubApp() {
  console.log("================================================================================");
  console.log("                   WHYCODE GITHUB APP AUTHENTICATION AUDIT                      ");
  console.log("================================================================================");

  const appId = process.env.GITHUB_APP_ID || process.env.APP_ID;
  if (!appId) {
    console.error("FAIL: GITHUB_APP_ID environment variable is missing.");
    return { pass: false, reason: "GITHUB_APP_ID missing" };
  }

  let privateKey;
  try {
    privateKey = getAppPrivateKey();
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    return { pass: false, reason: err.message };
  }

  let appJwt;
  try {
    appJwt = generateAppJwt(appId, privateKey);
  } catch (err) {
    console.error(`FAIL: Failed to sign JWT with RS256 key (${err.message})`);
    return { pass: false, reason: err.message };
  }

  const localTimeBeforeReq = Date.now();

  try {
    const response = await axios.get("https://api.github.com/app", {
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "WhyCode-App-Integrity-Checker"
      },
      timeout: 10000
    });

    const localTimeAfterReq = Date.now();
    const serverDateHeader = response.headers["date"];
    let clockSkewSec = 0;
    let clockSkewNotice = "OK";

    if (serverDateHeader) {
      const githubServerTime = new Date(serverDateHeader).getTime();
      const avgLocalTime = (localTimeBeforeReq + localTimeAfterReq) / 2;
      clockSkewSec = Math.round((avgLocalTime - githubServerTime) / 1000);

      if (Math.abs(clockSkewSec) > 30) {
        clockSkewNotice = `WARNING: Large skew (${clockSkewSec}s difference)`;
      } else {
        clockSkewNotice = `${clockSkewSec}s (Acceptable)`;
      }
    }

    const { id, name, slug } = response.data;

    console.log(`App ID:            ${id}`);
    console.log(`App Name:          ${name}`);
    console.log(`App Slug:          ${slug}`);
    console.log(`GitHub Server Date: ${serverDateHeader || "N/A"}`);
    console.log(`Local Clock Skew:  ${clockSkewNotice}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("STATUS:            PASS (Successfully authenticated as GitHub App)");
    console.log("================================================================================");

    return {
      pass: true,
      appId: id,
      appName: name,
      appSlug: slug,
      clockSkewSec
    };
  } catch (err) {
    const status = err.response?.status || "ERR";
    const msg = err.response?.data?.message || err.message;
    console.log("--------------------------------------------------------------------------------");
    console.log(`STATUS:            FAIL (HTTP ${status}: ${msg})`);
    console.log("================================================================================");
    return { pass: false, status, reason: msg };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  checkGithubApp().then((res) => {
    process.exit(res.pass ? 0 : 1);
  }).catch((err) => {
    console.error("Check GitHub App error:", err.message);
    process.exit(1);
  });
}
