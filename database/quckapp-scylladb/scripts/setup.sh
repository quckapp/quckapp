#!/usr/bin/env bash
# ============================================================================
# ScyllaDB Setup Script for QuckApp
# Runs all CQL migration files in order using cqlsh.
# ============================================================================
set -euo pipefail

SCYLLA_HOST="${SCYLLA_HOST:-localhost}"
SCYLLA_PORT="${SCYLLA_PORT:-9042}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../migrations"

echo "==> Waiting for ScyllaDB at ${SCYLLA_HOST}:${SCYLLA_PORT}..."
until cqlsh "$SCYLLA_HOST" "$SCYLLA_PORT" -e "DESCRIBE CLUSTER" > /dev/null 2>&1; do
    sleep 2
done
echo "==> ScyllaDB is ready."

# -- Run migrations in order ---------------------------------------------------
for MIGRATION in $(ls "$MIGRATIONS_DIR"/*.cql | sort); do
    FILENAME=$(basename "$MIGRATION")
    echo "==> Applying migration: ${FILENAME}"
    cqlsh "$SCYLLA_HOST" "$SCYLLA_PORT" -f "$MIGRATION"
done

echo "==> All migrations applied."

# -- Verify tables -------------------------------------------------------------
echo ""
echo "==> Tables in quckapp keyspace:"
cqlsh "$SCYLLA_HOST" "$SCYLLA_PORT" -e "DESCRIBE TABLES" -k quckapp
