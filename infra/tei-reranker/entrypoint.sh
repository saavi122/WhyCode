#!/bin/sh
set -e

ARGS="--model-id ${MODEL_ID:-BAAI/bge-reranker-base} --port ${PORT:-7860} --auto-truncate"

# Pass --api-key if Space Secret API_KEY or INTERNAL_SERVICE_TOKEN is present
if [ -n "$API_KEY" ]; then
  ARGS="$ARGS --api-key $API_KEY"
elif [ -n "$INTERNAL_SERVICE_TOKEN" ]; then
  ARGS="$ARGS --api-key $INTERNAL_SERVICE_TOKEN"
elif [ -n "$BEARER_TOKEN" ]; then
  ARGS="$ARGS --api-key $BEARER_TOKEN"
fi

echo "Starting Text Embeddings Reranker on CPU with model: ${MODEL_ID:-BAAI/bge-reranker-base}"
exec text-embeddings-router $ARGS
