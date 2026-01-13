# =============================================================================
# GO DOCKERFILE
# =============================================================================
# Multi-stage build for Go applications
# =============================================================================

ARG GO_VERSION=1.21

# Build stage
FROM golang:${GO_VERSION}-alpine AS builder

ARG SERVICE_NAME=app

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /app/bin/${SERVICE_NAME} \
    ./cmd/main.go

# Runtime stage - using scratch for minimal image
FROM scratch AS runtime

ARG SERVICE_NAME=app

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy binary
COPY --from=builder /app/bin/${SERVICE_NAME} /app

# Expose port
EXPOSE 8080

# Health check (requires curl which isn't available in scratch)
# Use Kubernetes liveness/readiness probes instead

# Environment
ENV TZ=UTC

# Run as non-root (UID 1000)
USER 1000:1000

ENTRYPOINT ["/app"]
