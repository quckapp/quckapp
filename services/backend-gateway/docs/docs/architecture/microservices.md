---
sidebar_position: 2
title: Microservices Architecture
description: Detailed breakdown of QuckChat microservices
---

# Microservices Architecture

QuckChat uses 9 independent microservices, each responsible for a specific domain.

## Service Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MICROSERVICES TOPOLOGY                           │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     API GATEWAY (Port 3000)                         │ │
│  │         HTTP/REST + WebSocket (Chat & WebRTC Namespaces)            │ │
│  └───────────────────────────────┬────────────────────────────────────┘ │
│                                  │                                       │
│           ┌──────────────────────┼──────────────────────┐               │
│           │                      │                      │               │
│           ▼                      ▼                      ▼               │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐          │
│  │  AUTH SERVICE  │   │ USERS SERVICE  │   │MESSAGES SERVICE│          │
│  │    Port 4001   │   │    Port 4002   │   │    Port 4003   │          │
│  │                │   │                │   │                │          │
│  │ • OTP/SMS      │   │ • Profiles     │   │ • Send/Receive │          │
│  │ • JWT Tokens   │   │ • Contacts     │   │ • Reactions    │          │
│  │ • OAuth        │   │ • Settings     │   │ • Search       │          │
│  │ • 2FA/TOTP     │   │ • Devices      │   │ • Read Receipts│          │
│  │ • Sessions     │   │ • Status       │   │ • Attachments  │          │
│  └────────────────┘   └────────────────┘   └────────────────┘          │
│                                                                          │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐          │
│  │ CONVERSATIONS  │   │ NOTIFICATIONS  │   │ MEDIA SERVICE  │          │
│  │    Port 4004   │   │    Port 4005   │   │    Port 4006   │          │
│  │                │   │                │   │                │          │
│  │ • Create/Join  │   │ • Firebase FCM │   │ • File Upload  │          │
│  │ • Participants │   │ • Email SMTP   │   │ • S3 Storage   │          │
│  │ • Settings     │   │ • SMS Twilio   │   │ • Processing   │          │
│  │ • Archiving    │   │ • In-App       │   │ • Thumbnails   │          │
│  └────────────────┘   └────────────────┘   └────────────────┘          │
│                                                                          │
│  ┌────────────────┐   ┌────────────────┐                                │
│  │ CALLS SERVICE  │   │   ANALYTICS    │                                │
│  │    Port 4007   │   │    Port 4008   │                                │
│  │                │   │                │                                │
│  │ • Voice Calls  │   │ • User Actions │                                │
│  │ • Video Calls  │   │ • Metrics      │                                │
│  │ • WebRTC       │   │ • Reports      │                                │
│  │ • Call History │   │ • Dashboards   │                                │
│  └────────────────┘   └────────────────┘                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Inter-Service Communication

### TCP Transport
Services communicate via NestJS TCP microservice transport.

```typescript
// Gateway calling Auth Service
@Client({ transport: Transport.TCP, options: { host: 'localhost', port: 4001 } })
private authClient: ClientProxy;

async login(dto: LoginDto) {
  return this.authClient.send({ cmd: 'auth.login' }, dto);
}
```

### Message Patterns

| Pattern | Use Case |
|---------|----------|
| `send()` | Request-Response (sync) |
| `emit()` | Fire-and-forget (async) |

## Service Details

### 1. Auth Service (Port 4001)

**Responsibility**: All authentication and authorization

**Schemas**:
- `OtpRecord`: OTP codes with expiry
- `Session`: Active login sessions
- `TwoFactorSecret`: 2FA TOTP secrets

**Key Features**:
- Phone OTP via Twilio Verify
- JWT access/refresh tokens
- OAuth (Google, Facebook, Apple)
- 2FA with backup codes
- Session management

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'auth.sendOtp' })
@MessagePattern({ cmd: 'auth.verifyOtp' })
@MessagePattern({ cmd: 'auth.login' })
@MessagePattern({ cmd: 'auth.refreshToken' })
@MessagePattern({ cmd: 'auth.logout' })
@MessagePattern({ cmd: 'auth.setup2fa' })
```

---

### 2. Users Service (Port 4002)

**Responsibility**: User profiles and contacts

**Schemas**:
- `User`: User profiles
- `UserSettings`: Preferences
- `Contact`: Contact lists

**Key Features**:
- Profile management
- Contact sync
- Device registration
- FCM token management
- Privacy settings

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'users.getProfile' })
@MessagePattern({ cmd: 'users.updateProfile' })
@MessagePattern({ cmd: 'users.getContacts' })
@MessagePattern({ cmd: 'users.syncContacts' })
@MessagePattern({ cmd: 'users.registerDevice' })
```

---

### 3. Messages Service (Port 4003)

**Responsibility**: All messaging operations

**Schemas**:
- `Message`: Messages with attachments, reactions

**Key Features**:
- Text/media messages
- Emoji reactions
- Reply/forward
- Read receipts
- Full-text search
- Scheduled messages

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'messages.send' })
@MessagePattern({ cmd: 'messages.getByConversation' })
@MessagePattern({ cmd: 'messages.edit' })
@MessagePattern({ cmd: 'messages.delete' })
@MessagePattern({ cmd: 'messages.addReaction' })
@MessagePattern({ cmd: 'messages.search' })
```

---

### 4. Conversations Service (Port 4004)

**Responsibility**: Conversation management

**Schemas**:
- `Conversation`: Chat rooms

**Key Features**:
- Private/group chats
- Participant management
- Admin controls
- Disappearing messages
- Pinned messages

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'conversations.create' })
@MessagePattern({ cmd: 'conversations.getByUser' })
@MessagePattern({ cmd: 'conversations.addParticipant' })
@MessagePattern({ cmd: 'conversations.removeParticipant' })
@MessagePattern({ cmd: 'conversations.updateSettings' })
```

---

### 5. Notifications Service (Port 4005)

**Responsibility**: All notification delivery

**Schemas**:
- `Notification`: Notification records

**Channels**:
- Firebase FCM (Push)
- SMTP (Email)
- Twilio (SMS)
- In-App (WebSocket)

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'notifications.send' })
@MessagePattern({ cmd: 'notifications.sendBatch' })
@MessagePattern({ cmd: 'notifications.getByUser' })
@MessagePattern({ cmd: 'notifications.markAsRead' })
```

---

### 6. Media Service (Port 4006)

**Responsibility**: File handling

**Schemas**:
- `Media`: File metadata

**Key Features**:
- Multi-format upload
- S3/local storage
- Image processing
- Thumbnail generation
- Presigned URLs

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'media.upload' })
@MessagePattern({ cmd: 'media.getById' })
@MessagePattern({ cmd: 'media.delete' })
@MessagePattern({ cmd: 'media.generatePresignedUrl' })
```

---

### 7. Calls Service (Port 4007)

**Responsibility**: Voice/video calls

**Schemas**:
- `Call`: Call records
- `CallParticipant`: Participants

**Key Features**:
- WebRTC signaling
- 1:1 and group calls
- Call history
- TURN/STUN support

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'calls.initiate' })
@MessagePattern({ cmd: 'calls.answer' })
@MessagePattern({ cmd: 'calls.reject' })
@MessagePattern({ cmd: 'calls.end' })
@MessagePattern({ cmd: 'calls.getHistory' })
```

---

### 8. Analytics Service (Port 4008)

**Responsibility**: Metrics and analytics

**Schemas**:
- `Analytics`: Event records
- `SystemMetrics`: Performance data

**Key Features**:
- User action tracking
- Performance metrics
- Dashboard data
- Export capabilities

**Message Handlers**:
```typescript
@MessagePattern({ cmd: 'analytics.track' })
@MessagePattern({ cmd: 'analytics.getMetrics' })
@MessagePattern({ cmd: 'analytics.getDashboard' })
@MessagePattern({ cmd: 'analytics.export' })
```

## Service Dependencies

```
┌─────────────┐
│   Gateway   │──────────────────────────────────────────┐
└──────┬──────┘                                          │
       │                                                 │
       ▼                                                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐  ┌─────────────┐
│    Auth     │───▶│    Users    │    │  Messages   │◀─│Conversations│
└─────────────┘    └──────┬──────┘    └──────┬──────┘  └─────────────┘
                          │                  │
                          ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐
                   │Notifications│◀───│    Media    │
                   └─────────────┘    └─────────────┘
                          ▲
                          │
                   ┌──────┴──────┐
                   │    Calls    │
                   └─────────────┘
```

## Running Microservices

### All Services
```bash
npm run start:all:dev
```

### Individual Services
```bash
npm run start:auth:dev
npm run start:users:dev
npm run start:messages:dev
npm run start:conversations:dev
npm run start:notifications:dev
npm run start:media:dev
npm run start:calls:dev
npm run start:analytics:dev
npm run start:gateway:dev
```

### Docker
```bash
npm run docker:up
```

## Configuration

Each service reads from the same `.env` file but uses service-specific ports:

```bash
# Service Ports
AUTH_SERVICE_PORT=4001
USERS_SERVICE_PORT=4002
MESSAGES_SERVICE_PORT=4003
CONVERSATIONS_SERVICE_PORT=4004
NOTIFICATIONS_SERVICE_PORT=4005
MEDIA_SERVICE_PORT=4006
CALLS_SERVICE_PORT=4007
ANALYTICS_SERVICE_PORT=4008
```

## Health Checks

Each service exposes health endpoints:

```bash
# Gateway
curl http://localhost:3000/api/v1/health

# Individual services via Gateway
curl http://localhost:3000/api/v1/health/auth
curl http://localhost:3000/api/v1/health/users
```
