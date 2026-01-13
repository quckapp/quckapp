---
sidebar_position: 2
title: Docker Deployment
description: Docker and Docker Compose deployment guide
---

# Docker Deployment

Deploy QuckChat using Docker containers for consistent, reproducible deployments.

## Quick Start

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## Docker Compose Files

### Infrastructure Only
```bash
# Start MongoDB and Redis only
npm run docker:infra
```

### Full Stack
```bash
# Start everything (services + infrastructure)
npm run docker:up
```

## Docker Compose Configuration

### docker-compose.microservices.yml

```yaml
version: '3.8'

services:
  # Infrastructure
  mongodb:
    image: mongo:6
    container_name: quckchat-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: quckchat-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # API Gateway
  gateway:
    build:
      context: .
      dockerfile: Dockerfile
      target: gateway
    container_name: quckchat-gateway
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
      auth:
        condition: service_started
      users:
        condition: service_started

  # Microservices
  auth:
    build:
      context: .
      dockerfile: Dockerfile
      target: auth-service
    container_name: quckchat-auth
    environment:
      SERVICE_PORT: 4001
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

  users:
    build:
      context: .
      dockerfile: Dockerfile
      target: users-service
    container_name: quckchat-users
    environment:
      SERVICE_PORT: 4002
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

  messages:
    build:
      context: .
      dockerfile: Dockerfile
      target: messages-service
    container_name: quckchat-messages
    environment:
      SERVICE_PORT: 4003
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

  conversations:
    build:
      context: .
      dockerfile: Dockerfile
      target: conversations-service
    container_name: quckchat-conversations
    environment:
      SERVICE_PORT: 4004
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

  notifications:
    build:
      context: .
      dockerfile: Dockerfile
      target: notifications-service
    container_name: quckchat-notifications
    environment:
      SERVICE_PORT: 4005
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

  media:
    build:
      context: .
      dockerfile: Dockerfile
      target: media-service
    container_name: quckchat-media
    environment:
      SERVICE_PORT: 4006
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

  calls:
    build:
      context: .
      dockerfile: Dockerfile
      target: calls-service
    container_name: quckchat-calls
    environment:
      SERVICE_PORT: 4007
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

  analytics:
    build:
      context: .
      dockerfile: Dockerfile
      target: analytics-service
    container_name: quckchat-analytics
    environment:
      SERVICE_PORT: 4008
      MONGODB_URI_PROD: mongodb://root:password@mongodb:27017/quckchat?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy

volumes:
  mongodb_data:
  redis_data:

networks:
  default:
    name: quckchat-network
```

## Dockerfile

### Multi-Stage Build

```dockerfile
# Base image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++

# Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Builder
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Gateway
FROM base AS gateway
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]

# Auth Service
FROM base AS auth-service
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 4001
CMD ["node", "dist/microservices/auth-service/main.js"]

# Users Service
FROM base AS users-service
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 4002
CMD ["node", "dist/microservices/users-service/main.js"]

# ... similar for other services
```

## Docker Commands

### Build

```bash
# Build all images
npm run docker:build

# Build specific service
docker-compose -f docker-compose.microservices.yml build gateway
```

### Run

```bash
# Start all
docker-compose -f docker-compose.microservices.yml up -d

# Start specific service
docker-compose -f docker-compose.microservices.yml up -d gateway

# With rebuild
docker-compose -f docker-compose.microservices.yml up -d --build
```

### Logs

```bash
# All logs
npm run docker:logs

# Specific service
docker-compose -f docker-compose.microservices.yml logs -f gateway

# Last 100 lines
docker-compose -f docker-compose.microservices.yml logs --tail=100 gateway
```

### Stop

```bash
# Stop all
npm run docker:down

# Stop and remove volumes
docker-compose -f docker-compose.microservices.yml down -v
```

### Scale

```bash
# Scale messages service
docker-compose -f docker-compose.microservices.yml up -d --scale messages=3
```

## Environment Variables

Pass environment variables via:

### .env file
```bash
# .env
MONGODB_URI_PROD=mongodb://...
JWT_SECRET=...
```

```yaml
# docker-compose.yml
services:
  gateway:
    env_file:
      - .env
```

### Environment section
```yaml
services:
  gateway:
    environment:
      - NODE_ENV=production
      - PORT=3000
```

### External file
```yaml
services:
  gateway:
    env_file:
      - ./config/production.env
```

## Health Checks

```yaml
services:
  gateway:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Volumes

### Persistent Data
```yaml
volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local
  uploads:
    driver: local
```

### Mount Configuration
```yaml
services:
  gateway:
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
```

## Networking

### Internal Network
```yaml
networks:
  internal:
    driver: bridge
    internal: true

services:
  mongodb:
    networks:
      - internal

  gateway:
    networks:
      - internal
      - default
```

### External Access
```yaml
services:
  gateway:
    ports:
      - "3000:3000"
```

## Production Considerations

### Resource Limits
```yaml
services:
  gateway:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Restart Policy
```yaml
services:
  gateway:
    restart: unless-stopped
```

### Logging
```yaml
services:
  gateway:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Monitoring Stack

Add monitoring with Prometheus and Grafana:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs quckchat-gateway

# Check status
docker ps -a
```

### Database connection issues
```bash
# Verify MongoDB is running
docker exec quckchat-mongodb mongosh --eval "db.adminCommand('ping')"

# Check network
docker network inspect quckchat-network
```

### Out of memory
```bash
# Check resource usage
docker stats

# Increase limits in docker-compose.yml
```
