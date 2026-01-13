---
sidebar_position: 2
title: Installation
description: Complete installation guide for QuckChat backend
---

# Installation Guide

This guide covers the complete installation process for both development and production environments.

## System Requirements

### Minimum Requirements
- CPU: 2 cores
- RAM: 4GB
- Storage: 10GB
- Node.js: 18.x LTS

### Recommended (Production)
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Node.js: 20.x LTS

## Dependencies

### Required Services
| Service | Version | Purpose |
|---------|---------|---------|
| MongoDB | 6.0+ | Primary database |
| Node.js | 18+ | Runtime |

### Optional Services
| Service | Version | Purpose |
|---------|---------|---------|
| Redis | 7.0+ | Caching & queues |
| Kafka | 3.0+ | Event streaming |
| RabbitMQ | 3.12+ | Message queue |

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-org/quckchat-backend.git
cd quckchat-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Essential settings
NODE_ENV=development
PORT=3000
MONGODB_URI_DEV=mongodb://localhost:27017/quckchat-dev
JWT_SECRET=your-secure-secret-key-min-32-chars
```

### 4. Database Setup

#### Local MongoDB
```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb

# Windows (via MSI installer or Docker)
docker run -d -p 27017:27017 --name mongodb mongo:6
```

#### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `.env`:
```bash
MONGODB_URI_PROD=mongodb+srv://user:pass@cluster.mongodb.net/quckchat
```

### 5. Start Development Server

```bash
npm run start:dev
```

## Docker Installation

### Using Docker Compose

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Docker Compose Services

The `docker-compose.microservices.yml` includes:
- MongoDB
- Redis
- API Gateway
- All microservices

## Microservices Mode

To run as microservices:

```bash
# Start infrastructure
npm run docker:infra

# Start all services
npm run start:all:dev
```

### Individual Services

```bash
# Start specific services
npm run start:gateway:dev    # Port 3000
npm run start:auth:dev       # Port 4001
npm run start:users:dev      # Port 4002
npm run start:messages:dev   # Port 4003
npm run start:conversations:dev  # Port 4004
npm run start:notifications:dev  # Port 4005
npm run start:media:dev      # Port 4006
npm run start:calls:dev      # Port 4007
npm run start:analytics:dev  # Port 4008
```

## Verification

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### API Documentation
Open: http://localhost:3000/api/docs

### Database Connection
Check logs for:
```
[Database] MongoDB connected successfully
```

## Troubleshooting

### Port Already in Use
```bash
# Find process
lsof -i :3000
# Or on Windows
netstat -ano | findstr :3000

# Kill process
kill -9 <PID>
```

### MongoDB Connection Failed
1. Verify MongoDB is running
2. Check connection string
3. Ensure network access (Atlas whitelist)

### Permission Errors
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## Next Steps

- [Configuration Reference](./configuration)
- [Architecture Overview](../architecture/overview)
- [API Reference](../api-reference/openapi)
