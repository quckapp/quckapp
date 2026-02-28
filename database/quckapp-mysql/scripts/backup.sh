#!/usr/bin/env bash
# ============================================================================
# backup.sh - MySQL Backup Script for QuckApp
#
# Creates a gzipped mysqldump with a date-stamped filename, optionally
# uploads to an S3 bucket, and removes local backups older than a
# configurable retention period.
#
# Usage:
#   ./backup.sh
#   MYSQL_HOST=db.prod.internal MYSQL_DATABASE=quckapp ./backup.sh
#
# Environment variables (with defaults):
#   MYSQL_HOST       - MySQL host          (default: 127.0.0.1)
#   MYSQL_PORT       - MySQL port          (default: 3306)
#   MYSQL_USER       - MySQL user          (default: migration_user)
#   MYSQL_PASSWORD   - MySQL password      (required)
#   MYSQL_DATABASE   - Database name       (default: quckapp)
#   BACKUP_DIR       - Local backup path   (default: /tmp/quckapp-backups)
#   S3_BUCKET        - S3 bucket URI       (optional, e.g. s3://my-backups/mysql)
#   RETENTION_DAYS   - Days to keep local  (default: 7)
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
BACKUP_DIR="${BACKUP_DIR:-/tmp/quckapp-backups}"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}_${TIMESTAMP}.sql.gz"

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
command -v mysqldump >/dev/null 2>&1 || { echo "ERROR: mysqldump not found in PATH"; exit 1; }
command -v gzip      >/dev/null 2>&1 || { echo "ERROR: gzip not found in PATH";      exit 1; }

mkdir -p "${BACKUP_DIR}"

echo "=== QuckApp MySQL Backup ==="
echo "  Host:     ${MYSQL_HOST}:${MYSQL_PORT}"
echo "  Database: ${MYSQL_DATABASE}"
echo "  Output:   ${BACKUP_FILE}"
echo ""

# ---------------------------------------------------------------------------
# Dump
# ---------------------------------------------------------------------------
echo "[$(date +%T)] Starting mysqldump..."

mysqldump \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    "${MYSQL_DATABASE}" \
  | gzip > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date +%T)] Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# ---------------------------------------------------------------------------
# S3 Upload (optional)
# ---------------------------------------------------------------------------
if [[ -n "${S3_BUCKET}" ]]; then
    if command -v aws >/dev/null 2>&1; then
        echo "[$(date +%T)] Uploading to S3: ${S3_BUCKET}/"
        aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/$(basename "${BACKUP_FILE}")"
        echo "[$(date +%T)] S3 upload complete."
    else
        echo "WARNING: aws CLI not found - skipping S3 upload."
    fi
fi

# ---------------------------------------------------------------------------
# Retention cleanup
# ---------------------------------------------------------------------------
echo "[$(date +%T)] Removing local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${MYSQL_DATABASE}_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date +%T)] Cleanup complete."

echo ""
echo "=== Backup finished successfully ==="
