# =============================================================================
# QuikApp Go Service Dockerfile
# Multi-stage build with static binary for minimal production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    upx

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies (cached if go.mod/go.sum unchanged)
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build arguments
ARG VERSION=dev
ARG BUILD_DATE
ARG GIT_COMMIT
ARG SERVICE_NAME=service

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s \
        -X main.Version=${VERSION} \
        -X main.BuildDate=${BUILD_DATE} \
        -X main.GitCommit=${GIT_COMMIT}" \
    -trimpath \
    -o /app/bin/${SERVICE_NAME} \
    ./cmd/${SERVICE_NAME}

# Compress binary with UPX (optional, reduces size by ~60%)
RUN upx --best --lzma /app/bin/${SERVICE_NAME} || true

# -----------------------------------------------------------------------------
# Stage 2: Production Runner (Distroless)
# -----------------------------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot AS runner-distroless

# Copy binary and certificates
COPY --from=builder /app/bin/* /app/
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Build metadata labels
ARG VERSION=dev
ARG BUILD_DATE
ARG GIT_COMMIT
ARG SERVICE_NAME=service

LABEL org.opencontainers.image.title="QuikApp Go Service" \
      org.opencontainers.image.description="QuikApp microservice built with Go" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="QuikApp" \
      org.opencontainers.image.source="https://github.com/quikapp/quikapp"

# Set environment variables
ENV TZ=UTC
ENV GIN_MODE=release
ENV PORT=8090

# User is already nonroot in distroless
USER nonroot:nonroot

WORKDIR /app

# Expose port
EXPOSE 8090

# Start the application
ENTRYPOINT ["/app/service"]

# -----------------------------------------------------------------------------
# Alternative Stage 2: Production Runner (Alpine - with shell access)
# Use this for debugging or if you need shell access
# Build with: docker build --target runner-alpine ...
# -----------------------------------------------------------------------------
FROM alpine:3.19 AS runner-alpine

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    curl \
    tzdata && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 golang && \
    adduser --system --uid 1001 golang

WORKDIR /app

# Copy binary
ARG SERVICE_NAME=service
COPY --from=builder --chown=golang:golang /app/bin/${SERVICE_NAME} ./service

# Build metadata labels
ARG VERSION=dev
ARG BUILD_DATE
ARG GIT_COMMIT

LABEL org.opencontainers.image.title="QuikApp Go Service" \
      org.opencontainers.image.description="QuikApp microservice built with Go" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="QuikApp" \
      org.opencontainers.image.source="https://github.com/quikapp/quikapp"

# Set environment variables
ENV TZ=UTC
ENV GIN_MODE=release
ENV PORT=8090

# Switch to non-root user
USER golang

# Expose port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8090/health || exit 1

# Start the application
ENTRYPOINT ["./service"]
