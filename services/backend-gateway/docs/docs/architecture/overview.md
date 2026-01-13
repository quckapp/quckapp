---
sidebar_position: 1
title: Architecture Overview
description: High-level architecture of QuckChat backend
---

# Architecture Overview

QuckChat is built on a **microservices architecture** with an **API Gateway pattern**, designed for scalability, resilience, and maintainability.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│              Mobile (React Native) | Web | Admin Dashboard               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Port 3000)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ JWT Auth    │ │ Rate Limit  │ │ Request     │ │ Load Balancing  │   │
│  │ Middleware  │ │ Throttler   │ │ Validation  │ │ & Routing       │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    WebSocket Gateways                            │   │
│  │              /chat (messaging) | /webrtc (calls)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ TCP/gRPC
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          MICROSERVICES LAYER                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│ │   Auth   │ │  Users   │ │ Messages │ │Conversa- │ │ Notifications│   │
│ │  :4001   │ │  :4002   │ │  :4003   │ │  tions   │ │    :4005     │   │
│ │          │ │          │ │          │ │  :4004   │ │              │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                                  │
│ │  Media   │ │  Calls   │ │Analytics │                                  │
│ │  :4006   │ │  :4007   │ │  :4008   │                                  │
│ └──────────┘ └──────────┘ └──────────┘                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA & MESSAGING LAYER                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │   MongoDB    │ │    Redis     │ │    Kafka     │ │   RabbitMQ   │    │
│ │  (Primary)   │ │   (Cache)    │ │  (Events)    │ │   (Queue)    │    │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES & STORAGE                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │   AWS S3     │ │   Firebase   │ │   Twilio     │ │   OpenAI     │    │
│ │  (Storage)   │ │    (FCM)     │ │  (SMS/OTP)   │ │   (AI/ML)    │    │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │    Consul    │ │    Vault     │ │   Sentry     │ │   Datadog    │    │
│ │  (Discovery) │ │  (Secrets)   │ │  (Errors)    │ │ (Monitoring) │    │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | 10.3.0 | Full-stack TypeScript framework |
| **TypeScript** | 5.3.3 | Type-safe development |
| **Node.js** | 20.x | Runtime environment |

### Database & Caching

| Technology | Version | Purpose |
|------------|---------|---------|
| **MongoDB** | 7.0 | Primary NoSQL database |
| **Mongoose** | 8.0.3 | MongoDB ODM with plugins |
| **Redis** | 7.x | Caching, sessions, pub/sub |
| **ioredis** | 5.8.2 | Redis client |

### Message Brokers

| Technology | Purpose |
|------------|---------|
| **Apache Kafka** | Event streaming between services |
| **RabbitMQ** | Reliable message queuing (AMQP) |
| **BullMQ** | Job queue based on Redis |

### Real-Time Communication

| Technology | Purpose |
|------------|---------|
| **Socket.IO** | WebSocket for real-time messaging |
| **WebRTC** | Peer-to-peer voice/video calls |
| **TURN/STUN** | Network traversal for calls |

### Authentication

| Technology | Purpose |
|------------|---------|
| **Passport.js** | Authentication strategies |
| **JWT** | Access/refresh tokens |
| **OAuth 2.0** | Google, Facebook, Apple sign-in |
| **TOTP** | Two-factor authentication |
| **Twilio Verify** | SMS OTP verification |

### Cloud Storage

| Technology | Purpose |
|------------|---------|
| **AWS S3** | File uploads & storage |
| **Google Cloud Storage** | Backups |
| **Local Storage** | Development fallback |

### AI & Machine Learning

| Technology | Purpose |
|------------|---------|
| **OpenAI** | AI-powered search & transcription |

### Monitoring & Observability

| Technology | Purpose |
|------------|---------|
| **Sentry** | Error tracking & reporting |
| **OpenTelemetry** | Distributed tracing |
| **Jaeger** | Trace visualization |
| **Prometheus** | Metrics collection |
| **New Relic** | APM monitoring |
| **Datadog** | Infrastructure monitoring |
| **Pino/Winston** | Structured logging |

### Service Discovery & Secrets

| Technology | Purpose |
|------------|---------|
| **Consul** | Service discovery & health checks |
| **HashiCorp Vault** | Secrets management |

### Communication Services

| Technology | Purpose |
|------------|---------|
| **Firebase FCM** | Push notifications |
| **Twilio** | SMS/OTP delivery |
| **Expo SDK** | Expo push notifications |
| **Nodemailer** | Email (SMTP) |

### Security

| Technology | Purpose |
|------------|---------|
| **Helmet** | HTTP security headers |
| **Casbin** | RBAC/ABAC authorization |
| **Bcrypt** | Password hashing |
| **CryptoJS** | Field encryption |

## Feature Modules (29 Total)

QuckChat has 29 feature modules organized by domain:

### Core Modules

| Module | Purpose |
|--------|---------|
| **auth** | JWT, OAuth, 2FA, sessions |
| **users** | Profiles, contacts, devices, settings |
| **conversations** | Chat rooms, participants |
| **messages** | Messaging, reactions, search |
| **notifications** | Push, email, SMS notifications |
| **calls** | Voice/video calls, WebRTC |
| **media** | Media processing, thumbnails |
| **upload** | File uploads (S3/local) |

### Social Modules

| Module | Purpose |
|--------|---------|
| **communities** | Group communities |
| **broadcast** | Broadcast messaging |
| **status** | User stories (like WhatsApp Status) |
| **polls** | Poll creation and voting |
| **starred** | Favorite/starred messages |

### Content Modules

| Module | Purpose |
|--------|---------|
| **stickers** | Sticker packs |
| **gifs** | GIF integration (GIPHY) |
| **link-preview** | URL previews |
| **transcription** | Speech-to-text |

### Utility Modules

| Module | Purpose |
|--------|---------|
| **scheduled-messages** | Delayed message delivery |
| **scheduler** | Task scheduling |
| **huddle** | Group conference calls |
| **archive** | Message archiving (ZIP) |
| **export** | Data export |
| **pdf** | PDF generation |
| **csv** | CSV import/export |
| **xml** | XML parsing |
| **backup** | Google Cloud backups |

### Admin Modules

| Module | Purpose |
|--------|---------|
| **admin** | Broadcast, audit logs, reports, metrics |
| **analytics** | User analytics, usage tracking |
| **health** | Health check endpoints |

## Architecture Patterns

| Pattern | Usage |
|---------|-------|
| **Microservices** | 9 independent services |
| **API Gateway** | Single entry point |
| **Repository** | Data access abstraction |
| **CQRS** | Command/Query separation |
| **Event Sourcing** | Kafka event streaming |
| **Circuit Breaker** | Fault tolerance |
| **Observer** | Real-time notifications |
| **Factory** | Service instantiation |
| **Strategy** | Multiple auth methods |
| **Singleton** | Global services |

## Communication Patterns

### Synchronous

- REST API calls via Gateway
- TCP communication between services
- gRPC for high-performance calls

### Asynchronous

- Kafka for event streaming
- RabbitMQ for job queues
- Redis Pub/Sub for real-time updates
- BullMQ for background jobs

## Security Layers

```
┌─────────────────────────────────────────────────┐
│                 Security Layers                  │
├─────────────────────────────────────────────────┤
│  Layer 1: Network (Firewall, VPC)               │
├─────────────────────────────────────────────────┤
│  Layer 2: Transport (HTTPS/TLS)                 │
├─────────────────────────────────────────────────┤
│  Layer 3: Application (JWT, Rate Limiting)      │
├─────────────────────────────────────────────────┤
│  Layer 4: Authorization (Casbin RBAC/ABAC)      │
├─────────────────────────────────────────────────┤
│  Layer 5: Data (Field Encryption, Bcrypt)       │
└─────────────────────────────────────────────────┘
```

## Deployment Modes

### Monolith Mode

All modules in single process (development).

```bash
npm run start:dev
```

### Microservices Mode

Each service as separate process.

```bash
npm run start:all:dev
```

### Docker Mode

Containerized deployment.

```bash
npm run docker:up
```

## Service Ports

| Service | Port |
|---------|------|
| API Gateway | 3000 |
| Auth Service | 4001 |
| Users Service | 4002 |
| Messages Service | 4003 |
| Conversations Service | 4004 |
| Notifications Service | 4005 |
| Media Service | 4006 |
| Calls Service | 4007 |
| Analytics Service | 4008 |

## Infrastructure Ports

| Service | Port |
|---------|------|
| MongoDB | 27017 |
| Redis | 6379 |
| Kafka | 9092 |
| RabbitMQ | 5672 |
| Consul | 8500 |
| Vault | 8200 |

## Next Steps

- [Microservices Details](./microservices)
- [API Gateway](./gateway)
- [Database Schema](./database)
- [WebSocket Events](./websockets)
- [Security](./security)
- [Algorithms & Patterns](./algorithms-patterns)
