# QuckApp MySQL Database

MySQL 8.0 database structure for the QuckApp microservices platform. Serves the following Spring Boot services:

| Service | Database (microservice) | Database (monolith) |
|---|---|---|
| auth-service | `quckapp_auth` | `quckapp` |
| user-service | `quckapp_users` | `quckapp` |
| permission-service | `quckapp_permissions` | `quckapp` |
| audit-service | `quckapp_audit` | `quckapp` |
| admin-service | `quckapp_admin` | `quckapp` |
| security-service | `quckapp_security` | `quckapp` |

## Directory Structure

```
quckapp-mysql/
├── migrations/           # Versioned migration files (Flyway-compatible)
│   ├── V001__create_auth_tables.sql
│   ├── V002__create_user_tables.sql
│   ├── V003__create_permission_tables.sql
│   ├── V004__create_audit_tables.sql
│   ├── V005__create_admin_tables.sql
│   └── V006__create_security_tables.sql
├── seeds/
│   └── dev/              # Development seed data
│       ├── seed_roles.sql
│       └── seed_admin.sql
├── schema/
│   ├── tables/           # Reserved for generated table DDL
│   ├── views/            # Database views
│   ├── functions/        # Stored functions
│   └── triggers/         # Database triggers
├── roles/                # Database user and privilege definitions
│   └── create_roles.sql
├── scripts/              # Operational shell scripts
│   ├── backup.sh
│   ├── restore.sh
│   ├── reset.sh
│   └── migrate.sh
├── docker/               # Docker-specific configuration
│   ├── init.sql          # Container entrypoint init script
│   └── my.cnf            # MySQL server configuration
└── README.md
```

## Quick Start with Docker

Start MySQL in Docker and mount the init script:

```bash
docker run -d \
  --name quckapp-mysql \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -p 3306:3306 \
  -v $(pwd)/docker/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro \
  -v $(pwd)/docker/my.cnf:/etc/mysql/conf.d/quckapp.cnf:ro \
  mysql:8.0
```

Or use docker-compose (from the project root):

```bash
docker-compose -f docker-compose.infra.yml up mysql
```

## Running Migrations

### With Flyway (recommended)

If Flyway is on your PATH:

```bash
./scripts/migrate.sh --flyway
```

### Manual mode

Falls back to a built-in migration runner that tracks applied versions in a `schema_version` table:

```bash
./scripts/migrate.sh --manual
```

### Check status

```bash
./scripts/migrate.sh --status
```

## Backup and Restore

### Create a backup

```bash
export MYSQL_PASSWORD=your_password
./scripts/backup.sh
```

Upload to S3 automatically:

```bash
export S3_BUCKET=s3://your-bucket/mysql-backups
./scripts/backup.sh
```

### Restore from backup

```bash
export MYSQL_PASSWORD=your_password
./scripts/restore.sh /tmp/quckapp-backups/quckapp_20260228_120000.sql.gz
```

## Reset Database (Development Only)

Drops and recreates the database, runs all migrations and seeds:

```bash
export MYSQL_PASSWORD=your_password
export APP_ENV=development
./scripts/reset.sh
```

This script refuses to run when `APP_ENV=production`.

## Database Users

| User | Purpose | Privileges |
|---|---|---|
| `app_user` | Runtime Spring Boot services | SELECT, INSERT, UPDATE, DELETE, EXECUTE |
| `readonly_user` | Dashboards and reporting | SELECT only |
| `migration_user` | Flyway / schema migrations | ALL PRIVILEGES |

Create users in a non-Docker environment:

```bash
mysql -u root -p < roles/create_roles.sql
```

## Schema Objects

Apply views, functions, and triggers after migrations:

```bash
mysql -u migration_user -p quckapp < schema/views/v_user_activity.sql
mysql -u migration_user -p quckapp < schema/functions/fn_check_permission.sql
mysql -u migration_user -p quckapp < schema/triggers/trg_audit_log.sql
```

## Audit Log Partitioning

The `audit_logs` table is range-partitioned by month. Partitions through 2026-12 are pre-created. To add future partitions:

```sql
CALL add_audit_partition('2027', '01');
```

Schedule this as a monthly cron job to ensure the `p_future` catch-all partition is never used for production data.
