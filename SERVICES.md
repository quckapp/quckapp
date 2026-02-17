# QuckApp Microservices Architecture

All **33 microservices** consolidated in `/services/` directory (matching documentation).

## Complete Service Inventory

### Authentication & Security (Spring Boot)

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| [auth-service](./services/auth-service) | 8081 | MySQL | JWT, OAuth, 2FA, OTP |
| [user-service](./services/user-service) | 8082 | MySQL | User CRUD, profiles |
| [permission-service](./services/permission-service) | 8083 | MySQL | RBAC, Casbin |
| [audit-service](./services/audit-service) | 8084 | MySQL | Audit logging |
| [admin-service](./services/admin-service) | 8085 | MySQL | Admin operations |
| [security-service](./services/security-service) | 8086 | MySQL | Threat detection, WAF, audit & compliance |

### API & Notifications (NestJS)

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| [backend-gateway](./services/backend-gateway) | 3000 | PostgreSQL | API Gateway |
| [realtime-service](./services/realtime-service) | 4000 | Redis | WebSocket Gateway |
| [notification-service](./services/notification-service) | 3001 | PostgreSQL | Push, Email, SMS |

### Real-time Communication (Elixir)

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| [presence-service](./services/presence-service) | 4001 | MongoDB | Online status |
| [call-service](./services/call-service) | 4002 | MongoDB | Voice/Video calls |
| [message-service](./services/message-service) | 4003 | MongoDB | Real-time messaging |
| [notification-orchestrator](./services/notification-orchestrator) | 4004 | MongoDB | Notification delivery |
| [huddle-service](./services/huddle-service) | 4005 | MongoDB | Audio rooms |
| [event-broadcast-service](./services/event-broadcast-service) | 4006 | MongoDB | Event distribution |

### Organization & Storage (Go)

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| [workspace-service](./services/workspace-service) | 5004 | MySQL | Workspace management |
| [channel-service](./services/channel-service) | 5005 | MySQL | Channel management |
| [search-service](./services/search-service) | 5006 | MySQL + ES | Full-text search |
| [thread-service](./services/thread-service) | 5009 | MySQL | Thread conversations |
| [bookmark-service](./services/bookmark-service) | 5010 | MySQL | Saved items |
| [reminder-service](./services/reminder-service) | 5011 | MySQL | Reminders |
| [media-service](./services/media-service) | 5001 | MongoDB | Media processing |
| [file-service](./services/file-service) | 5002 | MongoDB | File storage |
| [attachment-service](./services/attachment-service) | 5012 | MongoDB | Attachments |
| [cdn-service](./services/cdn-service) | 5013 | MongoDB | CDN management |

### AI & Analytics (Python)

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| [analytics-service](./services/analytics-service) | 5007 | MySQL | Usage analytics |
| [moderation-service](./services/moderation-service) | 5014 | MySQL | Content moderation |
| [export-service](./services/export-service) | 5015 | MySQL | Data export |
| [integration-service](./services/integration-service) | 5016 | MySQL | Third-party integrations |
| [ml-service](./services/ml-service) | 5008 | Databricks | ML predictions |
| [sentiment-service](./services/sentiment-service) | 5017 | Databricks | Sentiment analysis |
| [insights-service](./services/insights-service) | 5018 | Databricks | Business insights |
| [smart-reply-service](./services/smart-reply-service) | 5019 | Databricks | AI suggestions |

---

## Technology Stack Summary

| Stack | Count | Services |
|-------|-------|----------|
| Spring Boot (Java) | 6 | auth, user, permission, audit, admin, security |
| NestJS (Node.js) | 3 | backend-gateway, realtime-service, notification |
| Phoenix (Elixir) | 6 | presence, call, message, notification-orchestrator, huddle, event-broadcast |
| Gin (Go) | 10 | workspace, channel, search, thread, bookmark, reminder, media, file, attachment, cdn |
| FastAPI (Python) | 8 | analytics, moderation, export, integration, ml, sentiment, insights, smart-reply |

---

## Directory Structure

```
QuckApp/
├── services/
│   ├── admin-service/              # Spring Boot - Admin operations
│   ├── analytics-service/          # Python FastAPI - Usage analytics
│   ├── attachment-service/         # Go Gin - File attachments
│   ├── audit-service/              # Spring Boot - Audit logging
│   ├── auth-service/               # Spring Boot - Authentication
│   ├── backend-gateway/            # NestJS - API Gateway (port 3000)
│   ├── bookmark-service/           # Go Gin - Saved items
│   ├── call-service/               # Elixir Phoenix - Voice/Video
│   ├── cdn-service/                # Go Gin - CDN management
│   ├── channel-service/            # Go Gin - Channels
│   ├── event-broadcast-service/    # Elixir Phoenix - Events
│   ├── export-service/             # Python FastAPI - Data export
│   ├── file-service/               # Go Gin - File storage
│   ├── huddle-service/             # Elixir Phoenix - Audio rooms
│   ├── insights-service/           # Python FastAPI - BI insights
│   ├── integration-service/        # Python FastAPI - Integrations
│   ├── media-service/              # Go Gin - Media processing
│   ├── message-service/            # Elixir Phoenix - Messaging
│   ├── ml-service/                 # Python FastAPI - ML predictions
│   ├── moderation-service/         # Python FastAPI - Moderation
│   ├── notification-orchestrator/  # Elixir Phoenix - Notifications
│   ├── notification-service/       # NestJS - Push/Email/SMS
│   ├── permission-service/         # Spring Boot - RBAC
│   ├── presence-service/           # Elixir Phoenix - Online status
│   ├── realtime-service/           # NestJS - WebSocket Gateway
│   ├── reminder-service/           # Go Gin - Reminders
│   ├── search-service/             # Go Gin - Full-text search
│   ├── sentiment-service/          # Python FastAPI - Sentiment
│   ├── smart-reply-service/        # Python FastAPI - AI replies
│   ├── thread-service/             # Go Gin - Threads
│   ├── user-service/               # Spring Boot - User management
│   ├── security-service/            # Spring Boot - Security (Threat, WAF, Audit)
│   └── workspace-service/          # Go Gin - Workspaces
├── web/                            # React frontend
├── mobile/                         # React Native app
├── docs/                           # Documentation
└── SERVICES.md
```

---

## Health Endpoints

All services expose:
```
GET /health          # Basic health
GET /health/ready    # Kubernetes readiness
GET /health/live     # Kubernetes liveness
GET /actuator/health # Spring Boot only
```

---

## Quick Start

```bash
# Start infrastructure
docker-compose up -d

# Start all microservices
docker-compose -f docker-compose.yml -f docker-compose.services.yml up -d
```

---

## Port Reference

| Port Range | Stack | Services |
|------------|-------|----------|
| 3000-3001 | NestJS | backend-gateway, notification-service |
| 4000-4006 | Elixir | realtime, presence, call, message, notification-orchestrator, huddle, event-broadcast |
| 5001-5019 | Go/Python | All Go and Python services |
| 8081-8086 | Spring Boot | auth, user, permission, audit, admin, security |
