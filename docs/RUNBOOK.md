# 📖 WhyCode Operations & Troubleshooting Runbook

This runbook documents operational procedures, disaster recovery protocols, key rotation guides, and debugging workflows for the WhyCode intelligence platform.

---

## Table of Contents
1. [Deployment Procedures](#1-deployment-procedures)
2. [Rollback Procedures](#2-rollback-procedures)
3. [Re-Indexing Repositories](#3-re-indexing-repositories)
4. [Rotating Secrets & Credentials](#4-rotating-secrets--credentials)
5. [Cloudflare Tunnel Restarts & Webhook URLs](#5-cloudflare-tunnel-restarts--webhook-urls)
6. [GPU Memory & VRAM Troubleshooting](#6-gpu-memory--vram-troubleshooting)
7. [Deleting a Company's Data (Complete Cascade)](#7-deleting-a-companys-data-complete-cascade)

---

## 1. Deployment Procedures

### A. Local / Development Stack
```bash
# 1. Start Vector DB and Microservices
docker run -d --name whycode-qdrant -p 6333:6333 -p 6334:6334 -v qdrant_storage:/qdrant/storage qdrant/qdrant:latest
docker run -d --name whycode-tei-embed -p 8080:80 --gpus all ghcr.io/huggingface/text-embeddings-inference:latest --model-id BAAI/bge-small-en-v1.5
docker run -d --name whycode-tei-rerank -p 8081:80 --gpus all ghcr.io/huggingface/text-embeddings-inference:latest --model-id BAAI/bge-reranker-large

# 2. Start LLM Engine
ollama run qwen2.5-coder:3b

# 3. Start Backend & Frontend
cd server && npm start
cd client && npm run dev
```

### B. Docker Production Container
```bash
# Build backend image
docker build -t whycode-backend:latest ./server

# Run with environment configuration
docker run -d \
  --name whycode-backend \
  -p 5000:5000 \
  --env-file ./server/.env.production \
  whycode-backend:latest
```

---

## 2. Rollback Procedures

### A. Code & Service Rollback
1. Identify the previous stable commit:
   ```bash
   git log --oneline -n 5
   ```
2. Revert or checkout the target tag/commit:
   ```bash
   git checkout <PREVIOUS_STABLE_SHA>
   npm run install-all
   npm test
   ```
3. Restart the backend service daemon.

### B. Vector Index Rollback
If an erroneous bulk ingestion occurred:
```bash
# Delete corrupt chunks for specific repository
node -e "
import { deleteRepositoryChunks } from './server/services/qdrantStore.js';
deleteRepositoryChunks('COMPANY_ID', 'REPO_ID');
"
# Trigger clean full re-sync
node ./server/scripts/sync_and_verify.js
```

---

## 3. Re-Indexing Repositories

When changing embedding models (e.g., changing dimension sizes) or refreshing corrupted vector data:

1. **Delete Existing Vectors**:
   ```javascript
   import { deleteRepositoryChunks } from "./services/qdrantStore.js";
   await deleteRepositoryChunks(companyId, repositoryId);
   ```
2. **Reset Stored Sync Pointer**:
   ```javascript
   await Repository.findByIdAndUpdate(repositoryId, {
     lastCommitSha: null,
     lastSyncedAt: null,
     syncStatus: "QUEUED",
   });
   ```
3. **Trigger Full Sync**:
   ```bash
   curl -X POST http://localhost:5000/api/repositories/:repoId/sync \
     -H "Authorization: Bearer <ADMIN_JWT>"
   ```
4. **Recalibrate Thresholds**:
   ```bash
   node server/scripts/calibrateThresholds.js
   ```

---

## 4. Rotating Secrets & Credentials

### A. GitHub App Private Key (`*.pem`)
1. Generate a new private key in [GitHub App Settings](https://github.com/settings/apps).
2. Save the `.pem` file to `server/whycode-app.private-key.pem` with restricted permissions:
   ```bash
   chmod 600 server/whycode-app.private-key.pem
   ```
3. Update `GITHUB_PRIVATE_KEY_PATH` in `server/.env`.
4. Restart the backend.
5. In GitHub App Settings, delete the old private key once verified.

### B. GitHub Webhook Secret
1. Generate a 32-byte hex secret:
   ```bash
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   ```
2. Update `GITHUB_WEBHOOK_SECRET` in `server/.env` and in GitHub App Webhook settings.
3. Verify incoming deliveries receive HTTP 202 without 401 errors.

### C. JWT Secret
1. Update `JWT_SECRET` in `.env`.
2. Existing active sessions will expire and require user re-login.

---

## 5. Cloudflare Tunnel Restarts & Webhook URLs

When using an ephemeral Cloudflare quick tunnel (`trycloudflare.com`), restarting `cloudflared` changes the public URL:

1. **Start the tunnel daemon**:
   ```powershell
   C:\Users\Saavi\.cloudflared_bin\cloudflared.exe tunnel --url http://localhost:5000
   ```
2. **Extract the active domain from logs**:
   ```text
   Your quick Tunnel has been created! Visit it at:
   https://new-subdomain-here.trycloudflare.com
   ```
3. **Update `server/.env`**:
   ```env
   TUNNEL_URL=https://new-subdomain-here.trycloudflare.com
   GITHUB_WEBHOOK_URL=https://new-subdomain-here.trycloudflare.com/api/github/webhooks
   ```
4. **Update GitHub App Settings**:
   - Webhook URL: `https://new-subdomain-here.trycloudflare.com/api/github/webhooks`
   - Callback URL (if using tunnel): `https://new-subdomain-here.trycloudflare.com/api/github/callback`

---

## 6. GPU Memory & VRAM Troubleshooting

If Ollama or TEI encounters `CUDA Out of Memory` (OOM) or high latency:

### Symptoms
- `POST /api/chat/ask` returns `500` or `503 Service Unavailable`.
- Ollama logs indicate model offloading to CPU.

### Resolution Steps
1. **Unload Inactive Models from VRAM**:
   ```bash
   curl http://127.0.0.1:11434/api/generate -d '{"model": "qwen2.5-coder:3b", "keep_alive": 0}'
   ```
2. **Cap Max Input Tokens**:
   - Ensure `server/services/groundingService.js` reranking limits `topK <= 8`.
   - Ensure `MAX_QUESTION_LENGTH=500` is active in `.env`.
3. **Fallback to Gemini Cloud**:
   - Set `USE_GEMINI_FALLBACK=true` in `server/.env` to route heavy reasoning tasks to Gemini Flash.

---

## 7. Deleting a Company's Data (Complete Cascade)

WhyCode enforces strict data scrubbing upon company deletion to ensure complete GDPR/CCPA compliance:

```javascript
import Company from "./models/Company.js";
import Repository from "./models/Repository.js";
import CommitMemory from "./models/CommitMemory.js";
import KnowledgeQA from "./models/KnowledgeQA.js";
import Report from "./models/Report.js";
import GitHubConnection from "./models/GitHubConnection.js";
import { deleteCompanyChunks, countPoints } from "./services/qdrantStore.js";

async function purgeTenant(companyId) {
  // 1. Delete all vectors from Qdrant
  await deleteCompanyChunks(companyId, "repository_chunks");
  const remainingVectors = await countPoints(companyId);
  console.log(`Remaining Qdrant Vectors: ${remainingVectors} (Expected: 0)`);

  // 2. Delete all MongoDB collections associated with tenant
  const repoIds = (await Repository.find({ company: companyId })).map(r => r._id);
  await CommitMemory.deleteMany({ repository: { $in: repoIds } });
  await KnowledgeQA.deleteMany({ companyId });
  await Report.deleteMany({ companyId });
  await GitHubConnection.deleteMany({ companyId });
  await Repository.deleteMany({ company: companyId });
  await Company.findByIdAndDelete(companyId);

  console.log(`Tenant ${companyId} completely purged.`);
}
```

- **Verification Command**:
  ```bash
  npm test -- server/tests/repositoryFlow.test.js
  ```
