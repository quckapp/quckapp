#!/usr/bin/env bash
# ============================================================================
# migrate.sh - Run Database Migrations for QuckApp
#
# Supports two modes:
#   1. Flyway mode (default if Flyway is installed)
#   2. Manual mode (applies V*.sql files that haven't been run yet)
#
# The manual mode maintains a `schema_version` tracking table to record
# which migration files have already been applied.
#
# Usage:
#   ./migrate.sh                    # Auto-detect Flyway or manual
#   ./migrate.sh --manual           # Force manual mode
#   ./migrate.sh --flyway           # Force Flyway mode
#   ./migrate.sh --status           # Show applied migrations
#
# Environment variables (with defaults):
#   MYSQL_HOST       - MySQL host          (default: 127.0.0.1)
#   MYSQL_PORT       - MySQL port          (default: 3306)
#   MYSQL_USER       - MySQL user          (default: migration_user)
#   MYSQL_PASSWORD   - MySQL password      (required)
#   MYSQL_DATABASE   - Database name       (default: quckapp)
#   FLYWAY_CMD       - Path to Flyway      (default: flyway)
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
FLYWAY_CMD="${FLYWAY_CMD:-flyway}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "${SCRIPT_DIR}")"
MIGRATIONS_DIR="${BASE_DIR}/migrations"

MODE="${1:-auto}"

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
        "${MYSQL_DATABASE}" \
        "$@"
}

# ---------------------------------------------------------------------------
# Flyway mode
# ---------------------------------------------------------------------------
run_flyway() {
    echo "[$(date +%T)] Running Flyway migrate..."

    "${FLYWAY_CMD}" \
        -url="jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=utf8mb4" \
        -user="${MYSQL_USER}" \
        -password="${MYSQL_PASSWORD}" \
        -locations="filesystem:${MIGRATIONS_DIR}" \
        -connectRetries=3 \
        -baselineOnMigrate=true \
        migrate

    echo "[$(date +%T)] Flyway migration complete."
}

# ---------------------------------------------------------------------------
# Manual mode - schema version tracking
# ---------------------------------------------------------------------------
ensure_schema_version_table() {
    run_sql -e "
        CREATE TABLE IF NOT EXISTS \`schema_version\` (
            \`version\`     VARCHAR(50)  NOT NULL,
            \`filename\`    VARCHAR(255) NOT NULL,
            \`checksum\`    VARCHAR(64)  NOT NULL,
            \`applied_at\`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`execution_ms\` INT UNSIGNED NOT NULL DEFAULT 0,
            PRIMARY KEY (\`version\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    "
}

is_applied() {
    local version="$1"
    local count
    count=$(run_sql -N -e "SELECT COUNT(*) FROM schema_version WHERE version = '${version}';")
    [[ "${count}" -gt 0 ]]
}

run_manual() {
    echo "[$(date +%T)] Running manual migrations..."
    ensure_schema_version_table

    local applied=0

    for migration in "${MIGRATIONS_DIR}"/V*.sql; do
        [[ -f "${migration}" ]] || continue

        local filename
        filename=$(basename "${migration}")

        # Extract version from filename: V001__name.sql -> 001
        local version
        version=$(echo "${filename}" | sed -n 's/^V\([0-9]*\)__.*/\1/p')

        if is_applied "${version}"; then
            echo "  [SKIP] ${filename} (already applied)"
            continue
        fi

        echo "  [APPLY] ${filename}"
        local start_ms
        start_ms=$(date +%s%3N)

        run_sql < "${migration}"

        local end_ms
        end_ms=$(date +%s%3N)
        local duration=$(( end_ms - start_ms ))

        local checksum
        checksum=$(sha256sum "${migration}" | cut -d' ' -f1)

        run_sql -e "
            INSERT INTO schema_version (version, filename, checksum, execution_ms)
            VALUES ('${version}', '${filename}', '${checksum}', ${duration});
        "

        applied=$((applied + 1))
    done

    if [[ "${applied}" -eq 0 ]]; then
        echo "[$(date +%T)] No new migrations to apply."
    else
        echo "[$(date +%T)] Applied ${applied} migration(s)."
    fi
}

# ---------------------------------------------------------------------------
# Status display
# ---------------------------------------------------------------------------
show_status() {
    ensure_schema_version_table
    echo "=== Applied Migrations ==="
    run_sql -e "
        SELECT version, filename, applied_at, execution_ms
        FROM schema_version
        ORDER BY version;
    "
    echo ""

    echo "=== Pending Migrations ==="
    local pending=0
    for migration in "${MIGRATIONS_DIR}"/V*.sql; do
        [[ -f "${migration}" ]] || continue
        local filename
        filename=$(basename "${migration}")
        local version
        version=$(echo "${filename}" | sed -n 's/^V\([0-9]*\)__.*/\1/p')
        if ! is_applied "${version}"; then
            echo "  [PENDING] ${filename}"
            pending=$((pending + 1))
        fi
    done
    if [[ "${pending}" -eq 0 ]]; then
        echo "  (none)"
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo "=== QuckApp MySQL Migration ==="
echo "  Host:     ${MYSQL_HOST}:${MYSQL_PORT}"
echo "  Database: ${MYSQL_DATABASE}"
echo ""

case "${MODE}" in
    --status)
        show_status
        ;;
    --flyway)
        run_flyway
        ;;
    --manual)
        run_manual
        ;;
    auto|*)
        if command -v "${FLYWAY_CMD}" >/dev/null 2>&1; then
            echo "Flyway detected. Using Flyway mode."
            run_flyway
        else
            echo "Flyway not found. Using manual migration mode."
            run_manual
        fi
        ;;
esac

echo ""
echo "=== Migration finished ==="
