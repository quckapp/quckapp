---
sidebar_position: 5
title: WebSocket Architecture
description: Real-time communication with Socket.IO
---

# WebSocket Architecture

QuckChat uses Socket.IO for real-time bidirectional communication, powering instant messaging and WebRTC call signaling.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WEBSOCKET ARCHITECTURE                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Socket.IO Server (Port 3000)                      ││
│  │                                                                      ││
│  │   ┌─────────────────────────┐   ┌─────────────────────────┐        ││
│  │   │   /chat Namespace       │   │  /webrtc Namespace      │        ││
│  │   │                         │   │                         │        ││
│  │   │ • message:send          │   │ • call:initiate         │        ││
│  │   │ • message:new           │   │ • offer/answer          │        ││
│  │   │ • user:typing           │   │ • ice-candidate         │        ││
│  │   │ • user:online/offline   │   │ • call:end              │        ││
│  │   │ • reaction:add          │   │ • participant:*         │        ││
│  │   └─────────────────────────┘   └─────────────────────────┘        ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                    │                                     │
│                         ┌──────────┴──────────┐                         │
│                         ▼                      ▼                         │
│                   ┌──────────┐           ┌──────────┐                   │
│                   │  Redis   │           │ MongoDB  │                   │
│                   │ Pub/Sub  │           │  Store   │                   │
│                   └──────────┘           └──────────┘                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Socket.IO Configuration

### Server Setup

```typescript
// gateway.module.ts
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 10000,
  pingTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB
  perMessageDeflate: false,
  allowEIO3: true,
})
export class ChatGateway {}
```

### Client Connection

```typescript
// React Native client
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
  auth: {
    token: 'Bearer <jwt-token>',
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

## Chat Gateway

### Namespace: `/chat`

#### Connection Lifecycle

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    Client    │         │   Gateway    │         │   MongoDB    │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ ── connect(token) ────▶│                        │
       │                        │ ── verify JWT ────────▶│
       │                        │◀─── user data ─────────│
       │                        │                        │
       │                        │ ── update online ─────▶│
       │                        │                        │
       │◀─── connection ────────│                        │
       │                        │                        │
       │ ── join rooms ────────▶│                        │
       │    (conversations)     │                        │
       │                        │                        │
       │◀─── joined ────────────│                        │
       │                        │                        │
```

#### Event Handlers

```typescript
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  // Connection tracking
  private connectedUsers: Map<string, Socket> = new Map();

  async handleConnection(client: Socket) {
    try {
      // Verify JWT from auth header
      const token = client.handshake.auth.token?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);

      // Store connection
      this.connectedUsers.set(payload.sub, client);

      // Update user status
      await this.usersService.updateStatus(payload.sub, 'online');

      // Join user's conversation rooms
      const conversations = await this.conversationsService.getByUser(payload.sub);
      conversations.forEach(conv => {
        client.join(`conversation:${conv._id}`);
      });

      // Broadcast online status
      this.server.emit('user:online', { userId: payload.sub });

    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.getUserId(client);
    if (userId) {
      this.connectedUsers.delete(userId);
      await this.usersService.updateStatus(userId, 'offline');
      this.server.emit('user:offline', { userId });
    }
  }
}
```

### Chat Events

#### Sending Messages

```typescript
@SubscribeMessage('message:send')
async handleSendMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: SendMessageDto,
) {
  const userId = this.getUserId(client);

  // Create message
  const message = await this.messagesService.create({
    conversationId: data.conversationId,
    senderId: userId,
    content: data.content,
    type: data.type,
    attachments: data.attachments,
    replyTo: data.replyTo,
  });

  // Broadcast to conversation room
  this.server
    .to(`conversation:${data.conversationId}`)
    .emit('message:new', message);

  // Send push notifications to offline users
  this.notifyOfflineParticipants(message);

  return { success: true, message };
}
```

#### Typing Indicators

```typescript
@SubscribeMessage('user:typing')
async handleTyping(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { conversationId: string },
) {
  const userId = this.getUserId(client);

  client
    .to(`conversation:${data.conversationId}`)
    .emit('user:typing', { userId, conversationId: data.conversationId });
}

@SubscribeMessage('user:stop-typing')
async handleStopTyping(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { conversationId: string },
) {
  const userId = this.getUserId(client);

  client
    .to(`conversation:${data.conversationId}`)
    .emit('user:stop-typing', { userId, conversationId: data.conversationId });
}
```

#### Read Receipts

```typescript
@SubscribeMessage('message:read')
async handleMessageRead(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { messageId: string; conversationId: string },
) {
  const userId = this.getUserId(client);

  await this.messagesService.markAsRead(data.messageId, userId);

  this.server
    .to(`conversation:${data.conversationId}`)
    .emit('message:read', {
      messageId: data.messageId,
      userId,
      conversationId: data.conversationId
    });
}
```

#### Reactions

```typescript
@SubscribeMessage('reaction:add')
async handleAddReaction(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { messageId: string; emoji: string; conversationId: string },
) {
  const userId = this.getUserId(client);

  const message = await this.messagesService.addReaction(
    data.messageId,
    userId,
    data.emoji,
  );

  this.server
    .to(`conversation:${data.conversationId}`)
    .emit('reaction:added', {
      messageId: data.messageId,
      emoji: data.emoji,
      userId,
    });
}
```

## WebRTC Gateway

### Namespace: `/webrtc`

#### Call Flow

```
┌─────────────┐                              ┌─────────────┐
│   Caller    │                              │   Callee    │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │ ── call:initiate ─────────────────────────▶│
       │    { calleeId, type }                      │
       │                                            │
       │◀────────────────────── call:incoming ──────│
       │                                            │
       │                     [User answers]         │
       │                                            │
       │◀────────────────────── call:answer ────────│
       │                                            │
       │ ── offer (SDP) ───────────────────────────▶│
       │                                            │
       │◀──────────────────────── answer (SDP) ─────│
       │                                            │
       │ ◀──── ice-candidate ────▶                  │
       │       (multiple)                           │
       │                                            │
       │ ══════════ WebRTC Connection ══════════════│
       │                                            │
       │ ── call:end ──────────────────────────────▶│
       │                                            │
```

#### Event Handlers

```typescript
@WebSocketGateway({ namespace: '/webrtc' })
export class WebRtcGateway {

  // Active calls: callId -> { participants, status }
  private activeCalls: Map<string, CallSession> = new Map();

  @SubscribeMessage('call:initiate')
  async handleInitiateCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { calleeId: string; type: 'audio' | 'video' },
  ) {
    const callerId = this.getUserId(client);

    // Create call record
    const call = await this.callsService.create({
      initiatorId: callerId,
      type: data.type,
      participants: [
        { userId: callerId, status: 'joined' },
        { userId: data.calleeId, status: 'ringing' },
      ],
    });

    // Join call room
    client.join(`call:${call._id}`);

    // Notify callee
    const calleeSocket = this.getSocketByUserId(data.calleeId);
    if (calleeSocket) {
      calleeSocket.emit('call:incoming', {
        callId: call._id,
        callerId,
        callerName: await this.getUserName(callerId),
        type: data.type,
      });
    } else {
      // Send push notification
      await this.sendCallPushNotification(data.calleeId, call);
    }

    return { callId: call._id };
  }

  @SubscribeMessage('call:answer')
  async handleAnswerCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const userId = this.getUserId(client);

    // Update call status
    await this.callsService.updateParticipantStatus(
      data.callId,
      userId,
      'joined'
    );

    // Join call room
    client.join(`call:${data.callId}`);

    // Notify caller
    client.to(`call:${data.callId}`).emit('call:answered', { userId });

    return { success: true };
  }

  @SubscribeMessage('offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; sdp: RTCSessionDescriptionInit },
  ) {
    client.to(`call:${data.callId}`).emit('offer', {
      sdp: data.sdp,
      from: this.getUserId(client),
    });
  }

  @SubscribeMessage('answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; sdp: RTCSessionDescriptionInit },
  ) {
    client.to(`call:${data.callId}`).emit('answer', {
      sdp: data.sdp,
      from: this.getUserId(client),
    });
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; candidate: RTCIceCandidateInit },
  ) {
    client.to(`call:${data.callId}`).emit('ice-candidate', {
      candidate: data.candidate,
      from: this.getUserId(client),
    });
  }

  @SubscribeMessage('call:end')
  async handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const userId = this.getUserId(client);

    await this.callsService.endCall(data.callId);

    this.server.to(`call:${data.callId}`).emit('call:ended', {
      endedBy: userId,
    });

    // Leave room
    client.leave(`call:${data.callId}`);
  }
}
```

## Room Management

### Conversation Rooms

```typescript
// Join conversation room
client.join(`conversation:${conversationId}`);

// Leave conversation room
client.leave(`conversation:${conversationId}`);

// Broadcast to room
this.server
  .to(`conversation:${conversationId}`)
  .emit('message:new', message);
```

### Call Rooms

```typescript
// Join call room
client.join(`call:${callId}`);

// Broadcast to call participants
this.server
  .to(`call:${callId}`)
  .emit('call:participant-joined', { userId });
```

## Event Reference

### Chat Namespace Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | C→S | `{ auth: { token } }` | Connection with JWT |
| `disconnect` | C→S | - | Disconnection |
| `message:send` | C→S | `{ conversationId, content, type }` | Send message |
| `message:new` | S→C | `Message` | New message received |
| `message:edit` | C→S | `{ messageId, content }` | Edit message |
| `message:updated` | S→C | `Message` | Message was edited |
| `message:delete` | C→S | `{ messageId }` | Delete message |
| `message:deleted` | S→C | `{ messageId }` | Message was deleted |
| `message:read` | C→S | `{ messageId, conversationId }` | Mark as read |
| `user:typing` | Both | `{ conversationId }` | Typing indicator |
| `user:stop-typing` | Both | `{ conversationId }` | Stop typing |
| `user:online` | S→C | `{ userId }` | User came online |
| `user:offline` | S→C | `{ userId }` | User went offline |
| `reaction:add` | C→S | `{ messageId, emoji }` | Add reaction |
| `reaction:added` | S→C | `{ messageId, emoji, userId }` | Reaction added |
| `reaction:remove` | C→S | `{ messageId, emoji }` | Remove reaction |

### WebRTC Namespace Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `call:initiate` | C→S | `{ calleeId, type }` | Start call |
| `call:incoming` | S→C | `{ callId, callerId, type }` | Incoming call |
| `call:answer` | C→S | `{ callId }` | Answer call |
| `call:answered` | S→C | `{ userId }` | Call was answered |
| `call:reject` | C→S | `{ callId }` | Reject call |
| `call:rejected` | S→C | `{ userId }` | Call was rejected |
| `call:end` | C→S | `{ callId }` | End call |
| `call:ended` | S→C | `{ endedBy }` | Call ended |
| `offer` | Both | `{ callId, sdp }` | WebRTC offer |
| `answer` | Both | `{ callId, sdp }` | WebRTC answer |
| `ice-candidate` | Both | `{ callId, candidate }` | ICE candidate |
| `mute:audio` | C→S | `{ callId, muted }` | Toggle audio |
| `mute:video` | C→S | `{ callId, muted }` | Toggle video |

## Scaling with Redis

### Redis Adapter

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Benefits
- Multiple server instances
- Shared room state
- Cross-instance broadcasting
