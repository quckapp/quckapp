# =============================================================================
# NESTJS DOCKERFILE
# =============================================================================
# Multi-stage build for NestJS applications
# =============================================================================

ARG NODE_VERSION=20

# Build stage
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Prune devDependencies
RUN npm prune --production

# Production stage
FROM node:${NODE_VERSION}-alpine AS runtime

# Security - run as non-root user
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Change ownership
RUN chown -R appuser:appgroup /app

# Create tmp directory for runtime use
RUN mkdir -p /tmp && chown -R appuser:appgroup /tmp

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Environment
ENV NODE_ENV=production \
    PORT=3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main.js"]
