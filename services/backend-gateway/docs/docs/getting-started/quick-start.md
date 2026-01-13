---
sidebar_position: 1
title: Quick Start
description: Get QuckChat backend running in 5 minutes
---

# Quick Start Guide

Get the QuckChat backend running locally in just a few minutes.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** 6.0+ (local or Atlas)
- **Redis** 7.0+ (optional, for caching)
- **Git**

## 30-Second Start

```bash
# Clone and install
git clone https://github.com/your-org/quckchat-backend.git
cd quckchat-backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB connection string

# Start development server
npm run start:dev
```

The server will be running at `http://localhost:3000`

## Verify Installation

### API Documentation
Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) for Swagger UI

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" }
  }
}
```

## Start Options

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development with hot reload (monolith) |
| `npm run start:all:dev` | All microservices with hot reload |
| `npm run start:gateway` | API Gateway only |
| `npm run docker:up` | Full stack with Docker |

## Quick API Test

### 1. Send OTP (No Auth Required)
```bash
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

### 2. Verify OTP
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "code": "123456"}'
```

### 3. Use Token
```bash
# Use the token from verify-otp response
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

- [Installation Guide](./installation) - Detailed setup instructions
- [Configuration](./configuration) - Environment variables reference
- [Architecture Overview](../architecture/overview) - Understand the system design
