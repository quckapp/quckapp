#!/usr/bin/env bash
# ============================================================================
# ClickHouse Setup Script for QuckApp
# Runs all migration files in order against the ClickHouse server.
# ============================================================================
set -euo pipefail

CH_HOST="${CH_HOST:-localhost}"
CH_PORT="${CH_PORT:-9000}"
CH_DATABASE="${CH_DATABASE:-default}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../migrations"

echo "==> Waiting for ClickHouse at ${CH_HOST}:${CH_PORT}..."
until clickhouse-client --host "$CH_HOST" --port "$CH_PORT" --query "SELECT 1" > /dev/null 2>&1; do
    sleep 2
done
echo "==> ClickHouse is ready."

# -- Create migrations tracking table ------------------------------------------
clickhouse-client --host "$CH_HOST" --port "$CH_PORT" --database "$CH_DATABASE" --query "
CREATE TABLE IF NOT EXISTS schema_migrations
(
    version    String    NOT NULL,
    applied_at DateTime  DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY version
"

# -- Run migrations in order ---------------------------------------------------
for MIGRATION in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
    VERSION=$(basename "$MIGRATION" | sed 's/__.*//')

    ALREADY_APPLIED=$(clickhouse-client --host "$CH_HOST" --port "$CH_PORT" --database "$CH_DATABASE" \
        --query "SELECT count() FROM schema_migrations WHERE version = '${VERSION}'" 2>/dev/null)

    if [ "$ALREADY_APPLIED" -gt 0 ]; then
        echo "    Skipping ${VERSION} (already applied)"
        continue
    fi

    echo "==> Applying migration: $(basename "$MIGRATION")"
    clickhouse-client --host "$CH_HOST" --port "$CH_PORT" --database "$CH_DATABASE" \
        --multiquery < "$MIGRATION"

    clickhouse-client --host "$CH_HOST" --port "$CH_PORT" --database "$CH_DATABASE" \
        --query "INSERT INTO schema_migrations (version) VALUES ('${VERSION}')"
done

echo "==> Migrations complete."
