# 🧠 WhyCode — AI-Powered Knowledge Recovery & Documentation Intelligence

> *Stop asking "Why does this code exist?" — WhyCode answers it for you.*

WhyCode is a full-stack multi-tenant AI engineering platform that detects documentation drift, reconstructs the historical intent behind code, and surfaces tribal knowledge hidden in Git history. It combines local LLM reasoning (**Qwen 2.5 Coder 3B**), dense vector retrieval (**BAAI/bge-small-en-v1.5** in **Qdrant**), cross-encoder neural reranking (**BAAI/bge-reranker-large**), and GitHub App webhook synchronization to deliver grounded, cited codebase intelligence with zero hallucinations.

---

## 📑 Quick Links & Documentation

- 📋 [**Acceptance Evidence & Verification (13/13 PASS)**](./docs/ACCEPTANCE.md) — Step-by-step proof with logs, citations, and DB records.
- 🔒 [**Comprehensive Security Audit (15/15 PASS)**](./docs/SECURITY_AUDIT.md) — Complete automated verification of multi-tenant isolation, secret hygiene, and rate limits.
- 📖 [**Operations & Troubleshooting Runbook**](./docs/RUNBOOK.md) — Deployment, rollback, reindexing, secret rotation, tunnel restarts, and tenant deletion.
- 🗄️ [**Database & Vector Schema Specification**](./docs/SCHEMA_CHANGES.md) — Mongoose schemas and Qdrant vector payloads for redrawing `schema.png`.
- 📊 [**Evaluation & Accuracy Benchmark Report**](./eval/REPORT.md) — Grounded accuracy metrics, question categories, and threshold calibration.
- 🚀 [**Demo Architecture & Deployment Guide**](./docs/DEMO_DEPLOYMENT.md) — Production demo setup with Qdrant Cloud and guardrails.

---

## ✨ Features & Capabilities

| Capability | Description |
|---|---|
| **Grounded AI Knowledge Chat** | Natural language queries grounded strictly in repository code, commits, and PRs. Zero hallucinations; strict standardized refusals on out-of-scope questions. |
| **Documentation Drift Reports** | Compares markdown docs and docstrings against live code. Merges chunk-level drift evaluations and highlights discrepancies. |
| **Intent Reconstruction** | Reconstructs *why* a file or function was created using commit history, commit messages, and PR context with strict commit SHA validation. |
| **Incremental Webhook Sync** | Real-time GitHub App webhook ingress (`push`, `pull_request`, `installation`) with HMAC SHA-256 validation, 7-day idempotency deduplication, and atomic commit pointers. |
| **Multi-Tenant Security Isolation** | Enforced tenant boundaries (`companyId` + `repositoryId`) at every route, query, and Qdrant vector search. |
| **Human-in-the-Loop Report Review** | AI reports generated as drafts (`PENDING_REVIEW`). Role-checked review workflow (`APPROVE`, `EDIT & APPROVE`, `REJECT`) creates immutable published records. |
| **Markdown Report Export** | Instant export of approved or draft intelligence reports formatted as clean GitHub-flavored markdown. |

---

## 🏗️ Architecture & Microservices

```
                       ┌─────────────────────────┐
                       │   React 19 Frontend     │
                       │   (Vite SPA on :5173)   │
                       └────────────┬────────────┘
                                    │ HTTP / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               WhyCode Express Backend (Node.js ESM :5000)             │
│                                                                        │
│  ┌──────────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │   Auth & RBAC    │  │ GitHub Webhooks   │  │  Grounding Service  │  │
│  │  (JWT + bcrypt)  │  │ (HMAC + Queue)    │  │  & Rate Limiters    │  │
│  └────────┬─────────┘  └─────────┬─────────┘  └──────────┬──────────┘  │
└───────────┼──────────────────────┼───────────────────────┼─────────────┘
            │                      │                       │
     ┌──────┴──────┐        ┌──────┴──────┐         ┌──────┴──────┐
     │ MongoDB     │        │ Cloudflare  │         │ Local AI    │
     │ Atlas       │        │ Quick Tunnel│         │ Microservices│
     │ (Metadata)  │        │ (Ingress)   │         └──────┬──────┘
     └─────────────┘        └─────────────┘                │
                                     ┌─────────────────────┼─────────────────────┐
                                     ▼                     ▼                     ▼
                             ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
                             │ Qdrant Vector │     │ TEI Embedding │     │ TEI Reranker  │
                             │ Store (:6333) │     │ BGE-Small     │     │ BGE-Reranker  │
                             │ (384-dim)     │     │ (:8080)       │     │ (:8081)       │
                             └───────────────┘     └───────────────┘     └───────────────┘
                                                           │
                                                           ▼
                                                   ┌───────────────┐
                                                   │ Ollama / vLLM │
                                                   │ Qwen 2.5 3B   │
                                                   │ (:11434/v1)   │
                                                   └───────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 20.0.0
- **npm** ≥ 9
- **MongoDB Atlas** cluster or local MongoDB instance
- **Docker** (for local Qdrant & TEI containers) or Qdrant Cloud
- **Ollama** installed with `qwen2.5-coder:3b`

---

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/saavi122/WhyCode.git
cd WhyCode

# Install root, server, and client dependencies
npm run install-all
```

---

### 2. Configure Environment Variables

Copy the template `.env.example` to `server/.env` and configure your credentials:

```bash
cp .env.example server/.env
```

Key environment variables:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/WhyCode` |
| `JWT_SECRET` | Secret key for signing user JWTs | `supersecretjwtkeyforwhycode2026` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `LLM_BASE_URL` | OpenAI-compatible LLM endpoint | `http://localhost:11434/v1` |
| `LLM_MODEL` | Local LLM model identifier | `qwen2.5-coder:3b` |
| `TEI_EMBEDDINGS_URL`| Text Embeddings Inference URL | `http://localhost:8080` |
| `TEI_RERANKER_URL` | TEI Cross-Encoder Reranker URL | `http://localhost:8081` |
| `QDRANT_URL` | Qdrant Vector DB endpoint | `http://localhost:6333` |
| `GITHUB_APP_ID` | GitHub App numeric ID | `5180500` |
| `GITHUB_PRIVATE_KEY_PATH` | Path to GitHub App `.pem` private key | `./whycode-dev.private-key.pem` |
| `GITHUB_WEBHOOK_SECRET` | HMAC SHA-256 Webhook secret | `your_webhook_secret_string` |
| `TUNNEL_URL` | Public Cloudflare tunnel URL | `https://your-tunnel.trycloudflare.com` |

---

### 3. Start Local Microservices

```bash
# Start Qdrant Vector Store
docker run -d --name whycode-qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant:latest

# Start TEI Dense Embeddings (BAAI/bge-small-en-v1.5)
docker run -d --name whycode-tei-embed -p 8080:80 ghcr.io/huggingface/text-embeddings-inference:latest --model-id BAAI/bge-small-en-v1.5

# Start TEI Neural Reranker (BAAI/bge-reranker-large)
docker run -d --name whycode-tei-rerank -p 8081:80 ghcr.io/huggingface/text-embeddings-inference:latest --model-id BAAI/bge-reranker-large

# Pull and start Ollama LLM
ollama run qwen2.5-coder:3b
```

---

### 4. Run Development Stack

```bash
# Run both backend (:5000) and frontend (:5173) concurrently
npm run dev
```

Or run services independently:
```bash
npm run server   # Backend only
npm run client   # Frontend only
```

---

## 🧪 Testing & Verification Commands

```bash
# Run the complete automated test suite (15 test files, 97 tests)
npm test

# Run the live multi-tenant smoke test (Canary citation & cross-tenant refusal)
node server/scripts/smokeTest.js

# Run the full Grounded RAG 40-question benchmark evaluation
node server/scripts/runEvaluation.js

# Run the complete 13-step acceptance evidence collection
node server/scripts/runAcceptanceEvidence.js
```

---

## 📊 Benchmark Accuracy & Known Limitations

*(Extracted from [`eval/REPORT.md`](./eval/REPORT.md))*

### Accuracy Metrics
- **Answerable Grounded Recall**: **100% (30 / 30)**
- **Refusal Precision (Out-of-Scope Queries)**: **100% (10 / 10)**
- **Cross-Tenant Refusal Precision**: **100% (5 / 5)**
- **Citation Validity Rate**: **100%**
- **Average Query Latency**: **1.42s** (Cached queries: **< 12ms**)

### Known Limitations
1. **Large Monorepo Indexing Time**: For repositories exceeding 5,000 files, initial full clone takes ~2–4 minutes depending on GPU compute capability. (Mitigated by incremental webhook synchronization for push events).
2. **Diff Context Window Cap**: Single-file intent reconstruction is capped at 8 retrieved neighbouring chunks (~3,200 tokens) to guarantee sub-2-second latency on 3B models.
3. **Out-of-Tree Binary Files**: Non-text blobs (compiled binaries, images, audio) are excluded from vector indexing.
4. **Ephemeral Quick Tunnel Subdomains**: Accountless Cloudflare quick tunnels (`trycloudflare.com`) rotate their domain on restart, requiring GitHub App webhook URL updates.

---

## 📄 License
This project is licensed under the **ISC License**.
