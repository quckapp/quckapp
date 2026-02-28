# QuckApp PostgreSQL Database

PostgreSQL 16 database for QuckApp NestJS services.

## Services

| Service | Status | Tables |
|---------|--------|--------|
| **notification-service** | Active | `notifications`, `notification_templates`, `devices`, `notification_preferences` |
| **realtime-service** | Active | `connected_clients`, `typing_indicators` |
| **backend-gateway** | Deprecated | Reads from notification tables |

## Directory Structure

```
quckapp-postgresql/
├── migrations/              # Versioned schema migrations (run in order)
│   ├── V001__create_notifications_tables.sql
│   ├── V002__create_devices_tables.sql
│   ├── V003__create_realtime_tables.sql
│   └── V004__create_indexes.sql
├── seeds/dev/               # Development seed data
│   ├── seed_templates.sql
│   └── seed_preferences.sql
├── schema/
│   ├── tables/.gitkeep
│   ├── views/               # Database views
│   ├── functions/            # PL/pgSQL functions
│   └── triggers/             # Trigger definitions
├── roles/                   # Role and permission definitions
├── scripts/                 # Operational shell scripts
│   ├── backup.sh
│   ├── restore.sh
│   ├── reset.sh
│   └── migrate.sh
└── docker/                  # Docker-specific configuration
    ├── init.sql
    └── postgresql.conf
```

## Quick Start

### Docker

```bash
# Start PostgreSQL with Docker Compose (from project root)
docker compose -f docker-compose.infra.yml up postgres

# Or run standalone
docker run -d \
  --name quckapp-postgres \
  -e POSTGRES_DB=quckapp \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -v ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql \
  -v ./docker/postgresql.conf:/etc/postgresql/postgresql.conf \
  -p 5432:5432 \
  postgres:16 -c 'config_file=/etc/postgresql/postgresql.conf'
```

### Run Migrations

```bash
# Apply all pending migrations
./scripts/migrate.sh

# Preview pending migrations
./scripts/migrate.sh --dry-run

# With custom connection
./scripts/migrate.sh -h localhost -p 5432 -u migration_user -d quckapp
```

### Reset Database (Development Only)

```bash
# Drop and recreate with seeds
./scripts/reset.sh --seed

# Without seeds
./scripts/reset.sh
```

### Backup & Restore

```bash
# Create backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/quckapp_20260228_120000.sql.gz
```

## Key Features

- **pg_notify trigger** on `notifications` table pushes events to realtime-service via `LISTEN/NOTIFY`
- **JSONB columns** for flexible notification payloads and template variables
- **TTL-style cleanup** for ephemeral `connected_clients` and `typing_indicators`
- **Partial indexes** for unread notifications and push-enabled devices
- **Quiet hours** support in notification preferences

## Roles

| Role | Purpose | Privileges |
|------|---------|------------|
| `app_user` | NestJS services runtime | SELECT, INSERT, UPDATE, DELETE |
| `readonly_user` | Dashboards, debugging | SELECT only |
| `migration_user` | Schema migrations | ALL (DDL + DML) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | varies by script | Connection user |
| `PGPASSWORD` | - | Connection password |
| `PGDATABASE` | `quckapp` | Database name |
| `ENVIRONMENT` | `development` | Guards destructive operations |
