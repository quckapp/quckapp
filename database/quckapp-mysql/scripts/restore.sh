#!/usr/bin/env bash
# ============================================================================
# restore.sh - MySQL Restore Script for QuckApp
#
# Restores a QuckApp MySQL database from a gzipped mysqldump backup file.
# Supports both local files and S3 URIs.
#
# Usage:
#   ./restore.sh /tmp/quckapp-backups/quckapp_20260228_120000.sql.gz
#   ./restore.sh s3://my-backups/mysql/quckapp_20260228_120000.sql.gz
#
# Environment variables (with defaults):
#   MYSQL_HOST       - MySQL host          (default: 127.0.0.1)
#   MYSQL_PORT       - MySQL port          (default: 3306)
#   MYSQL_USER       - MySQL user          (default: migration_user)
#   MYSQL_PASSWORD   - MySQL password      (required)
#   MYSQL_DATABASE   - Database name       (default: quckapp)
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

BACKUP_FILE="${1:?Usage: $0 <backup-file.sql.gz or s3://bucket/path>}"

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
command -v mysql >/dev/null 2>&1 || { echo "ERROR: mysql client not found in PATH"; exit 1; }
command -v gzip  >/dev/null 2>&1 || { echo "ERROR: gzip not found in PATH";         exit 1; }

echo "=== QuckApp MySQL Restore ==="
echo "  Host:     ${MYSQL_HOST}:${MYSQL_PORT}"
echo "  Database: ${MYSQL_DATABASE}"
echo "  Source:   ${BACKUP_FILE}"
echo ""

# ---------------------------------------------------------------------------
# Safety confirmation
# ---------------------------------------------------------------------------
echo "WARNING: This will overwrite ALL data in the '${MYSQL_DATABASE}' database."
read -r -p "Type the database name to confirm: " CONFIRM

if [[ "${CONFIRM}" != "${MYSQL_DATABASE}" ]]; then
    echo "Confirmation did not match. Aborting."
    exit 1
fi

# ---------------------------------------------------------------------------
# Download from S3 if necessary
# ---------------------------------------------------------------------------
LOCAL_FILE="${BACKUP_FILE}"

if [[ "${BACKUP_FILE}" == s3://* ]]; then
    command -v aws >/dev/null 2>&1 || { echo "ERROR: aws CLI not found"; exit 1; }
    LOCAL_FILE="/tmp/quckapp_restore_$(date +%s).sql.gz"
    echo "[$(date +%T)] Downloading from S3..."
    aws s3 cp "${BACKUP_FILE}" "${LOCAL_FILE}"
    echo "[$(date +%T)] Download complete."
fi

if [[ ! -f "${LOCAL_FILE}" ]]; then
    echo "ERROR: File not found: ${LOCAL_FILE}"
    exit 1
fi

# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------
echo "[$(date +%T)] Restoring database..."

gunzip -c "${LOCAL_FILE}" | mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --default-character-set=utf8mb4 \
    "${MYSQL_DATABASE}"

echo "[$(date +%T)] Restore complete."

# Clean up temporary download
if [[ "${BACKUP_FILE}" == s3://* && -f "${LOCAL_FILE}" ]]; then
    rm -f "${LOCAL_FILE}"
fi

echo ""
echo "=== Restore finished successfully ==="
