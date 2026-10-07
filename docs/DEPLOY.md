# 🚀 WhyCode Deployment & Infrastructure Runbook

This guide covers deployment options, environment variable configuration, cloud re-indexing, secret rotation, and free-tier optimization for WhyCode.

---

## 🏗️ Architecture Options

### Option 1: Managed Cloud Services (Recommended for Free Public Demo)
* **Frontend & Backend**: Render Free Web Service (`render.yaml`) or Railway (`railway.json`)
* **Database**: MongoDB Atlas (Free M0 Cluster)
* **Cache & Queue**: Upstash Redis (Free Tier, supports `rediss://`)
* **Vector Store**: Qdrant Cloud (Free 1GB Cluster)
* **Inference / LLM**: Groq / OpenRouter / Together AI / DeepSeek (OpenAI-compatible endpoints)
* **Embeddings**: HuggingFace Inference Endpoints or HF Spaces (`hf-space-tei/Dockerfile`)

### Option 2: Single Cloud VPS via Docker Compose
Run all services (Backend, Redis, Qdrant, TEI CPU Embeddings, TEI CPU Reranker) on a single VM (Hetzner, AWS EC2, DigitalOcean):
```bash
# Start all production services on VPS
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📋 Environment Variables Reference

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`production` or `development`) | `production` |
| `PORT` | HTTP Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/WhyCode` |
| `JWT_SECRET` | Cryptographic secret for signing session tokens | `min_32_characters_random_key` |
| `CLIENT_ORIGIN` | Allowed CORS frontend origin | `https://whycode-demo.onrender.com` |
| `CLIENT_URL` | Frontend URL for OAuth redirects | `https://whycode-demo.onrender.com` |
| `SERVER_URL` | Public backend URL | `https://whycode-api.onrender.com` |
| `REDIS_URL` | Redis URI (supports `rediss://` for TLS) | `rediss://default:token@cluster.upstash.io:6379` |
| `QDRANT_URL` | Qdrant Vector DB REST endpoint | `https://xyz.us-east-1.aws.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant Cloud API access key | `eyJhbGciOi...` |
| `TEI_EMBEDDINGS_URL` | TEI Embedding service endpoint | `https://your-tei-embed-space.hf.space` |
| `TEI_RERANKER_URL` | TEI Reranking service endpoint | `https://your-tei-rerank-space.hf.space` |
| `INTERNAL_SERVICE_TOKEN` | Bearer token sent to internal TEI services | `sec_tei_token_abc` |
| `LLM_BASE_URL` | OpenAI-compatible chat completions base URL | `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | Target language model | `llama-3.3-70b-versatile` |
| `LLM_API_KEY` | Bearer API token for cloud LLM provider | `gsk_...` |
| `LLM_EXTERNAL` | Set `true` when LLM is a 3rd party host (enforces privacy guard) | `true` |
| `THRESHOLDS_FILE` | Path to calibrated threshold JSON | `config/thresholds.demo.json` |
| `DEMO_MODE` | Activates demo rate limits & caching | `true` |
| `DEMO_READ_ONLY` | Prevents destructive deletions in public demo | `true` |
| `DEMO_REPO_ALLOWLIST` | Comma-separated public repos allowed for external LLM | `saavi122/gigsure,saavi122/whycode` |
| `MAX_QUESTION_LENGTH` | Character limit on incoming user questions | `500` |
| `ALLOW_LOCAL_SERVICES`| Allows localhost/private IPs in production (for local testing) | `false` |
| `TRUST_PROXY` | Number of reverse proxies or boolean | `1` |

---

## ⚡ Free-Tier Usage Limits & Optimization

### 1. Upstash Redis
* **Free limit**: 10,000 commands/day.
* **WhyCode optimization**:
  * BullMQ workers configured with `stalledInterval: 60000` (checks only once every 60s instead of default 5s).
  * Auto-removes old completed and failed jobs (`removeOnComplete: { count: 50 }`).
  * In-memory caching fallback if Redis limits are approached.

### 2. Qdrant Cloud
* **Free limit**: 1 free cluster (1GB storage, ~1M vectors).
* **Setup**:
  Run the initialization script once against your Qdrant cluster:
  ```bash
  node scripts/qdrantInit.js
  ```
  This creates the `repository_chunks` collection with cosine distance (dimension 384) and configures payload indexes on `companyId` (tenant index), `repositoryId`, `documentType`, and `filePath`.

### 3. Render / Free Backend Cold Starts
* Free instances spin down after 15 minutes of inactivity.
* The frontend includes automatic retry with an animated **"Waking up the server... Please wait a moment"** banner upon cold-start 502/503/504 responses.

---

## 🔄 Cloud Re-indexing Runbook

To index or re-index a repository in the cloud:

1. **Verify Services**:
   ```bash
   curl -X GET https://your-backend.onrender.com/api/health/ready
   ```
2. **Execute Ingestion**:
   Trigger a sync via the UI or GitHub App webhook push.
3. **Calibrate & Benchmark Grounding**:
   ```bash
   node scripts/evalRag.js --url https://your-backend.onrender.com --thresholds config/thresholds.demo.json
   ```

---

## 🔐 Secret Rotation Procedure

1. **Qdrant API Key Rotation**:
   * Generate a new API Key in Qdrant Cloud Console.
   * Update `QDRANT_API_KEY` in Render / Railway environment settings.
   * Revoke the old key after deployment verifies healthy readiness (`/api/health/ready`).

2. **LLM Provider API Key Rotation**:
   * Generate a new key from your provider (Groq / OpenRouter / OpenAI).
   * Update `LLM_API_KEY` in environment variables.

3. **JWT Secret Rotation**:
   * Updating `JWT_SECRET` invalidates all existing sessions, prompting users to re-login.

---

## 🔁 Webhook Redelivery After Cold Start

If GitHub sends a push webhook while the server is cold-starting:
1. Navigate to your GitHub App settings -> **Advanced** -> **Recent Deliveries**.
2. Locate any deliveries that received a `502` or `503` during spin-up.
3. Click **Redeliver**.
4. The server's idempotent `X-GitHub-Delivery` mechanism ensures the webhook is processed without duplication.
