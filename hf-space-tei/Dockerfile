# Dockerfile for Hugging Face Space: Text Embeddings Inference (CPU)
FROM ghcr.io/huggingface/text-embeddings-inference:cpu-1.5

# Expose standard HF Space port 7860
EXPOSE 7860

# Model ID to serve
ENV MODEL_ID=BAAI/bge-small-en-v1.5
ENV PORT=7860

# Run TEI with optional API token from HF Space Secret (BEARER_TOKEN or API_KEY)
ENTRYPOINT ["text-embeddings-router"]
CMD ["--model-id", "BAAI/bge-small-en-v1.5", "--port", "7860", "--auto-truncate"]
