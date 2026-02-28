# Build stage
# NOTE: Build context is repo root (.) to resolve replace directive for go-auth
FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

# Copy go-auth package (referenced via replace directive)
COPY packages/go-auth /app/packages/go-auth

# Copy service go mod files
WORKDIR /app/packages/service-urls/api/v1
COPY packages/service-urls/api/v1/go.mod packages/service-urls/api/v1/go.sum ./
RUN go mod download

# Copy service source code
COPY packages/service-urls/api/v1/ .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

COPY --from=builder /app/server .

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8085/health || exit 1

CMD ["./server"]
