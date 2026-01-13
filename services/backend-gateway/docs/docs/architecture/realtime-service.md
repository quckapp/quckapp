---
sidebar_position: 9
title: Realtime Service (Elixir)
description: Elixir/Phoenix real-time communication server
---

# Realtime Service (Elixir/Phoenix)

QuckChat uses a dedicated **Elixir/Phoenix real-time server** designed for massive concurrency (500K+ connections) with sub-millisecond latency.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│               REALTIME SERVICE (Elixir/Phoenix)                  │
│                          Port: 4000                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Chat Channel  │  │ WebRTC Channel│  │Huddle Channel │       │
│  │  (Messaging)  │  │   (Calls)     │  │ (Group Rooms) │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  Presence     │  │ Store & Fwd   │  │    Kafka      │       │
│  │  (Online)     │  │   (Queue)     │  │   (Events)    │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Runtime** | Elixir | 1.15 |
| **VM** | Erlang/OTP | 26 |
| **Framework** | Phoenix | 1.7.10 |
| **PubSub** | Phoenix.PubSub | 2.1 |
| **Database** | MongoDB Atlas | 7.0 |
| **Queue DB** | MySQL | 8 |
| **Cache** | Redis | 7 |
| **Events** | Apache Kafka | 7.5 |
| **JWT** | Guardian | 2.3 |
| **Metrics** | Prometheus | Latest |

## Why Elixir?

| Feature | Benefit |
|---------|---------|
| **BEAM VM** | Millions of lightweight processes |
| **Actor Model** | Isolated state, fault tolerance |
| **Hot Code Reload** | Zero-downtime deployments |
| **OTP Supervision** | Automatic crash recovery |
| **Distributed** | Built-in clustering |

### Expected Performance

- **500,000+** concurrent WebSocket connections per node
- **50,000** messages/second throughput
- **&lt;10ms** average message latency
- **Sub-millisecond** presence updates

## WebSocket Channels

### Connection Flow

```
Client connects to ws://realtime:4000/socket
        │
        ▼
┌─────────────────┐
│   UserSocket    │ ── JWT Authentication
└────────┬────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  chat  │ │ webrtc │ │ huddle │ │presence│
│   :*   │ │   :*   │ │   :*   │ │   :*   │
└────────┘ └────────┘ └────────┘ └────────┘
```

### Chat Channel

Real-time messaging, reactions, typing indicators.

**Topic:** `chat:{conversation_id}`

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:send` | Client → Server | Send new message |
| `message:new` | Server → Client | New message broadcast |
| `message:edit` | Client → Server | Edit message |
| `message:edited` | Server → Client | Edit broadcast |
| `message:delete` | Client → Server | Delete message |
| `message:deleted` | Server → Client | Delete broadcast |
| `message:reaction:add` | Client → Server | Add reaction |
| `message:reaction:added` | Server → Client | Reaction broadcast |
| `message:reaction:remove` | Client → Server | Remove reaction |
| `message:reaction:removed` | Server → Client | Remove broadcast |
| `typing:start` | Client → Server | Typing indicator |
| `typing:stop` | Client → Server | Stop typing |
| `message:read` | Client → Server | Mark as read |
| `user:online` | Server → Client | User joined |
| `user:offline` | Server → Client | User left |

### WebRTC Channel

Voice/video call signaling.

**Topic:** `webrtc:{user_id}`

**Call Lifecycle:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `call:initiate` | Client → Server | Start call |
| `call:incoming` | Server → Client | Incoming call |
| `call:answer` | Client → Server | Accept call |
| `call:answered` | Server → Client | Call accepted |
| `call:reject` | Client → Server | Decline call |
| `call:rejected` | Server → Client | Call declined |
| `call:end` | Client → Server | End call |
| `call:ended` | Server → Client | Call ended |
| `call:missed` | Server → Client | Missed call |

**WebRTC Signaling:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `webrtc:offer` | Client → Server | SDP offer |
| `webrtc:answer` | Client → Server | SDP answer |
| `webrtc:ice-candidate` | Client → Server | ICE candidate |

**Media Controls:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `call:toggle-audio` | Client → Server | Mute/unmute |
| `call:toggle-video` | Client → Server | Video on/off |

### Huddle Channel

Persistent group audio/video rooms (like Discord voice channels).

**Topic:** `huddle:{huddle_id}`

| Event | Direction | Description |
|-------|-----------|-------------|
| `huddle:create` | Client → Server | Create room |
| `huddle:join` | - | Join room |
| `huddle:leave` | Client → Server | Leave room |
| `huddle:participant:joined` | Server → Client | User joined |
| `huddle:participant:left` | Server → Client | User left |
| `huddle:toggle-audio` | Client → Server | Mute/unmute |
| `huddle:toggle-video` | Client → Server | Video on/off |
| `huddle:toggle-screen` | Client → Server | Screen share |
| `huddle:raise-hand` | Client → Server | Raise hand |
| `huddle:message` | Client → Server | Chat message |
| `huddle:message:new` | Server → Client | New message |
| `huddle:invite` | Client → Server | Invite users |

**Huddle Features:**
- Max 50 participants per room
- One screen share at a time
- Persistent per conversation
- Automatic cleanup when empty

## Core Components

### CallManager (GenServer)

Manages 1-on-1 call lifecycle.

```elixir
# State machine
:ringing → :active → :completed
        ↘ :rejected
        ↘ :missed (60s timeout)
```

**Responsibilities:**
- Track active calls
- Route WebRTC signaling
- Store call history (MongoDB)
- Distribute state via Redis

### HuddleManager (GenServer)

Manages persistent group rooms.

**Features:**
- One huddle per conversation
- Participant join/leave tracking
- Screen share locking
- Redis state storage
- Auto-cleanup when empty

### NotificationDispatcher

Async push notification delivery.

**Notification Types:**
- Message notifications (offline users)
- Incoming call (high priority, VOIP)
- Missed call
- Huddle invitations
- @mentions

**Delivery Channels:**
- Firebase Cloud Messaging (FCM)
- Apple Push Notification Service (APNS)

### Store-and-Forward Queue

WhatsApp-style offline message queuing.

```
┌─────────────────────────────────────────┐
│           Store & Forward               │
├─────────────────────────────────────────┤
│  MySQL (persistent) ←→ ETS (cache)      │
│                                         │
│  1. Message for offline user            │
│  2. Store in queue (7-day TTL)          │
│  3. User comes online                   │
│  4. Deliver pending messages            │
│  5. Wait for ACK                        │
│  6. Delete from queue                   │
└─────────────────────────────────────────┘
```

### Presence System

Real-time online/offline tracking.

**Architecture:**
- Phoenix.Presence for local tracking
- Redis backup for cross-node queries
- O(1) online status checks

**Tracked Metadata:**
- Device type and user-agent
- Join timestamps
- Audio/video enabled state
- Screen share status
- Current conversation focus

## Kafka Events

Event streaming for audit/analytics.

| Topic | Event | Payload |
|-------|-------|---------|
| `quckchat.messages.created` | message.created | Message data |
| `quckchat.messages.delivered` | message.delivered | Message ID + user |
| `quckchat.messages.read` | message.read | Message ID + user |
| `quckchat.calls.events` | call.* | Call data + status |
| `quckchat.presence.events` | presence.changed | User ID + status |
| `quckchat.typing.events` | typing.* | Conversation + state |
| `quckchat.users.events` | user.* | Connect/disconnect |

## HTTP API

### Health & Monitoring

```
GET /health              - Service health
GET /health/ready        - Readiness probe
GET /health/live         - Liveness probe
GET /metrics             - Prometheus metrics
```

### Call Management

```
POST /api/calls/:call_id/invite        - Invite to call
GET  /api/calls/:call_id/participants  - Get participants
```

### Huddle Management

```
POST /api/huddles                      - Create huddle
GET  /api/huddles/:huddle_id           - Get details
POST /api/huddles/:huddle_id/invite    - Invite users
```

### Presence

```
GET /api/presence/:user_id     - Get user presence
GET /api/presence/online       - List online users
```

## Configuration

### Environment Variables

```bash
# Server
PORT=4000
SECRET_KEY_BASE=your-64-char-secret-key
NODE_NAME=realtime@127.0.0.1

# Authentication
JWT_SECRET=must-match-nestjs-backend

# Databases
MONGODB_URL=mongodb+srv://...
DATABASE_URL=mysql://user:pass@host/quckchat_realtime
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092

# WebRTC
STUN_SERVER_URL=stun:stun.l.google.com:19302
TURN_SERVER_URL=turn:your-turn-server:3478
TURN_USERNAME=username
TURN_CREDENTIAL=password

# Push Notifications
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Clustering
CLUSTER_NODES=realtime@node1,realtime@node2
# or
CLUSTER_DNS=realtime.internal
```

### runtime.exs

```elixir
config :quckchat_realtime, QuckChatRealtimeWeb.Endpoint,
  url: [host: "localhost"],
  http: [port: String.to_integer(System.get_env("PORT") || "4000")]

config :quckchat_realtime, :jwt,
  secret: System.fetch_env!("JWT_SECRET")

config :quckchat_realtime, :mongodb,
  url: System.fetch_env!("MONGODB_URL")

config :quckchat_realtime, :redis,
  url: System.fetch_env!("REDIS_URL"),
  pool_size: 10

config :quckchat_realtime, :ice_servers, [
  %{urls: System.get_env("STUN_SERVER_URL")},
  %{
    urls: System.get_env("TURN_SERVER_URL"),
    username: System.get_env("TURN_USERNAME"),
    credential: System.get_env("TURN_CREDENTIAL")
  }
]
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM elixir:1.15-alpine AS builder
WORKDIR /app
ENV MIX_ENV=prod
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod && mix deps.compile
COPY . .
RUN mix release

FROM alpine:3.18
RUN apk add --no-cache libstdc++ ncurses-libs
WORKDIR /app
COPY --from=builder /app/_build/prod/rel/quckchat_realtime ./
EXPOSE 4000
CMD ["bin/quckchat_realtime", "start"]
```

### Docker Compose

```yaml
services:
  realtime:
    build: .
    ports:
      - "4000:4000"
    environment:
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - JWT_SECRET=${JWT_SECRET}
      - MONGODB_URL=${MONGODB_URL}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - redis
      - mysql
      - kafka

  realtime-node-2:
    build: .
    ports:
      - "4001:4000"
    environment:
      - NODE_NAME=realtime2@realtime-node-2
      - CLUSTER_NODES=realtime@realtime
    depends_on:
      - realtime

  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: quckchat_realtime
      MYSQL_ROOT_PASSWORD: password
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
```

## Clustering

### Erlang Distribution

```elixir
# Automatic node discovery via DNS
config :libcluster,
  topologies: [
    k8s: [
      strategy: Cluster.Strategy.Kubernetes.DNS,
      config: [
        service: "realtime-headless",
        application_name: "quckchat_realtime"
      ]
    ]
  ]
```

### Cross-Node Communication

```
┌─────────────┐     Redis PubSub     ┌─────────────┐
│   Node 1    │ ←─────────────────→  │   Node 2    │
│  (4000)     │                      │  (4001)     │
└──────┬──────┘                      └──────┬──────┘
       │                                    │
       └──────────┬─────────────────────────┘
                  ▼
           ┌─────────────┐
           │    Redis    │
           │   (State)   │
           └─────────────┘
```

## File Structure

```
realtime/
├── lib/
│   ├── quckchat_realtime/
│   │   ├── application.ex          # OTP supervision tree
│   │   ├── call_manager.ex         # 1-on-1 calls
│   │   ├── huddle_manager.ex       # Group rooms
│   │   ├── notification_dispatcher.ex
│   │   ├── presence.ex             # Phoenix Presence
│   │   ├── store_and_forward.ex    # Offline queue
│   │   ├── redis.ex                # Redis client
│   │   └── kafka/
│   │       ├── producer.ex
│   │       └── consumer.ex
│   └── quckchat_realtime_web/
│       ├── channels/
│       │   ├── user_socket.ex      # WebSocket entry
│       │   ├── chat_channel.ex     # Messaging
│       │   ├── webrtc_channel.ex   # Call signaling
│       │   └── huddle_channel.ex   # Group rooms
│       ├── controllers/
│       ├── router.ex
│       └── endpoint.ex
├── config/
│   ├── config.exs
│   ├── dev.exs
│   ├── prod.exs
│   └── runtime.exs
├── mix.exs
├── Dockerfile
└── docker-compose.yml
```

## Security

- JWT authentication on all WebSocket connections
- Conversation access verification before join
- User authorization checks
- CORS protection
- SSL/TLS support
- Rate limiting via Redis

## Integration with NestJS

```
┌─────────────┐         ┌─────────────┐
│   NestJS    │  HTTP   │  Realtime   │
│  Backend    │ ──────→ │  (Elixir)   │
│  (REST API) │         │ (WebSocket) │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │   Same JWT Secret     │
       └───────────────────────┘

Shared:
- JWT_SECRET for token validation
- MongoDB for data
- Redis for state
- Kafka for events
```
