# 🚀 WhyCode Demo & Production Deployment Architecture Guide

This guide details the step-by-step setup for launching a standalone, production-grade **WhyCode Demo Environment** with isolated microservices, cloud vector storage, and secure webhook ingestion.

---

## 1. Dedicated GitHub App for Demo
GitHub Apps enforce single URL bindings for callbacks and webhooks. Therefore, your **Local Development** and **Demo / Staging** environments require separate GitHub Apps.

### Setup Instructions:
1. Navigate to **GitHub Settings → Developer Settings → GitHub Apps → New GitHub App**.
2. **App Name**: `WhyCode (Live Demo)` (or unique name e.g. `whycode-demo-org`).
3. **Homepage URL**: `https://<YOUR_FRONTEND_DOMAIN>` (e.g. `https://whycode-demo.vercel.app`).
4. **Callback URL**: `https://<YOUR_BACKEND_DOMAIN>/api/github/callback`.
5. **Webhook URL**: `https://<YOUR_BACKEND_DOMAIN>/api/github/webhooks`.
6. **Webhook Secret**: Generate a strong 32-character random string (`GITHUB_WEBHOOK_SECRET`).
7. **Permissions**:
   - **Repository Permissions**:
     - *Contents*: Read-only
     - *Metadata*: Read-only
     - *Pull requests*: Read-only
     - *Commit statuses*: Read-only
   - **Subscribe to Events**:
     - `Push`
     - `Pull request`
     - `Installation` and `Installation target`
8. **Private Key**: Generate and download a new `.pem` private key. Save it securely on your backend host.

---

## 2. Qdrant Cloud (Managed Vector Storage)
WhyCode uses dense 384-dimensional vectors with cosine similarity matching HuggingFace TEI embeddings (`BAAI/bge-small-en-v1.5`).

### Setup Instructions:
1. Create a free account at [cloud.qdrant.io](https://cloud.qdrant.io).
2. Provision a **Free Tier 1GB Cluster** (0.5 vCPU, 1GB RAM, always-free).
3. Copy your **Cluster URL** (e.g., `https://xyz-abc.eu-central.aws.cloud.qdrant.io:6333`) and generate an **API Key**.
4. Create the `repository_chunks` collection:
   ```bash
   curl -X PUT "https://<YOUR_QDRANT_HOST>:6333/collections/repository_chunks" \
     -H "api-key: <YOUR_QDRANT_API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{
       "vectors": {
         "size": 384,
         "distance": "Cosine"
       }
     }'
   ```
5. Set environment variables in your backend:
   ```env
   QDRANT_URL=https://<YOUR_QDRANT_HOST>:6333
   QDRANT_API_KEY=<YOUR_QDRANT_API_KEY>
   ```

---

## 3. Redis Setup (Job Queues & Idempotency)
WhyCode uses Redis for background sync job queues and rate limit synchronization.

### Recommended Managed Options:
- **Upstash Serverless Redis** (Free tier: 10,000 commands/day, SSL enabled).
- **Railway / Render Redis Add-on** (Free/low-cost internal Redis).
- Connection string in backend:
  ```env
  REDIS_URL=rediss://default:<PASSWORD>@<HOST>:<PORT>
  ```

---

## 4. Hosting Strategy & Cold Start Mitigation

| Service | Recommended Free / Low-Cost Host | Configuration & Cold-Start Strategy |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com) | Set `VITE_API_BASE_URL=https://<YOUR_BACKEND_DOMAIN>/api`. Zero cold starts. |
| **Backend** | [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io) | Node.js ≥20 container. Keep alive with UptimeRobot pinging `GET /api/health` every 5 mins. |
| **Vector DB** | [Qdrant Cloud](https://cloud.qdrant.io) | Always-on free 1GB cluster. |
| **MongoDB** | [MongoDB Atlas](https://mongodb.com/atlas) | Free M0 Sandbox cluster (512MB). |

---

## 5. Demo LLM & Inference Options

Because free backend containers do not provide dedicated GPUs, choose one of the following architectures for your live demonstration:

### Option A: Local GPU Inference via Secure Tunnel (Recommended for Live Demo)
Run Ollama / vLLM on your local machine with `qwen2.5-coder:3b` and expose it securely via Cloudflare Tunnel:
```powershell
# 1. Start Ollama locally
ollama run qwen2.5-coder:3b

# 2. Open tunnel to Ollama API
cloudflared tunnel --url http://127.0.0.1:11434
```
Set in backend environment:
```env
LLM_BASE_URL=https://<YOUR_CLOUDFLARE_TUNNEL_URL>/v1
LLM_MODEL=qwen2.5-coder:3b
```

### Option B: Cloud Inference Fallback (Gemini / HuggingFace Router)
If no local machine is running during off-hours demo access:
```env
GEMINI_API_KEY=<YOUR_GOOGLE_GEMINI_API_KEY>
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-1.5-flash
```

---

## 6. Full Demo Environment Variable Checklist

```env
# ── Server & Runtime ──────────────────────────────────────────────
PORT=5000
NODE_ENV=production
CLIENT_URL=https://whycode-demo.vercel.app
SERVER_URL=https://whycode-api.onrender.com

# ── Databases & Cache ─────────────────────────────────────────────
MONGO_URI=mongodb+srv://<USER>:<PASS>@cluster0.mongodb.net/WhyCodeDemo?retryWrites=true&w=majority
REDIS_URL=rediss://default:<PASS>@<UPSTASH_HOST>:6379
JWT_SECRET=super_strong_production_jwt_secret_demo_2026

# ── Qdrant Cloud ──────────────────────────────────────────────────
QDRANT_URL=https://xyz-abc.eu-central.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_cloud_api_key

# ── Text Embeddings & Reranker ────────────────────────────────────
TEI_EMBEDDINGS_URL=http://127.0.0.1:8080
TEI_RERANKER_URL=http://127.0.0.1:8081

# ── LLM Inference ─────────────────────────────────────────────────
LLM_BASE_URL=https://<CLOUDFLARE_TUNNEL_URL>/v1
LLM_MODEL=qwen2.5-coder:3b

# ── Demo GitHub App ───────────────────────────────────────────────
GITHUB_APP_ID=5180500
GITHUB_APP_SLUG=whycode-demo-org
GITHUB_CLIENT_ID=your_demo_github_client_id
GITHUB_CLIENT_SECRET=your_demo_github_client_secret
GITHUB_WEBHOOK_SECRET=your_demo_webhook_secret
GITHUB_PRIVATE_KEY_PATH=/etc/secrets/github-app.private-key.pem
```

---

## 7. Verification & Threshold Recalibration
After pointing to the demo Qdrant Cloud cluster and embedding service:
1. **Re-sync your test repository**:
   ```bash
   node scripts/sync_and_verify.js
   ```
2. **Run the evaluation and threshold calibration script**:
   ```bash
   node scripts/calibrateThresholds.js
   node scripts/runEvaluation.js
   ```
3. **Verify multi-tenant isolation**:
   ```bash
   node scripts/testIsolation.js
   ```
