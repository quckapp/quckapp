---
slug: /
sidebar_position: 0
title: Introduction
description: Welcome to QuckChat documentation
---

# QuckChat Documentation

Welcome to the QuckChat backend documentation. QuckChat is a real-time messaging platform with audio/video calling capabilities built on NestJS.

## What is QuckChat?

QuckChat is a production-ready messaging backend that provides:

- **Real-time Messaging** - Instant messaging with WebSocket support
- **Voice & Video Calls** - WebRTC-powered calling
- **Group Chats** - Create and manage group conversations
- **Push Notifications** - Firebase FCM integration
- **File Sharing** - Image, video, audio, and file uploads
- **Microservices Architecture** - Scalable, modular design

## Quick Links

| Section | Description |
|---------|-------------|
| [Quick Start](./getting-started/quick-start) | Get running in 5 minutes |
| [Architecture](./architecture/overview) | System design overview |
| [API Reference](./api-reference/openapi) | OpenAPI specification |
| [Deployment](./deployment/environments) | Environment setup |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│              Mobile (React Native) | Web | Admin                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Port 3000)                       │
│  • REST API  • WebSocket (Chat & WebRTC)  • Rate Limiting        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MICROSERVICES                               │
│  Auth  │  Users  │  Messages  │  Conversations  │  Calls  │  ...│
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  MongoDB  │  Redis  │  AWS S3  │  Kafka/RabbitMQ                │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### Messaging
- Text, image, video, audio messages
- Message reactions
- Reply and forward
- Read receipts
- Typing indicators
- Full-text search

### Calls
- 1:1 voice calls
- 1:1 video calls
- Group calls (huddles)
- WebRTC signaling
- Call history

### Groups
- Group conversations
- Participant management
- Admin controls
- Disappearing messages
- Pinned messages

### Security
- JWT authentication
- 2FA support
- OAuth (Google, Facebook, Apple)
- Rate limiting
- End-to-end encryption ready

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| Database | MongoDB 6 with Mongoose |
| Cache | Redis 7 |
| Queue | BullMQ |
| WebSocket | Socket.IO |
| Auth | Passport.js, JWT |
| Storage | AWS S3 |
| Notifications | Firebase FCM |
| SMS | Twilio |

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Redis 7+ (optional)

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/quckchat-backend.git
cd quckchat-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run start:dev
```

### Verify Installation

```bash
# Health check
curl http://localhost:3000/api/v1/health

# API documentation
open http://localhost:3000/api/docs
```

## Project Structure

```
quckchat-backend/
├── src/
│   ├── common/           # Shared modules
│   │   ├── cache/        # Redis caching
│   │   ├── database/     # MongoDB connection
│   │   ├── guards/       # Auth guards
│   │   ├── logger/       # Pino logging
│   │   └── ...
│   ├── microservices/    # Service implementations
│   │   ├── gateway/      # API Gateway
│   │   ├── auth-service/
│   │   ├── users-service/
│   │   └── ...
│   ├── modules/          # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── messages/
│   │   └── ...
│   └── main.ts           # Application entry
├── docs/                 # This documentation
├── test/                 # Test files
└── docker-compose.yml    # Docker configuration
```

## Support

- [GitHub Issues](https://github.com/your-org/quckchat-backend/issues)
- [API Documentation](http://localhost:3000/api/docs)

## License

MIT License
