# 📖 WhyCode Live Demo Operations & Maintenance Manual

This manual details day-to-day operations for maintaining, redeploying, re-indexing, rotating credentials, and managing free-tier resource limits for the **WhyCode Live Demo**.

---

## 1. Redeploying the Demo Stack

### Frontend (Vercel / Cloudflare Pages)
1. Push updates to the `main` branch:
   ```bash
   git push origin main
   ```
2. Vercel automatically runs `npm run build` in `client/` and deploys the production bundle.
3. Ensure Environment Variable in Vercel:
   - `VITE_API_BASE_URL`: `https://<YOUR_RENDER_BACKEND_URL>/api`

### Backend (Render / Railway / Docker)
1. Trigger deployment via Git push or Docker container rebuild using [`server/Dockerfile`](../server/Dockerfile).
2. Ensure the demo environment variables from [`.env.demo.example`](../.env.demo.example) are populated in your hosting provider's Secret Settings.
3. Verify live health check:
   ```bash
   curl -i https://<YOUR_BACKEND_URL>/api/health
   # Expected response: HTTP 200 OK {"status":"OK"}
   ```

---

## 2. Re-Indexing Repositories into Qdrant Cloud

If you wipe your cloud cluster, upgrade vector embedding models, or add new benchmark repositories:

1. **Configure your shell environment**:
   ```bash
   export QDRANT_URL="https://<CLUSTER_ID>.aws.cloud.qdrant.io:6333"
   export QDRANT_API_KEY="<YOUR_QDRANT_CLOUD_API_KEY>"
   ```
2. **Execute the batch sync script**:
   ```bash
   cd server
   node scripts/sync_and_verify.js
   ```
3. **Calibrate grounding score thresholds**:
   ```bash
   node scripts/calibrateThresholds.js
   ```
4. **Run the post-sync smoke test**:
   ```bash
   node scripts/smokeTest.js
   ```

---

## 3. Secret & Credential Rotation Protocol

| Secret | Rotation Procedure | Impact / Downtime |
|---|---|:---:|
| **GitHub App Private Key (`.pem`)** | Generate a new key in GitHub App settings → Download `.pem` → Update hosting secret `GITHUB_PRIVATE_KEY_PATH` → Delete old key from GitHub. | Zero downtime |
| **GitHub Webhook Secret** | Generate new random 32-char hex string → Update in GitHub App settings → Update `GITHUB_WEBHOOK_SECRET` in backend host. | Zero downtime |
| **Qdrant API Key** | Create new API key in Qdrant Cloud console → Update `QDRANT_API_KEY` in backend host → Delete previous key. | Zero downtime |
| **JWT Secret (`JWT_SECRET`)** | Update `JWT_SECRET` in backend host. Users will need to log in again to receive new session tokens. | < 1 min session reset |
| **MongoDB Connection URI** | Rotate password in MongoDB Atlas Security Settings → Update `MONGO_URI` in backend host. | Zero downtime |

---

## 4. Free-Tier Quotas & Resource Limits

| Service | Free-Tier Quotas & Thresholds | Throttling / Mitigation Strategy |
|---|---|---|
| **Qdrant Cloud** | 1 cluster, 0.5 vCPU, 1 GB RAM, ~100k vectors | Dense 384-dim vectors consume ~0.8KB per vector (capacity: >100,000 code chunks). Scrubber removes binary & large files. |
| **MongoDB Atlas** | M0 Sandbox (512 MB storage, shared RAM) | Auto-expiring MongoDB TTL indexes for `GitHubState` (10 min) and `WebhookDelivery` (7 days) prevent unbounded database growth. |
| **Upstash Redis** | 10,000 commands / day | Sync jobs and rate limiter counters are cached with short TTLs (60s – 300s). |
| **Render / Backend** | Free web service sleeps after 15 min of inactivity | Keep alive using an UptimeRobot monitor pinging `GET /api/health` every 5 minutes. |
| **GitHub API** | 5,000 requests/hour per GitHub App installation | Incremental tree diffs and SHA chunk caching avoid redundant API requests. |

---

## 5. Demo Safety Guardrails

- **`DEMO_MODE=true`**: Automatically activates demo cache for instant responses to suggested questions.
- **`DEMO_READ_ONLY=true`**: Disables destructive repository or organization deletion.
- **`DEMO_REPO_ALLOWLIST`**: Restricts repository connections strictly to approved public demo repositories.
- **`MAX_QUESTION_LENGTH=500`**: Discards questions longer than 500 characters to prevent prompt injection and token starvation.
- **503 LLM Fallback**: If local GPU or cloud LLM is offline, returns a user-friendly `503` status instead of hallucinating.
