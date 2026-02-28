#!/usr/bin/env bash
# ============================================================================
# migrate.sh - Run QuckApp PostgreSQL migration files in order
# Tracks applied migrations in a schema_migrations table.
#
# Usage:
#   ./migrate.sh                         # Uses defaults
#   ./migrate.sh -h localhost -p 5432    # Custom host/port
#   ./migrate.sh --dry-run               # Show pending migrations without applying
#
# Environment variables:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# ============================================================================

set -euo pipefail

# ---- Defaults ---------------------------------------------------------------
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-migration_user}"
PGDATABASE="${PGDATABASE:-quckapp}"
DRY_RUN=false

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$(cd "${SCRIPT_DIR}/../migrations" && pwd)"

# ---- Parse optional flags ---------------------------------------------------
while [[ $# -gt 0 ]]; do
    case $1 in
        -h)         PGHOST="$2"; shift 2 ;;
        -p)         PGPORT="$2"; shift 2 ;;
        -u)         PGUSER="$2"; shift 2 ;;
        -d)         PGDATABASE="$2"; shift 2 ;;
        --dry-run)  DRY_RUN=true; shift ;;
        *)          echo "Unknown option: $1" && exit 1 ;;
    esac
done

# ---- Helpers ----------------------------------------------------------------
run_psql() {
    psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" \
         --dbname="${PGDATABASE}" --tuples-only --no-align "$@"
}

run_psql_file() {
    psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" \
         --dbname="${PGDATABASE}" --single-transaction --set ON_ERROR_STOP=on \
         -f "$1"
}

echo "============================================"
echo "QuckApp PostgreSQL Migration Runner"
echo "============================================"
echo "Host:       ${PGHOST}:${PGPORT}"
echo "Database:   ${PGDATABASE}"
echo "User:       ${PGUSER}"
echo "Migrations: ${MIGRATIONS_DIR}"
echo "Dry run:    ${DRY_RUN}"
echo "--------------------------------------------"

# ---- Ensure schema_migrations table exists ----------------------------------
run_psql -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(256) PRIMARY KEY,
    filename    VARCHAR(512) NOT NULL,
    checksum    VARCHAR(64)  NOT NULL,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
" --quiet

# ---- Discover and apply pending migrations ----------------------------------
APPLIED=0
SKIPPED=0
FAILED=0

for MIGRATION_FILE in $(ls "${MIGRATIONS_DIR}"/V*.sql 2>/dev/null | sort); do
    FILENAME=$(basename "${MIGRATION_FILE}")
    VERSION=$(echo "${FILENAME}" | sed -E 's/^(V[0-9]+)__.*/\1/')
    CHECKSUM=$(sha256sum "${MIGRATION_FILE}" | cut -d' ' -f1)

    # Check if already applied
    EXISTING=$(run_psql -c "SELECT version FROM schema_migrations WHERE version = '${VERSION}';")

    if [ -n "${EXISTING}" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if [ "${DRY_RUN}" = true ]; then
        echo "[PENDING] ${FILENAME}"
        APPLIED=$((APPLIED + 1))
        continue
    fi

    echo "[$(date '+%H:%M:%S')] Applying: ${FILENAME}..."

    if run_psql_file "${MIGRATION_FILE}"; then
        # Record successful migration
        run_psql -c "
            INSERT INTO schema_migrations (version, filename, checksum)
            VALUES ('${VERSION}', '${FILENAME}', '${CHECKSUM}');
        " --quiet
        echo "[$(date '+%H:%M:%S')] Applied:  ${FILENAME}"
        APPLIED=$((APPLIED + 1))
    else
        echo "[$(date '+%H:%M:%S')] FAILED:   ${FILENAME}"
        FAILED=$((FAILED + 1))
        echo "Migration failed. Stopping."
        exit 1
    fi
done

echo "--------------------------------------------"
if [ "${DRY_RUN}" = true ]; then
    echo "Pending:  ${APPLIED} migration(s)"
else
    echo "Applied:  ${APPLIED} migration(s)"
fi
echo "Skipped:  ${SKIPPED} (already applied)"
if [ "${FAILED}" -gt 0 ]; then
    echo "Failed:   ${FAILED}"
fi
echo "============================================"
