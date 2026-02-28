# QuckApp MongoDB Database

MongoDB database structure for QuckApp real-time collaboration services. Requires MongoDB 7.x.

## Services

| Collection | Service | Runtime |
|---|---|---|
| `messages` | message-service | Elixir/Phoenix |
| `presence` | presence-service | Elixir/Phoenix |
| `calls` | call-service | Elixir/Phoenix |
| `notification_events` | notification-orchestrator | Elixir/Phoenix |
| `huddles` | huddle-service | Elixir/Phoenix |
| `events` | event-broadcast-service | Elixir/Phoenix |
| `media_files` | media-service | Go |

## Directory Structure

```
quckapp-mongodb/
├── migrations/          # Numbered index creation scripts (run in order)
│   ├── 001_create_messages_indexes.js
│   ├── 002_create_presence_indexes.js
│   ├── 003_create_calls_indexes.js
│   ├── 004_create_notifications_indexes.js
│   ├── 005_create_huddles_indexes.js
│   ├── 006_create_events_indexes.js
│   └── 007_create_media_indexes.js
├── seeds/dev/           # Development seed data
│   ├── seed_messages.js
│   └── seed_channels_data.js
├── schema/
│   ├── collections/     # JSON Schema validators (reference docs)
│   │   ├── messages.json
│   │   ├── presence.json
│   │   ├── calls.json
│   │   └── media_files.json
│   └── validators/
│       └── apply_validators.js   # Apply all validators to collections
├── roles/
│   └── create_roles.js  # Create MongoDB users and roles
├── scripts/
│   ├── backup.sh        # mongodump with gzip
│   ├── restore.sh       # mongorestore from backup
│   ├── reset.sh         # Drop database (non-production only)
│   └── migrate.sh       # Run migration files in order
├── docker/
│   ├── init-mongo.js    # Docker entrypoint init script
│   └── mongod.conf      # MongoDB config for development
└── README.md
```

## Quick Start

### With Docker

Add to your `docker-compose.yml`:

```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin_dev_password
      MONGO_INITDB_DATABASE: quckapp
    volumes:
      - ./database/quckapp-mongodb/docker/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
      - ./database/quckapp-mongodb/docker/mongod.conf:/etc/mongod.conf:ro
      - mongodb_data:/data/db
    command: ["mongod", "--config", "/etc/mongod.conf"]
```

### Manual Setup

```bash
# Run migrations (creates collections and indexes)
./scripts/migrate.sh

# Apply schema validators
mongosh quckapp --file schema/validators/apply_validators.js

# Create users (run against admin db)
mongosh admin --file roles/create_roles.js

# Seed development data
mongosh quckapp --file seeds/dev/seed_messages.js
mongosh quckapp --file seeds/dev/seed_channels_data.js
```

## Scripts

| Script | Description |
|---|---|
| `scripts/migrate.sh` | Runs all pending migration files. Tracks applied migrations in `_migrations` collection. Use `--force` to re-run all, `--status` to check state. |
| `scripts/backup.sh` | Creates a gzip-compressed mongodump in `backups/YYYY-MM-DD/`. Set `RETENTION_DAYS` to auto-prune old backups. |
| `scripts/restore.sh` | Restores from a backup directory. Prompts for confirmation before overwriting. |
| `scripts/reset.sh` | Drops the database and re-runs migrations. Refuses to run in production (`NODE_ENV`, `MIX_ENV`, `APP_ENV` checks). Use `--seed` to also seed data. |

## TTL Indexes

| Collection | Field | Expiry |
|---|---|---|
| `messages` | `deleted_at` | 30 days after soft-delete |
| `presence` | `last_seen` | 5 minutes (heartbeat timeout) |
| `notification_events` | `created_at` | 90 days |
| `events` | `created_at` | 30 days |
| `media_files` | `deleted_at` | 30 days after soft-delete |

## Users

| Username | Role | Purpose |
|---|---|---|
| `quckapp_app` | readWrite | Application services |
| `quckapp_readonly` | read | Dashboards, reporting |
| `quckapp_backup` | backup, restore | mongodump/mongorestore |

Default passwords are in `roles/create_roles.js` and must be changed for non-development environments.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DB` | `quckapp` | Database name |
| `MONGO_USER` | `quckapp_backup` | Auth username (backup/restore) |
| `MONGO_PASS` | _(empty)_ | Auth password |
| `RETENTION_DAYS` | `30` | Backup retention (backup.sh) |
| `NODE_ENV` / `MIX_ENV` / `APP_ENV` | _(unset)_ | Environment guards for reset.sh |
