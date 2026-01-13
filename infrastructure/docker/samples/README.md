# QuikApp Sample Dockerfiles

Production-ready, multi-stage Dockerfiles for each technology stack used in QuikApp.

## Available Dockerfiles

| File | Stack | Base Image | Final Size |
|------|-------|------------|------------|
| `Dockerfile.nestjs` | NestJS/Node.js | node:20-alpine | ~150MB |
| `Dockerfile.spring` | Spring Boot/Java | eclipse-temurin:17-jre-alpine | ~200MB |
| `Dockerfile.elixir` | Elixir/Phoenix | alpine:3.18 | ~50MB |
| `Dockerfile.go` | Go | distroless/static | ~10MB |
| `Dockerfile.python` | Python/Flask | python:3.11-slim | ~200MB |

## Features

All Dockerfiles include:

- **Multi-stage builds** - Separate build and runtime stages for smaller images
- **Non-root users** - Security best practice
- **Health checks** - Built-in container health monitoring
- **OCI labels** - Standard metadata for container registries
- **Optimized caching** - Dependencies cached separately from source code
- **Security updates** - Base images updated with latest patches

## Usage

### Building Images

```bash
# NestJS service
docker build -f Dockerfile.nestjs -t quikapp/backend-gateway:latest \
  --build-arg VERSION=1.0.0 \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  ./services/nestjs/backend-gateway

# Spring Boot service
docker build -f Dockerfile.spring -t quikapp/auth-service:latest \
  --build-arg VERSION=1.0.0 \
  ./services/spring/auth-service

# Elixir service
docker build -f Dockerfile.elixir -t quikapp/message-service:latest \
  --build-arg VERSION=1.0.0 \
  ./services/elixir/message-service

# Go service
docker build -f Dockerfile.go -t quikapp/workspace-service:latest \
  --build-arg VERSION=1.0.0 \
  --build-arg SERVICE_NAME=workspace-service \
  ./services/go/workspace-service

# Python service
docker build -f Dockerfile.python -t quikapp/analytics-service:latest \
  --build-arg VERSION=1.0.0 \
  ./services/python/analytics-service
```

### Multi-Architecture Builds

```bash
# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile.go \
  -t quikapp/workspace-service:latest \
  --push \
  ./services/go/workspace-service
```

### Running Containers

```bash
# NestJS
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://... \
  quikapp/backend-gateway:latest

# Spring Boot
docker run -d -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=production \
  -e JAVA_OPTS="-Xmx512m" \
  quikapp/auth-service:latest

# Elixir
docker run -d -p 4000:4000 \
  -e MIX_ENV=prod \
  -e DATABASE_URL=postgres://... \
  -e SECRET_KEY_BASE=your-secret \
  quikapp/message-service:latest

# Go
docker run -d -p 8090:8090 \
  -e GIN_MODE=release \
  -e DATABASE_URL=postgres://... \
  quikapp/workspace-service:latest

# Python
docker run -d -p 5000:5000 \
  -e FLASK_ENV=production \
  -e DATABASE_URL=postgres://... \
  quikapp/analytics-service:latest
```

## Stack-Specific Notes

### NestJS

- Uses `pnpm` for faster, more efficient dependency management
- `dumb-init` handles PID 1 and signal forwarding
- Production dependencies only in final image

### Spring Boot

- Uses layered JARs for optimal Docker layer caching
- JVM memory configured for container environments
- Actuator health endpoint for health checks

### Elixir

- OTP release for minimal runtime footprint
- No Erlang VM in final image, just the release
- Phoenix assets compiled if present

### Go

- **Distroless variant** (default): Minimal attack surface, no shell
- **Alpine variant**: For debugging, includes shell and curl
- Binary compressed with UPX (~60% size reduction)
- Static binary, no runtime dependencies

### Python

- Virtual environment isolated in `/opt/venv`
- Gunicorn with optimal worker/thread configuration
- **ML variant**: NVIDIA CUDA support for GPU workloads

## Customization

### Copy to Service Directory

```bash
# Copy appropriate Dockerfile to your service
cp Dockerfile.nestjs ../services/nestjs/backend-gateway/Dockerfile

# Copy .dockerignore
cp .dockerignore ../services/nestjs/backend-gateway/
```

### Modify for Your Service

Key areas to customize:

1. **Port numbers** - Update `EXPOSE` and environment variables
2. **Health check paths** - Update `HEALTHCHECK` endpoint
3. **Entry points** - Modify `CMD` or `ENTRYPOINT` as needed
4. **Build commands** - Adjust build steps for your project structure

## Best Practices

1. **Don't run as root** - All images use non-root users
2. **Keep images small** - Multi-stage builds, alpine bases
3. **Cache dependencies** - Copy dependency files before source
4. **Use .dockerignore** - Exclude unnecessary files
5. **Pin versions** - Use specific base image tags
6. **Scan for vulnerabilities** - Use Trivy or similar tools

## Security Scanning

```bash
# Scan image for vulnerabilities
trivy image quikapp/backend-gateway:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL quikapp/backend-gateway:latest
```

## Troubleshooting

### Image Too Large

- Check `.dockerignore` includes all unnecessary files
- Ensure multi-stage build copies only required files
- Use `docker history <image>` to identify large layers

### Build Fails

- Verify all required files are not in `.dockerignore`
- Check build logs for dependency errors
- Ensure correct base image architecture

### Container Won't Start

- Check logs: `docker logs <container>`
- Verify environment variables are set
- Check health endpoint is accessible
