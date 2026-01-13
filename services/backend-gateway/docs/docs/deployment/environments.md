---
sidebar_position: 1
title: Environments
description: Development, staging, and production environment setup
---

# Environment Configuration

QuckChat supports multiple deployment environments with environment-specific configurations.

## Environment Overview

| Environment | Purpose | Database | Features |
|-------------|---------|----------|----------|
| Development | Local development | Local MongoDB | Hot reload, debug logging |
| Test | Automated testing | In-memory MongoDB | Isolated, fast |
| Staging | Pre-production testing | Cloud MongoDB | Production-like |
| Production | Live system | Cloud MongoDB Atlas | Full security, monitoring |

## Development Environment

### Quick Setup

```bash
# Copy example environment
cp .env.example .env

# Start development server
npm run start:dev
```

### Minimal Configuration

```bash
# .env - Development minimum
NODE_ENV=development
PORT=3000
MONGODB_URI_DEV=mongodb://localhost:27017/quckchat-dev
JWT_SECRET=dev-secret-key-at-least-32-characters-long
```

### Full Development Config

```bash
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
BASE_URL=http://localhost:3000

# Database
MONGODB_URI_DEV=mongodb://localhost:27017/quckchat-dev

# Auth
JWT_SECRET=dev-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=dev-refresh-secret-key-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# Disable external services in dev
USE_REDIS_IN_DEV=false
STORAGE_MODE=local
SENTRY_ENABLE_DEV=false

# Logging
LOG_LEVEL=debug
LOG_PRETTY_PRINT=true
```

### Local Services

```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:6

# Start Redis (optional)
docker run -d -p 6379:6379 --name redis redis:7

# Start all with docker-compose
npm run docker:infra
```

## Test Environment

### Configuration

```bash
# .env.test
NODE_ENV=test
PORT=3001
MONGODB_URI=mongodb://localhost:27017/quckchat-test
JWT_SECRET=test-secret-key-for-testing
LOG_LEVEL=error
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# With coverage
npm run test:cov

# CI environment
npm run test:ci
```

### In-Memory MongoDB

Tests use `mongodb-memory-server` for isolated testing:

```typescript
// test/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
});

afterAll(async () => {
  await mongod.stop();
});
```

## Staging Environment

### Configuration

```bash
NODE_ENV=staging
PORT=3000
API_PREFIX=api/v1
BASE_URL=https://staging.quckchat.com

# Cloud Database
MONGODB_URI_PROD=mongodb+srv://user:pass@staging-cluster.mongodb.net/quckchat-staging

# Auth (use staging secrets)
JWT_SECRET=staging-secret-key-different-from-prod
JWT_REFRESH_SECRET=staging-refresh-secret-key

# Redis
REDIS_HOST=staging-redis.internal
REDIS_PORT=6379

# Storage
STORAGE_MODE=s3
AWS_S3_BUCKET=quckchat-staging-uploads

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/staging-project
LOG_LEVEL=info
```

### Staging Deployment

```bash
# Railway staging
railway up --environment staging

# Docker staging
docker-compose -f docker-compose.staging.yml up -d
```

## Production Environment

### Configuration

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
BASE_URL=https://api.quckchat.com

# Database (Atlas)
MONGODB_URI_PROD=mongodb+srv://prod-user:secure-password@prod-cluster.mongodb.net/quckchat

# Auth (strong secrets)
JWT_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>
ENCRYPTION_KEY=<32-character-random-string>

# Redis
REDIS_HOST=prod-redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>

# Storage
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=quckchat-prod-uploads

# Firebase (Production)
FIREBASE_PROJECT_ID_PROD=quckchat-prod
FIREBASE_PRIVATE_KEY_PROD="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL_PROD=firebase-adminsdk@quckchat-prod.iam.gserviceaccount.com

# Twilio (Production)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/production-project
LOG_LEVEL=info
DD_TRACE_ENABLED=true
```

### Security Checklist

- [ ] Strong JWT secrets (64+ characters)
- [ ] HTTPS only
- [ ] Database authentication enabled
- [ ] Redis password set
- [ ] Rate limiting configured
- [ ] CORS origins restricted
- [ ] Sentry configured
- [ ] Backup strategy in place

## Environment Variables by Category

### Required for All Environments

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment name |
| `PORT` | Server port |
| `MONGODB_URI_*` | Database connection |
| `JWT_SECRET` | Token signing key |

### Required for Production

| Variable | Description |
|----------|-------------|
| `JWT_REFRESH_SECRET` | Refresh token key |
| `FIREBASE_*_PROD` | Push notifications |
| `TWILIO_*` | SMS/OTP |
| `AWS_*` | File storage |
| `REDIS_*` | Caching |
| `SENTRY_DSN` | Error tracking |

### Optional Enhancements

| Variable | Description |
|----------|-------------|
| `CONSUL_*` | Service discovery |
| `VAULT_*` | Secrets management |
| `DD_*` | Datadog APM |
| `OTEL_*` | OpenTelemetry |
| `KAFKA_*` | Event streaming |
| `RABBITMQ_*` | Message queue |

## Secrets Management

### Development
Use `.env` file (gitignored)

### Production Options

#### Environment Variables
```bash
# Set in hosting platform (Railway, Heroku, etc.)
railway variables set JWT_SECRET=xxx
```

#### HashiCorp Vault
```bash
# Vault configuration
VAULT_ADDR=https://vault.internal:8200
VAULT_ROLE_ID=xxx
VAULT_SECRET_ID=xxx
```

#### AWS Secrets Manager
```bash
# In application code
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
const client = new SecretsManager({ region: 'us-east-1' });
const secret = await client.getSecretValue({ SecretId: 'quckchat/prod' });
```

## Feature Flags by Environment

| Feature | Dev | Test | Staging | Prod |
|---------|-----|------|---------|------|
| Debug Logging | Yes | No | No | No |
| Pretty Logs | Yes | No | No | No |
| Redis Cache | No | No | Yes | Yes |
| Rate Limiting | Soft | No | Yes | Yes |
| Sentry | No | No | Yes | Yes |
| 2FA | Optional | No | Yes | Yes |
| Email Verification | No | No | Yes | Yes |

## Health Checks

### Development
```bash
curl http://localhost:3000/api/v1/health
```

### Production
```bash
curl https://api.quckchat.com/api/v1/health
```

### Expected Response
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```
