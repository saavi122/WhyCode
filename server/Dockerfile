# Stage 1: Dependency & Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user and group
RUN addgroup -g 10001 -S nodegroup && \
    adduser -u 10001 -S nodeuser -G nodegroup

# Copy installed production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodeuser:nodegroup . .

# Set permissions for non-root user
USER nodeuser

# Expose server port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start WhyCode server
CMD ["node", "app.js"]
