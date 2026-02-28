# QuckApp Database Management

Centralized database schemas, migrations, seeds, and operational scripts for all QuckApp data stores.

## Structure

```
database/
├── quckapp-mysql/          # MySQL (Spring Boot, Go, NestJS services)
├── quckapp-mongodb/        # MongoDB (Elixir, Go document stores)
├── quckapp-postgresql/     # PostgreSQL (Go BFF, Elixir realtime)
├── quckapp-clickhouse/     # ClickHouse (analytics, time-series)
├── quckapp-scylladb/       # ScyllaDB (high-throughput messaging)
├── quckapp-kafka/          # Kafka (event streaming)
├── quckapp-elasticsearch/  # Elasticsearch (search, logging)
├── quckapp-dynamodb/       # DynamoDB (serverless key-value)
└── README.md
```

Each database directory follows a standard layout:

```
quckapp-<db>/
├── Dockerfile              # Custom image with init scripts baked in
├── schema/
│   ├── tables/             # CREATE TABLE definitions
│   ├── views/              # View definitions
│   ├── functions/          # Stored functions / procedures
│   └── triggers/           # Trigger definitions
├── services/
│   └── <service-name>/     # Per-service migrations (Flyway V*__ or numbered)
├── shared/
│   └── <shared-module>/    # Cross-service shared schemas
├── seeds/                  # Initial data (dev/test environments)
├── roles/                  # Database roles and user definitions
├── permissions/            # GRANT statements and access policies
├── scripts/
│   ├── backup.sh           # Backup to file / cloud storage
│   ├── restore.sh          # Restore from backup
│   └── reset.sh            # Drop and recreate (dev only)
├── tools/
│   ├── docker-compose.yml  # Standalone DB + admin UI for local dev
│   └── migrate.sh          # Run migrations against a target env
├── .github/workflows/      # CI: validate + deploy migrations
└── .azure-pipelines/       # Azure DevOps equivalents
```

## Service → Database Mapping

| Database    | Services                                                                 |
|------------|--------------------------------------------------------------------------|
| MySQL       | admin, audit, auth, user, permission, security, channel, thread, workspace, notification |
| MongoDB     | attachment, backend-gateway, call, event-broadcast, file, huddle, media, message, notification-orchestrator, presence, reminder |
| PostgreSQL  | go-bff, realtime                                                         |
| ClickHouse  | analytics                                                                |
| ScyllaDB    | message (high-throughput), presence                                      |
| Kafka       | event-broadcast, notification-orchestrator                               |
| Elasticsearch | search, ml, moderation                                                 |
| DynamoDB    | session store, feature flags                                             |

## Local Development

Each database has a standalone `tools/docker-compose.yml` that starts the DB with an admin UI:

```bash
# Start MySQL + phpMyAdmin
docker compose -f database/quckapp-mysql/tools/docker-compose.yml up -d

# Start MongoDB + Mongo Express
docker compose -f database/quckapp-mongodb/tools/docker-compose.yml up -d

# Start PostgreSQL + pgAdmin
docker compose -f database/quckapp-postgresql/tools/docker-compose.yml up -d
```

Or use the root `docker-compose.yml` which starts all infrastructure together.

## Running Migrations

```bash
# Run all MySQL migrations for a specific environment
./database/quckapp-mysql/scripts/backup.sh local    # backup first
./database/quckapp-mysql/tools/migrate.sh local      # then migrate

# Reset local dev database (DESTRUCTIVE)
./database/quckapp-mysql/scripts/reset.sh local
```

## Conventions

- **Flyway naming** for SQL: `V<version>__<description>.sql` (Spring Boot services)
- **Numbered naming** for Go/Elixir: `001_initial.sql`, `002_add_indexes.sql`
- **Timestamped naming** for MongoDB: `YYYYMMDDHHMMSS-<description>.js`
- Seeds are idempotent (safe to re-run)
- `shared/` contains cross-service schemas (e.g., promotion-gate)
