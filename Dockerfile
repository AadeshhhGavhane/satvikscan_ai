# Multi-stage Dockerfile for SatvikScan AI
# Stage 1: Build stage
FROM oven/bun:1.1.38-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code and configuration
COPY src/ ./src/
COPY public/ ./public/
COPY systemprompt.md ./
COPY tsconfig.json ./

# Build the application
RUN bun run build
RUN bun run build:worker

# Stage 2: Runtime stage
FROM oven/bun:1.1.38-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S satvikscan -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=satvikscan:nodejs /app/dist ./dist
COPY --from=builder --chown=satvikscan:nodejs /app/public ./public
COPY --from=builder --chown=satvikscan:nodejs /app/systemprompt.md ./
COPY --from=builder --chown=satvikscan:nodejs /app/package.json ./

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Create logs directory
RUN mkdir -p /app/logs && chown satvikscan:nodejs /app/logs

# Switch to non-root user
USER satvikscan

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden in docker-compose)
CMD ["bun", "run", "start"]
