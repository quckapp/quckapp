#!/usr/bin/env bash
# ============================================================================
# reset.sh - Drop and recreate the QuckApp PostgreSQL database
# SAFETY: Refuses to run if ENVIRONMENT is set to "production" or "prod".
#
# Usage:
#   ./reset.sh                         # Uses defaults (localhost)
#   ./reset.sh -h localhost -p 5432    # Custom host/port
#   ./reset.sh --seed                  # Also run seed files after reset
#
# Environment variables:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   ENVIRONMENT - Must NOT be "production" or "prod"
# ============================================================================

set -euo pipefail

# ---- Defaults ---------------------------------------------------------------
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-quckapp}"
ENVIRONMENT="${ENVIRONMENT:-development}"
RUN_SEEDS=false

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---- Parse optional flags ---------------------------------------------------
while [[ $# -gt 0 ]]; do
    case $1 in
        -h)         PGHOST="$2"; shift 2 ;;
        -p)         PGPORT="$2"; shift 2 ;;
        -u)         PGUSER="$2"; shift 2 ;;
        -d)         PGDATABASE="$2"; shift 2 ;;
        --seed)     RUN_SEEDS=true; shift ;;
        *)          echo "Unknown option: $1" && exit 1 ;;
    esac
done

# ---- Production guard -------------------------------------------------------
ENV_LOWER=$(echo "${ENVIRONMENT}" | tr '[:upper:]' '[:lower:]')
if [[ "${ENV_LOWER}" == "production" || "${ENV_LOWER}" == "prod" ]]; then
    echo "================================================================"
    echo "  FATAL: Cannot reset database in production!"
    echo "  ENVIRONMENT=${ENVIRONMENT}"
    echo "================================================================"
    exit 1
fi

echo "============================================"
echo "QuckApp PostgreSQL RESET"
echo "============================================"
echo "Host:        ${PGHOST}:${PGPORT}"
echo "Database:    ${PGDATABASE}"
echo "User:        ${PGUSER}"
echo "Environment: ${ENVIRONMENT}"
echo "Run seeds:   ${RUN_SEEDS}"
echo "--------------------------------------------"
echo ""
echo "WARNING: This will DROP the '${PGDATABASE}' database and ALL its data!"
read -r -p "Type the database name to confirm: " CONFIRM

if [ "${CONFIRM}" != "${PGDATABASE}" ]; then
    echo "Database name does not match. Aborting."
    exit 1
fi

# ---- Drop & Recreate -------------------------------------------------------
echo "[$(date '+%H:%M:%S')] Terminating existing connections..."
psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="postgres" \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();" \
    --quiet 2>/dev/null || true

echo "[$(date '+%H:%M:%S')] Dropping database '${PGDATABASE}'..."
psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="postgres" \
    -c "DROP DATABASE IF EXISTS ${PGDATABASE};"

echo "[$(date '+%H:%M:%S')] Creating database '${PGDATABASE}'..."
psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="postgres" \
    -c "CREATE DATABASE ${PGDATABASE} WITH ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0;"

# ---- Extensions -------------------------------------------------------------
echo "[$(date '+%H:%M:%S')] Installing extensions..."
psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="${PGDATABASE}" <<SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQL

# ---- Run migrations ---------------------------------------------------------
echo "[$(date '+%H:%M:%S')] Running migrations..."
"${SCRIPT_DIR}/migrate.sh" -h "${PGHOST}" -p "${PGPORT}" -u "${PGUSER}" -d "${PGDATABASE}"

# ---- Run schema objects (views, functions, triggers) ------------------------
echo "[$(date '+%H:%M:%S')] Applying schema objects..."
for dir in views functions triggers; do
    if [ -d "${BASE_DIR}/schema/${dir}" ]; then
        for f in "${BASE_DIR}/schema/${dir}"/*.sql; do
            [ -f "$f" ] || continue
            echo "  -> $(basename "$f")"
            psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" \
                 --dbname="${PGDATABASE}" -f "$f" --quiet
        done
    fi
done

# ---- Run roles --------------------------------------------------------------
echo "[$(date '+%H:%M:%S')] Creating roles..."
if [ -f "${BASE_DIR}/roles/create_roles.sql" ]; then
    psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" \
         --dbname="${PGDATABASE}" -f "${BASE_DIR}/roles/create_roles.sql" --quiet
fi

# ---- Optionally run seeds ---------------------------------------------------
if [ "${RUN_SEEDS}" = true ]; then
    echo "[$(date '+%H:%M:%S')] Running dev seeds..."
    for f in "${BASE_DIR}/seeds/dev"/*.sql; do
        [ -f "$f" ] || continue
        echo "  -> $(basename "$f")"
        psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" \
             --dbname="${PGDATABASE}" -f "$f" --quiet
    done
fi

echo "============================================"
echo "Database reset complete."
echo "============================================"
