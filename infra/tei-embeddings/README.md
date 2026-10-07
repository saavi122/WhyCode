---
title: WhyCode TEI Embeddings
emoji: ⚡
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# WhyCode TEI Embeddings Space

Fast, low-latency CPU-optimized embedding inference powered by Hugging Face `text-embeddings-inference`.

- **Model**: `BAAI/bge-small-en-v1.5` (Dimension: 384)
- **Runtime**: Docker (CPU 1.5)
- **Port**: `7860`
- **Authentication**: Set Space Secret `API_KEY` or `INTERNAL_SERVICE_TOKEN` to require Bearer authentication.

## API Endpoints
- `POST /embed` - Generate vector embeddings for single or batch texts.
- `GET /health` - Health check.
- `GET /info` - Service and model metadata.
