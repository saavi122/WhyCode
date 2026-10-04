# Production Multi-Stage Dockerfile for WhyCode Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source code
COPY . .

# Final minimal production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for security
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D whycode

COPY --from=builder /app /app

USER whycode

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "app.js"]
