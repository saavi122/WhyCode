# Hugging Face Space Dockerfile: Text Embeddings Inference Reranker (CPU)
FROM ghcr.io/huggingface/text-embeddings-inference:cpu-1.5

# Expose Hugging Face Space default port
EXPOSE 7860

# Configuration variables
ENV PORT=7860
ENV MODEL_ID=BAAI/bge-reranker-base
ENV HF_HOME=/tmp/cache
ENV HUGGINGFACE_HUB_CACHE=/tmp/cache

# Copy startup entrypoint script
COPY entrypoint.sh /entrypoint.sh
USER root
RUN chmod +x /entrypoint.sh && mkdir -p /tmp/cache && chmod 777 /tmp/cache
USER 1000

ENTRYPOINT ["/entrypoint.sh"]
