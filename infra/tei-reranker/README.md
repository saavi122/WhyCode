---
title: WhyCode TEI Reranker
emoji: 🎯
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
---

# WhyCode TEI Reranker Space

Fast, low-latency CPU-optimized cross-encoder reranking powered by Hugging Face `text-embeddings-inference`.

- **Model**: `BAAI/bge-reranker-base`
- **Runtime**: Docker (CPU 1.5)
- **Port**: `7860`
- **Authentication**: Set Space Secret `API_KEY` or `INTERNAL_SERVICE_TOKEN` to require Bearer authentication.

## API Endpoints
- `POST /rerank` - Rerank candidate text passages against a query.
- `GET /health` - Health check.
- `GET /info` - Service and model metadata.
