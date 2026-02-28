#!/usr/bin/env bash
# ============================================================================
# backup.sh - PostgreSQL backup for QuckApp
# Creates a gzipped pg_dump of the quckapp database.
#
# Usage:
#   ./backup.sh                          # Uses defaults
#   ./backup.sh -h localhost -p 5432     # Custom host/port
#
# Environment variables (override defaults):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   BACKUP_DIR   - Directory to store backups (default: ./backups)
#   BACKUP_RETAIN_DAYS - Days to retain old backups (default: 30)
# ============================================================================

set -euo pipefail

# ---- Defaults ---------------------------------------------------------------
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-migration_user}"
PGDATABASE="${PGDATABASE:-quckapp}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"

# ---- Parse optional flags ---------------------------------------------------
while getopts "h:p:u:d:" opt; do
    case $opt in
        h) PGHOST="$OPTARG" ;;
        p) PGPORT="$OPTARG" ;;
        u) PGUSER="$OPTARG" ;;
        d) PGDATABASE="$OPTARG" ;;
        *) echo "Usage: $0 [-h host] [-p port] [-u user] [-d database]" && exit 1 ;;
    esac
done

# ---- Setup ------------------------------------------------------------------
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "============================================"
echo "QuckApp PostgreSQL Backup"
echo "============================================"
echo "Host:      ${PGHOST}:${PGPORT}"
echo "Database:  ${PGDATABASE}"
echo "User:      ${PGUSER}"
echo "Output:    ${BACKUP_FILE}"
echo "--------------------------------------------"

# ---- Backup -----------------------------------------------------------------
echo "[$(date '+%H:%M:%S')] Starting pg_dump..."

pg_dump \
    --host="${PGHOST}" \
    --port="${PGPORT}" \
    --username="${PGUSER}" \
    --dbname="${PGDATABASE}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --verbose \
    2>&1 | gzip > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date '+%H:%M:%S')] Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# ---- Prune old backups ------------------------------------------------------
if [ "${BACKUP_RETAIN_DAYS}" -gt 0 ]; then
    echo "[$(date '+%H:%M:%S')] Pruning backups older than ${BACKUP_RETAIN_DAYS} days..."
    PRUNED=$(find "${BACKUP_DIR}" -name "${PGDATABASE}_*.sql.gz" -mtime +"${BACKUP_RETAIN_DAYS}" -delete -print | wc -l)
    echo "[$(date '+%H:%M:%S')] Pruned ${PRUNED} old backup(s)."
fi

echo "============================================"
echo "Backup finished successfully."
echo "============================================"
