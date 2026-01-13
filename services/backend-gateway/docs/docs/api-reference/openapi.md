---
sidebar_position: 1
title: OpenAPI Specification
description: OpenAPI/Swagger specification for QuckChat API
---

# OpenAPI Specification

QuckChat provides a complete OpenAPI 3.0 specification for all REST API endpoints.

## Live Documentation

When running the backend, Swagger UI is available at:

```
http://localhost:3000/api/docs
```

Features:
- Interactive API testing
- Request/response examples
- Authentication support
- Try-it-out functionality

## Download Specification

### YAML Format
[Download OpenAPI YAML](/openapi/quckchat-api.yaml)

### Using the Specification

#### Import into Postman
1. Open Postman
2. Click **Import**
3. Select **Link** or **File**
4. Import the OpenAPI YAML file
5. Postman will generate a collection automatically

#### Generate Client SDKs
```bash
# Using OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate \
  -i quckchat-api.yaml \
  -g typescript-axios \
  -o ./generated/typescript-client

# Generate Python client
openapi-generator-cli generate \
  -i quckchat-api.yaml \
  -g python \
  -o ./generated/python-client

# Generate Dart client (for Flutter)
openapi-generator-cli generate \
  -i quckchat-api.yaml \
  -g dart \
  -o ./generated/dart-client
```

## API Overview

### Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production | `https://api.quckchat.com/api/v1` |

### Authentication

Most endpoints require JWT authentication:

```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Default | 100 req/min |
| Auth endpoints | 10 req/min |
| OTP requests | 3 req/min |
| File uploads | 10 req/min |

### Response Format

#### Success Response
```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalDocs": 100
  }
}
```

#### Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Endpoint Categories

### Auth (`/auth`)
- Send/verify OTP
- JWT token management
- 2FA setup and verification
- Session management
- OAuth integration

### Users (`/users`)
- Profile management
- User search
- Contact management
- Device management

### Conversations (`/conversations`)
- Create/manage conversations
- Participant management
- Group settings

### Messages (`/messages`)
- Send/receive messages
- Reactions
- Search
- Read receipts

### Calls (`/calls`)
- Initiate calls
- Answer/reject
- Call history

### Upload (`/upload`)
- Image upload
- Video upload
- Audio upload
- File upload

### Health (`/health`)
- Health check
- Service status

## WebSocket Endpoints

WebSocket connections use Socket.IO:

### Chat Namespace
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'Bearer YOUR_JWT_TOKEN' }
});
```

### WebRTC Namespace
```javascript
const socket = io('http://localhost:3000/webrtc', {
  auth: { token: 'Bearer YOUR_JWT_TOKEN' }
});
```

See [WebSocket Architecture](../architecture/websockets) for event documentation.

## Schema Definitions

### User
```yaml
User:
  type: object
  properties:
    _id: string
    phoneNumber: string
    email: string
    username: string
    displayName: string
    avatar: string
    status: enum[online, offline, away, busy]
    isVerified: boolean
```

### Conversation
```yaml
Conversation:
  type: object
  properties:
    _id: string
    type: enum[single, group]
    name: string
    participants: User[]
    lastMessage: Message
    unreadCount: integer
```

### Message
```yaml
Message:
  type: object
  properties:
    _id: string
    conversationId: string
    senderId: User
    type: enum[text, image, video, audio, file]
    content: string
    attachments: Attachment[]
    reactions: Reaction[]
    isEdited: boolean
```

See the full specification for complete schema definitions.
