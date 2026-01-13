# =============================================================================
# ELIXIR DOCKERFILE
# =============================================================================
# Multi-stage build for Elixir/Phoenix applications
# =============================================================================

ARG ELIXIR_VERSION=1.15
ARG OTP_VERSION=26
ARG ALPINE_VERSION=3.18

# Build stage
FROM hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-alpine-${ALPINE_VERSION} AS builder

ARG APP_NAME=app
ARG MIX_ENV=prod

ENV MIX_ENV=${MIX_ENV}

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    git \
    nodejs \
    npm

# Install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy mix files
COPY mix.exs mix.lock ./
COPY config config

# Install dependencies
RUN mix deps.get --only ${MIX_ENV}
RUN mix deps.compile

# Copy source code
COPY lib lib
COPY priv priv

# Compile assets (if Phoenix app)
COPY assets assets 2>/dev/null || true
RUN if [ -d "assets" ]; then \
        cd assets && npm ci && npm run deploy && cd .. && \
        mix phx.digest; \
    fi

# Compile application
RUN mix compile

# Build release
RUN mix release

# Runtime stage
FROM alpine:${ALPINE_VERSION} AS runtime

ARG APP_NAME=app

# Install runtime dependencies
RUN apk add --no-cache \
    libstdc++ \
    openssl \
    ncurses-libs \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Security - run as non-root user
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

WORKDIR /app

# Copy release from builder
COPY --from=builder /app/_build/prod/rel/${APP_NAME} ./

# Change ownership
RUN chown -R appuser:appgroup /app

# Create tmp directory
RUN mkdir -p /tmp && chown -R appuser:appgroup /tmp

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 4000 4369 9100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Environment
ENV MIX_ENV=prod \
    LANG=C.UTF-8 \
    PHX_SERVER=true \
    RELEASE_DISTRIBUTION=name

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bin/app", "start"]
