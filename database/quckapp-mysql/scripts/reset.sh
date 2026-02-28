#!/usr/bin/env bash
# ============================================================================
# reset.sh - Drop and Recreate QuckApp MySQL Database
#
# Destroys the database and rebuilds it from scratch by running all
# migrations and seed files. Includes a safety check to prevent
# accidental execution in production.
#
# Usage:
#   ./reset.sh
#   MYSQL_HOST=localhost MYSQL_DATABASE=quckapp ./reset.sh
#
# Environment variables (with defaults):
#   MYSQL_HOST       - MySQL host          (default: 127.0.0.1)
#   MYSQL_PORT       - MySQL port          (default: 3306)
#   MYSQL_USER       - MySQL user          (default: migration_user)
#   MYSQL_PASSWORD   - MySQL password      (required)
#   MYSQL_DATABASE   - Database name       (default: quckapp)
#   APP_ENV          - Environment name    (default: development)
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-migration_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?ERROR: MYSQL_PASSWORD environment variable is required}"
MYSQL_DATABASE="${MYSQL_DATABASE:-quckapp}"
APP_ENV="${APP_ENV:-development}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "${SCRIPT_DIR}")"

# ---------------------------------------------------------------------------
# Production safety check
# ---------------------------------------------------------------------------
if [[ "${APP_ENV}" == "production" || "${APP_ENV}" == "prod" ]]; then
    echo "============================================================"
    echo "  FATAL: Database reset is NOT allowed in production."
    echo "  APP_ENV = ${APP_ENV}"
    echo "============================================================"
    exit 1
fi

if [[ "${APP_ENV}" == "staging" ]]; then
    echo "WARNING: You are about to reset the STAGING database."
    echo "  Host:     ${MYSQL_HOST}:${MYSQL_PORT}"
    echo "  Database: ${MYSQL_DATABASE}"
    echo ""
    read -r -p "Type 'RESET STAGING' to confirm: " CONFIRM
    if [[ "${CONFIRM}" != "RESET STAGING" ]]; then
        echo "Confirmation did not match. Aborting."
        exit 1
    fi
fi

echo "=== QuckApp MySQL Database Reset ==="
echo "  Environment: ${APP_ENV}"
echo "  Host:        ${MYSQL_HOST}:${MYSQL_PORT}"
echo "  Database:    ${MYSQL_DATABASE}"
echo ""

# ---------------------------------------------------------------------------
# Helper to run SQL
# ---------------------------------------------------------------------------
run_sql() {
    mysql \
        --host="${MYSQL_HOST}" \
        --port="${MYSQL_PORT}" \
        --user="${MYSQL_USER}" \
        --password="${MYSQL_PASSWORD}" \
        --default-character-set=utf8mb4 \
        "$@"
}

run_sql_file() {
    local file="$1"
    echo "  -> $(basename "${file}")"
    run_sql "${MYSQL_DATABASE}" < "${file}"
}

# ---------------------------------------------------------------------------
# Drop and recreate
# ---------------------------------------------------------------------------
echo "[$(date +%T)] Dropping database '${MYSQL_DATABASE}'..."
run_sql -e "DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`;"

echo "[$(date +%T)] Creating database '${MYSQL_DATABASE}'..."
run_sql -e "CREATE DATABASE \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# ---------------------------------------------------------------------------
# Run migrations in order
# ---------------------------------------------------------------------------
echo "[$(date +%T)] Running migrations..."
for migration in "${BASE_DIR}"/migrations/V*.sql; do
    if [[ -f "${migration}" ]]; then
        run_sql_file "${migration}"
    fi
done

# ---------------------------------------------------------------------------
# Apply schema objects (views, functions, triggers)
# ---------------------------------------------------------------------------
echo "[$(date +%T)] Applying schema objects..."

for view_file in "${BASE_DIR}"/schema/views/*.sql; do
    [[ -f "${view_file}" ]] && run_sql_file "${view_file}"
done

for func_file in "${BASE_DIR}"/schema/functions/*.sql; do
    [[ -f "${func_file}" ]] && run_sql_file "${func_file}"
done

for trigger_file in "${BASE_DIR}"/schema/triggers/*.sql; do
    [[ -f "${trigger_file}" ]] && run_sql_file "${trigger_file}"
done

# ---------------------------------------------------------------------------
# Run dev seeds
# ---------------------------------------------------------------------------
echo "[$(date +%T)] Running seed data..."
for seed_file in "${BASE_DIR}"/seeds/dev/*.sql; do
    if [[ -f "${seed_file}" ]]; then
        run_sql_file "${seed_file}"
    fi
done

echo ""
echo "[$(date +%T)] Database reset complete."
echo "=== Done ==="
