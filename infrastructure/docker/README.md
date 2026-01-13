# QuikApp - Local Development with Docker

This directory contains Docker Compose configurations for running QuikApp locally.

## Prerequisites

- Docker Desktop 4.x+ (with Docker Compose v2)
- 16GB+ RAM recommended
- 50GB+ free disk space

## Directory Structure

```
infrastructure/docker/
├── docker-compose.infra.yml      # Infrastructure (databases, brokers, monitoring)
├── docker-compose.services.yml   # Application services (22 microservices)
├── docker-compose.aws-local.yml  # AWS alternatives (LocalStack, MinIO, Keycloak)
├── .env.example                  # Environment variables template
├── dockerfiles/                  # Multi-stage Dockerfiles by tech stack
│   ├── springboot/Dockerfile
│   ├── nestjs/Dockerfile
│   ├── go/Dockerfile
│   ├── elixir/Dockerfile
│   └── python/Dockerfile
├── init-scripts/                 # Database initialization scripts
│   ├── postgres/
│   ├── mongodb/
│   ├── clickhouse/
│   └── localstack/
└── config/                       # Service configurations
    ├── prometheus/
    └── grafana/
```

## Quick Start

```bash
# 1. Navigate to the docker directory
cd infrastructure/docker

# 2. Copy environment file
cp .env.example .env

# 3. Start infrastructure services
docker compose -f docker-compose.infra.yml up -d

# 4. Wait for services to be healthy
docker compose -f docker-compose.infra.yml ps

# 5. Start application services (optional)
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d
```

## Compose File Options

### Option 1: Infrastructure Only (Most Common)

For backend development where you run services locally:

```bash
docker compose -f docker-compose.infra.yml up -d
```

This starts: PostgreSQL, MongoDB, Redis, Elasticsearch, ClickHouse, Kafka, MinIO, Prometheus, Grafana, Jaeger

### Option 2: Infrastructure + Application Services

For full stack development:

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d
```

### Option 3: AWS Local Development

For testing AWS integrations with LocalStack:

```bash
docker compose -f docker-compose.aws-local.yml up -d

# With optional profiles
docker compose -f docker-compose.aws-local.yml --profile minio --profile tools up -d
```

## Infrastructure Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Primary relational database |
| MongoDB | 27017 | Document database for audit logs |
| Redis | 6379 | Caching and sessions |
| Elasticsearch | 9200 | Full-text search engine |
| ClickHouse | 8123, 9000 | Analytics database |
| Zookeeper | 2181 | Kafka dependency |
| Kafka | 29092 | Message broker |
| Kafka UI | 8085 | Kafka management interface |
| MinIO | 9010, 9011 | S3-compatible object storage |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3030 | Metrics visualization |
| Jaeger | 16686 | Distributed tracing |

## Application Services (22 Total)

### API Gateway & Auth (NestJS)
| Service | Port | Description |
|---------|------|-------------|
| backend-gateway | 3000 | Main API entry point |
| auth-service | 3001 | Authentication |

### User & Workspace Management
| Service | Port | Tech Stack |
|---------|------|------------|
| user-service | 3002 | NestJS |
| workspace-service | 3003 | Spring Boot |

### Messaging & Channels
| Service | Port | Tech Stack |
|---------|------|------------|
| channel-service | 3004 | Spring Boot |
| message-service | 3005 | Go |
| thread-service | 3006 | Go |

### File & Media (Go)
| Service | Port |
|---------|------|
| file-service | 3007 |
| media-service | 3008 |

### Search & Notifications
| Service | Port | Tech Stack |
|---------|------|------------|
| search-service | 3009 | Go |
| notification-service | 3010 | NestJS |

### Realtime & Presence (Elixir/Phoenix)
| Service | Port |
|---------|------|
| realtime-service | 4000 |
| presence-service | 4001 |

### Voice & Video (Elixir)
| Service | Port |
|---------|------|
| call-service | 4002 |
| huddle-service | 4003 |

### Analytics & ML (Python/FastAPI)
| Service | Port |
|---------|------|
| analytics-service | 8000 |
| ml-service | 8001 |
| moderation-service | 8002 |
| sentiment-service | 8003 |

### Admin & Security (Spring Boot)
| Service | Port |
|---------|------|
| permission-service | 3011 |
| audit-service | 3012 |
| admin-service | 3013 |

## AWS Service Mapping (LocalStack)

| AWS Service | Local Alternative | Port |
|-------------|-------------------|------|
| RDS (PostgreSQL) | PostgreSQL 16 | 5432 |
| ElastiCache | Redis 7 | 6379 |
| S3 | LocalStack / MinIO | 4566 / 9010 |
| DynamoDB | LocalStack | 4566 |
| SQS | LocalStack | 4566 |
| SNS | LocalStack | 4566 |
| Cognito | Keycloak (optional) | 8080 |

## Common Commands

### Starting Services

```bash
# Infrastructure only
docker compose -f docker-compose.infra.yml up -d

# Specific infrastructure services
docker compose -f docker-compose.infra.yml up -d postgres redis kafka

# Full stack
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d

# AWS local development
docker compose -f docker-compose.aws-local.yml up -d

# With rebuild
docker compose -f docker-compose.infra.yml up -d --build
```

### Stopping Services

```bash
# Stop infrastructure
docker compose -f docker-compose.infra.yml down

# Stop everything and remove volumes (CAUTION: data loss)
docker compose -f docker-compose.infra.yml down -v
```

### Viewing Logs

```bash
# All infrastructure logs
docker compose -f docker-compose.infra.yml logs -f

# Specific service
docker compose -f docker-compose.infra.yml logs -f kafka

# Last 100 lines
docker compose -f docker-compose.infra.yml logs --tail=100 postgres
```

## Database Access

### PostgreSQL

```bash
# Connect via psql
docker exec -it quikapp-postgres psql -U quikapp -d quikapp

# From host
psql postgresql://quikapp:quikapp_secret@localhost:5432/quikapp
```

### MongoDB

```bash
docker exec -it quikapp-mongodb mongosh -u admin -p admin_secret --authenticationDatabase admin
```

### Redis

```bash
docker exec -it quikapp-redis redis-cli -a redis_secret
```

### ClickHouse

```bash
docker exec -it quikapp-clickhouse clickhouse-client --user quikapp --password clickhouse_secret
```

## Monitoring Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3030 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| Jaeger | http://localhost:16686 | - |
| Kafka UI | http://localhost:8085 | - |
| MinIO Console | http://localhost:9011 | minioadmin / minioadmin123 |

## Testing AWS Services Locally

```bash
# Configure AWS CLI for LocalStack
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set region us-east-1

# S3 operations
aws --endpoint-url=http://localhost:4566 s3 ls

# DynamoDB operations
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# SQS operations
aws --endpoint-url=http://localhost:4566 sqs list-queues
```

## Application Configuration

Add these to your application's `.env`:

```bash
# Database
DATABASE_URL=postgresql://quikapp:quikapp_secret@localhost:5432/quikapp

# Redis
REDIS_URL=redis://:redis_secret@localhost:6379

# Kafka
KAFKA_BROKERS=localhost:29092

# AWS (LocalStack)
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.infra.yml logs postgres

# Check if port is in use
netstat -an | findstr "5432"  # Windows
lsof -i :5432                 # Mac/Linux
```

### Database Connection Issues

```bash
# Verify PostgreSQL is ready
docker exec quikapp-postgres pg_isready -U quikapp

# Check network
docker network inspect quikapp-network
```

### Kafka Issues

```bash
# Check broker status
docker exec quikapp-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# List topics
docker exec quikapp-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### Memory Issues

If services crash due to memory:

1. Increase Docker Desktop memory (Settings > Resources)
2. Start fewer services at once
3. Reduce Elasticsearch heap in compose file

### Clean Slate

```bash
# Remove everything
docker compose -f docker-compose.infra.yml down -v --remove-orphans
docker network prune -f
docker volume prune -f
```

## Network Architecture

All services communicate through the `quikapp-network` bridge network:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        quikapp-network                               │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │ Gateway  │────│   Auth   │    │   User   │    │Workspace │      │
│  │  :3000   │    │  :3001   │    │  :3002   │    │  :3003   │      │
│  └────┬─────┘    └──────────┘    └──────────┘    └──────────┘      │
│       │                                                              │
│  ┌────▼─────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │ Postgres │    │ MongoDB  │    │  Redis   │    │  Kafka   │      │
│  │  :5432   │    │  :27017  │    │  :6379   │    │  :29092  │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Integration with Terraform

This Docker setup mirrors the AWS infrastructure defined in `../terraform/`:

| Terraform Module | Docker Service |
|------------------|----------------|
| `modules/s3` | LocalStack S3 / MinIO |
| `modules/dynamodb` | LocalStack DynamoDB |
| `modules/sqs` | LocalStack SQS |
| `modules/sns` | LocalStack SNS |
| `modules/rds` | PostgreSQL |
| `modules/elasticache` | Redis |
| `modules/cognito` | Keycloak |

## Tips

1. **Start infrastructure first**: Always start `docker-compose.infra.yml` before services
2. **Check health**: Use `docker compose ps` to verify services are healthy
3. **Use profiles**: Only start what you need to save resources
4. **Monitor resources**: Keep Docker Desktop resource monitor open
5. **Use Kafka UI**: http://localhost:8085 to monitor message flow
6. **Use Jaeger**: http://localhost:16686 to trace requests
