---
sidebar_position: 3
title: Configuration
description: Environment variables and configuration reference
---

# Configuration Reference

Complete reference for all environment variables used by QuckChat backend.

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Local development |
| `.env.production` | Production settings |
| `.env.test` | Test environment |
| `.env.example` | Template with all variables |

## Core Settings

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment: development, production, test |
| `PORT` | No | `3000` | HTTP server port |
| `API_PREFIX` | No | `api/v1` | API route prefix |
| `BASE_URL` | No | `http://localhost:3000` | Base URL for file uploads |

```bash
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
BASE_URL=http://localhost:3000
```

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI_DEV` | Yes (dev) | - | Development MongoDB URI |
| `MONGODB_URI_PROD` | Yes (prod) | - | Production MongoDB URI |
| `MONGODB_URI` | No | - | Fallback URI |

```bash
MONGODB_URI_DEV=mongodb://localhost:27017/quckchat-dev
MONGODB_URI_PROD=mongodb+srv://user:pass@cluster.mongodb.net/quckchat
```

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret (32+ chars) |
| `JWT_EXPIRES_IN` | No | `7d` | Access token expiry |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token expiry |
| `ENCRYPTION_KEY` | No | - | Field encryption key (32 chars) |

```bash
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_KEY=32-character-encryption-key-here
```

## External Services

### Firebase (Push Notifications)

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID_DEV` | Yes (dev) | Firebase project ID |
| `FIREBASE_PRIVATE_KEY_DEV` | Yes (dev) | Service account private key |
| `FIREBASE_CLIENT_EMAIL_DEV` | Yes (dev) | Service account email |
| `FIREBASE_PROJECT_ID_PROD` | Yes (prod) | Production project ID |
| `FIREBASE_PRIVATE_KEY_PROD` | Yes (prod) | Production private key |
| `FIREBASE_CLIENT_EMAIL_PROD` | Yes (prod) | Production email |

```bash
FIREBASE_PROJECT_ID_DEV=your-project-id
FIREBASE_PRIVATE_KEY_DEV="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL_DEV=firebase-adminsdk@project.iam.gserviceaccount.com
```

### Twilio (SMS/OTP)

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | Account SID (starts with AC) |
| `TWILIO_AUTH_TOKEN` | Yes | Auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Yes | Verify service SID (starts with VA) |
| `TWILIO_PHONE_NUMBER` | No | Fallback phone number |

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### AWS S3 (File Storage)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | Cond. | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Cond. | - | AWS secret key |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `AWS_S3_BUCKET` | Cond. | - | S3 bucket name |
| `AWS_S3_ENDPOINT` | No | - | Custom endpoint (MinIO) |
| `STORAGE_MODE` | No | `local` | Storage mode: local, s3 |

```bash
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=quckchat-uploads
```

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `REDIS_DB` | No | `0` | Redis database |
| `USE_REDIS_IN_DEV` | No | `false` | Enable Redis in dev |
| `CACHE_TTL` | No | `300` | Cache TTL in seconds |

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
USE_REDIS_IN_DEV=false
CACHE_TTL=300
```

### Email (SMTP)

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Cond. | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (587) |
| `SMTP_USER` | Cond. | SMTP username |
| `SMTP_PASS` | Cond. | SMTP password |
| `SMTP_FROM` | No | Sender email address |

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=QuckChat <noreply@quckchat.com>
```

## Message Brokers

### Kafka

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAFKA_BROKERS` | No | `localhost:9092` | Kafka broker addresses |
| `KAFKA_CLIENT_ID` | No | `quckchat-backend` | Client identifier |
| `KAFKA_SSL` | No | `false` | Enable SSL |
| `KAFKA_SASL_MECHANISM` | No | `plain` | SASL mechanism |
| `KAFKA_SASL_USERNAME` | No | - | SASL username |
| `KAFKA_SASL_PASSWORD` | No | - | SASL password |

### RabbitMQ

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RABBITMQ_HOST` | No | `localhost` | RabbitMQ host |
| `RABBITMQ_PORT` | No | `5672` | RabbitMQ port |
| `RABBITMQ_USERNAME` | No | `guest` | Username |
| `RABBITMQ_PASSWORD` | No | `guest` | Password |
| `RABBITMQ_VHOST` | No | `/` | Virtual host |

## Security

### CORS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGIN` | No | `*` | Allowed origins (comma-separated) |

```bash
CORS_ORIGIN=http://localhost:19006,http://localhost:8081
```

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `THROTTLE_TTL` | No | `60` | Time window (seconds) |
| `THROTTLE_LIMIT` | No | `100` | Max requests per window |
| `RATE_LIMIT_USE_REDIS` | No | `true` | Use Redis for rate limiting |

### CSRF Protection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CSRF_COOKIE_NAME` | No | `XSRF-TOKEN` | CSRF cookie name |
| `CSRF_HEADER_NAME` | No | `X-XSRF-TOKEN` | CSRF header name |
| `CSRF_TOKEN_EXPIRY` | No | `3600` | Token expiry (seconds) |

## WebRTC

| Variable | Required | Description |
|----------|----------|-------------|
| `TURN_SERVER_URL` | No | TURN server URL |
| `TURN_USERNAME` | No | TURN username |
| `TURN_CREDENTIAL` | No | TURN credential |
| `STUN_SERVER_URL` | No | STUN server URL |

```bash
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_CREDENTIAL=credential
STUN_SERVER_URL=stun:stun.l.google.com:19302
```

## Monitoring

### Sentry

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | - | Sentry DSN |
| `SENTRY_ENABLE_DEV` | No | `false` | Enable in development |
| `APP_VERSION` | No | `1.0.0` | Application version |

### OpenTelemetry

| Variable | Required | Description |
|----------|----------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | OTLP collector endpoint |
| `OTEL_SERVICE_NAME` | No | Service name for traces |

### Datadog

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DD_TRACE_ENABLED` | No | `false` | Enable Datadog tracing |
| `DD_SERVICE` | No | `quckchat-backend` | Service name |
| `DD_ENV` | No | `development` | Environment |

## Service Discovery

### Consul

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONSUL_HOST` | No | `localhost` | Consul host |
| `CONSUL_PORT` | No | `8500` | Consul port |
| `CONSUL_TOKEN` | No | - | ACL token |

### Vault

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_ADDR` | No | `http://127.0.0.1:8200` | Vault address |
| `VAULT_TOKEN` | No | - | Vault token |
| `VAULT_ROLE_ID` | No | - | AppRole role ID |
| `VAULT_SECRET_ID` | No | - | AppRole secret ID |

## Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Log level: fatal, error, warn, info, debug, trace |
| `SERVICE_NAME` | No | `quckchat-backend` | Service identifier |
| `LOG_PRETTY_PRINT` | No | `true` | Pretty print logs (dev) |

## Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USE_SPRING_AUTH` | No | `false` | Use Spring Boot auth service |
| `MONGOOSE_SOFT_DELETE` | No | `true` | Enable soft deletes |

## Environment Examples

### Development
```bash
NODE_ENV=development
PORT=3000
MONGODB_URI_DEV=mongodb://localhost:27017/quckchat-dev
JWT_SECRET=dev-secret-key-32-chars-minimum
USE_REDIS_IN_DEV=false
LOG_LEVEL=debug
```

### Production
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI_PROD=mongodb+srv://user:pass@cluster.mongodb.net/quckchat
JWT_SECRET=production-ultra-secure-key-here
REDIS_HOST=redis.internal
STORAGE_MODE=s3
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
```

### Testing
```bash
NODE_ENV=test
PORT=3001
MONGODB_URI=mongodb://localhost:27017/quckchat-test
JWT_SECRET=test-secret-key-for-testing
```
