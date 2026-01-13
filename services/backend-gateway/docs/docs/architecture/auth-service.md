---
sidebar_position: 8
title: Auth Service (Spring Boot)
description: Java/Spring Boot authentication microservice
---

# Auth Service (Spring Boot)

QuckChat uses a dedicated **Spring Boot authentication microservice** for enterprise-grade security, separate from the main NestJS backend.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTH SERVICE (Java/Spring Boot)               │
│                          Port: 8081                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   JWT Auth    │  │    OAuth2     │  │     2FA       │       │
│  │   (JJWT)      │  │   (Social)    │  │   (TOTP)      │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   Sessions    │  │  Rate Limit   │  │  Audit Logs   │       │
│  │   (Redis)     │  │   (Redis)     │  │  (Postgres)   │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Runtime** | Java | 21 |
| **Framework** | Spring Boot | 3.2.0 |
| **Build Tool** | Maven | 3.9+ |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **Events** | Apache Kafka | 7.5 |
| **JWT** | JJWT | 0.12.3 |
| **2FA** | TOTP Library | 1.7.1 |
| **Encryption** | Jasypt | 3.0.5 |
| **API Docs** | OpenAPI/Swagger | 2.3.0 |
| **Testing** | TestContainers | Latest |

## API Endpoints

### Base URL

```
/api/auth/v1
```

### Registration & Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Email/password login |
| POST | `/login/2fa` | Complete 2FA login |
| POST | `/logout` | Logout and revoke tokens |

### Token Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/token/refresh` | Refresh access token |
| POST | `/token/validate` | Validate JWT token |
| POST | `/token/revoke` | Revoke specific token |
| POST | `/token/revoke-all` | Revoke all user tokens |

### Password Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/password/forgot` | Request password reset |
| POST | `/password/reset` | Complete password reset |
| POST | `/password/change` | Change password (authenticated) |

### Two-Factor Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/2fa/setup` | Setup 2FA (get QR code) |
| POST | `/2fa/enable` | Enable 2FA after verification |
| POST | `/2fa/disable` | Disable 2FA |
| POST | `/2fa/backup-codes` | Generate backup codes |

### OAuth2 Social Login

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/oauth/{provider}` | Login/register via OAuth |
| POST | `/oauth/{provider}/link` | Link OAuth to account |
| DELETE | `/oauth/{provider}/unlink` | Unlink OAuth provider |

**Supported Providers:** Google, Apple, Facebook, GitHub, Microsoft

### Session Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions` | Get active sessions |
| DELETE | `/sessions/{sessionId}` | Terminate specific session |
| DELETE | `/sessions` | Terminate all other sessions |

## Authentication Flow

### Traditional Login

```
1. User: POST /register
   ├── Email validation
   ├── Password strength check
   └── Account created (ACTIVE status)

2. User: POST /login
   ├── Email/password verification
   ├── IP tracking + geolocation
   ├── Failed attempt tracking
   │
   ├── If 2FA disabled:
   │   └── Return accessToken + refreshToken
   │
   └── If 2FA enabled:
       ├── Return tempToken + requiresTwoFactor flag
       └── User: POST /login/2fa {tempToken, code}
           └── Return accessToken + refreshToken
```

### OAuth2 Flow

```
1. Frontend obtains token from OAuth provider
2. POST /oauth/{provider} {accessToken, idToken}
3. Service validates with provider
4. Create/link account
5. Return accessToken + refreshToken
```

### 2FA Setup

```
1. POST /2fa/setup
   └── Returns secret + QR code (otpauth:// URL)

2. User scans QR in authenticator app

3. POST /2fa/enable {code: "123456"}
   └── Returns 10 backup codes
```

## Token Configuration

| Token Type | Expiration | Storage |
|------------|------------|---------|
| Access Token | 15 minutes | JWT (stateless) |
| Refresh Token | 7 days | PostgreSQL + Redis |
| Password Reset | 1 hour | PostgreSQL |
| Email Verification | 24 hours | PostgreSQL |
| 2FA Temp Token | 1 hour | In JWT claims |

### JWT Claims

```json
{
  "sub": "user-uuid",
  "type": "access",
  "email": "user@example.com",
  "externalId": "nestjs-user-id",
  "twoFactorEnabled": true,
  "iss": "quckchat-auth",
  "exp": 1704067200
}
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `auth_users` | User credentials, 2FA settings |
| `refresh_tokens` | Token storage for revocation |
| `oauth_connections` | OAuth provider links |
| `api_keys` | Service-to-service auth |
| `audit_logs` | Security event tracking |
| `password_reset_tokens` | Password reset flows |
| `email_verification_tokens` | Email verification |
| `auth_user_backup_codes` | 2FA recovery codes |

### auth_users Schema

```sql
CREATE TABLE auth_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  external_id VARCHAR(255),  -- Link to NestJS user
  status VARCHAR(50),        -- ACTIVE, INACTIVE, SUSPENDED
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Security Features

### Password Policy

- Minimum 8 characters
- Requires: uppercase, lowercase, digit, special character
- Maximum age: 90 days
- Force password change flag

### Brute Force Protection

```yaml
Rate Limiting:
  Login: 5 attempts per 5 minutes
  Block Duration: 15 minutes
  Storage: Redis
```

### Session Management

- Max 5 concurrent sessions per user
- 30-minute session timeout
- Device tracking (device_id, user_agent, IP)
- Remote session termination

### Audit Logging

19 event types tracked:

| Event | Description |
|-------|-------------|
| `LOGIN_SUCCESS` | Successful login |
| `LOGIN_FAILURE` | Failed login attempt |
| `LOGOUT` | User logout |
| `PASSWORD_CHANGE` | Password changed |
| `PASSWORD_RESET_REQUEST` | Reset requested |
| `PASSWORD_RESET_COMPLETE` | Reset completed |
| `2FA_ENABLED` | 2FA activated |
| `2FA_DISABLED` | 2FA deactivated |
| `2FA_FAILURE` | Wrong 2FA code |
| `OAUTH_LINK` | OAuth account linked |
| `OAUTH_UNLINK` | OAuth account unlinked |
| `SESSION_CREATED` | New session |
| `SESSION_TERMINATED` | Session ended |
| `TOKEN_REFRESH` | Token refreshed |
| `TOKEN_REVOKE` | Token revoked |
| `API_KEY_CREATED` | API key generated |
| `API_KEY_REVOKED` | API key revoked |
| `ACCOUNT_LOCKED` | Account locked |
| `ACCOUNT_UNLOCKED` | Account unlocked |

### Encryption

- Algorithm: AES/GCM/NoPadding
- Key: 32+ characters (configurable)
- Used for: sensitive token storage, API keys

## Configuration

### application.yml

```yaml
server:
  port: 8081
  servlet:
    context-path: /api/auth

spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5

  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT}
      timeout: 10s

  kafka:
    bootstrap-servers: ${KAFKA_BROKERS}
    consumer:
      group-id: auth-service

jwt:
  secret: ${JWT_SECRET}  # 256-bit minimum
  access-token-expiration: 900000   # 15 minutes
  refresh-token-expiration: 604800000  # 7 days
  issuer: quckchat-auth

security:
  rate-limit:
    enabled: true
  session:
    max-per-user: 5
    timeout: 30m
  password:
    min-length: 8
    max-age-days: 90
  two-factor:
    enabled: true
    digits: 6
    time-step: 30

oauth2:
  providers:
    google:
      client-id: ${GOOGLE_CLIENT_ID}
      client-secret: ${GOOGLE_CLIENT_SECRET}
    apple:
      client-id: ${APPLE_CLIENT_ID}
      client-secret: ${APPLE_CLIENT_SECRET}
    facebook:
      client-id: ${FACEBOOK_CLIENT_ID}
      client-secret: ${FACEBOOK_CLIENT_SECRET}
```

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quckchat_auth
DB_USERNAME=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Security
JWT_SECRET=your-256-bit-secret-key-minimum-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key

# OAuth Providers
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
APPLE_CLIENT_ID=xxx
APPLE_CLIENT_SECRET=xxx
FACEBOOK_CLIENT_ID=xxx
FACEBOOK_CLIENT_SECRET=xxx

# Service-to-Service
NESTJS_API_KEY=qc_live_xxx
ELIXIR_API_KEY=qc_live_xxx
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser
USER appuser
EXPOSE 8081
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8081/api/auth/actuator/health
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Docker Compose

```yaml
services:
  auth-service:
    build: .
    ports:
      - "8081:8081"
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - postgres
      - redis
      - kafka

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: quckchat_auth
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
```

## Integration with NestJS Backend

The auth-service communicates with the NestJS backend via:

1. **API Key Authentication** - Service-to-service calls
2. **Token Validation** - NestJS validates JWT with auth-service
3. **User Sync** - `external_id` links auth user to NestJS user

```typescript
// NestJS calling auth-service
const response = await axios.post(
  'http://auth-service:8081/api/auth/v1/token/validate',
  { token },
  { headers: { 'X-API-Key': process.env.AUTH_SERVICE_API_KEY } }
);
```

## API Documentation

Swagger UI available at:

```
http://localhost:8081/api/auth/swagger-ui.html
```

OpenAPI spec at:

```
http://localhost:8081/api/auth/v3/api-docs
```

## Monitoring

### Actuator Endpoints

```
GET /api/auth/actuator/health
GET /api/auth/actuator/info
GET /api/auth/actuator/metrics
GET /api/auth/actuator/prometheus
```

### Key Metrics

- `auth.login.success` - Successful logins
- `auth.login.failure` - Failed logins
- `auth.token.refresh` - Token refreshes
- `auth.2fa.attempts` - 2FA verification attempts
- `auth.session.active` - Active session count
