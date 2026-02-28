#!/usr/bin/env bash
# ============================================================================
# restore.sh - PostgreSQL restore for QuckApp
# Restores a gzipped SQL backup into the quckapp database.
#
# Usage:
#   ./restore.sh <backup_file.sql.gz>
#   ./restore.sh -h localhost -p 5432 backups/quckapp_20260101_120000.sql.gz
#
# Environment variables (override defaults):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# ============================================================================

set -euo pipefail

# ---- Defaults ---------------------------------------------------------------
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-migration_user}"
PGDATABASE="${PGDATABASE:-quckapp}"

# ---- Parse optional flags ---------------------------------------------------
while getopts "h:p:u:d:" opt; do
    case $opt in
        h) PGHOST="$OPTARG" ;;
        p) PGPORT="$OPTARG" ;;
        u) PGUSER="$OPTARG" ;;
        d) PGDATABASE="$OPTARG" ;;
        *) echo "Usage: $0 [-h host] [-p port] [-u user] [-d database] <backup_file>" && exit 1 ;;
    esac
done
shift $((OPTIND - 1))

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Error: No backup file specified."
    echo "Usage: $0 [-h host] [-p port] [-u user] [-d database] <backup_file.sql.gz>"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "============================================"
echo "QuckApp PostgreSQL Restore"
echo "============================================"
echo "Host:      ${PGHOST}:${PGPORT}"
echo "Database:  ${PGDATABASE}"
echo "User:      ${PGUSER}"
echo "Source:    ${BACKUP_FILE}"
echo "--------------------------------------------"
echo ""
echo "WARNING: This will overwrite data in '${PGDATABASE}'."
read -r -p "Are you sure? (y/N): " CONFIRM

if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# ---- Restore ----------------------------------------------------------------
echo "[$(date '+%H:%M:%S')] Starting restore..."

gunzip -c "${BACKUP_FILE}" | psql \
    --host="${PGHOST}" \
    --port="${PGPORT}" \
    --username="${PGUSER}" \
    --dbname="${PGDATABASE}" \
    --single-transaction \
    --set ON_ERROR_STOP=on \
    --quiet

echo "[$(date '+%H:%M:%S')] Restore complete."
echo "============================================"
echo "Restore finished successfully."
echo "============================================"
