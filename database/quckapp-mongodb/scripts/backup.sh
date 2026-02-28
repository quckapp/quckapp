#!/usr/bin/env bash
# ==============================================================================
# QuckApp MongoDB Backup Script
# Uses mongodump with gzip compression and dated output directories.
#
# Usage:
#   ./scripts/backup.sh                        # Backup with defaults
#   ./scripts/backup.sh --uri "mongodb://..."   # Custom connection URI
#   BACKUP_DIR=/mnt/backups ./scripts/backup.sh # Custom output location
#
# Environment variables:
#   MONGO_URI     - MongoDB connection string (default: mongodb://localhost:27017)
#   MONGO_DB      - Database name to back up (default: quckapp)
#   BACKUP_DIR    - Root directory for backups (default: ./backups)
#   MONGO_USER    - Username for authentication (default: quckapp_backup)
#   MONGO_PASS    - Password for authentication
#   RETENTION_DAYS - Number of days to keep old backups (default: 30)
# ==============================================================================

set -euo pipefail

# --- Configuration -----------------------------------------------------------
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
MONGO_DB="${MONGO_DB:-quckapp}"
BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
MONGO_USER="${MONGO_USER:-quckapp_backup}"
MONGO_PASS="${MONGO_PASS:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# --- Derived values -----------------------------------------------------------
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DIR=$(date +"%Y-%m-%d")
OUTPUT_DIR="${BACKUP_DIR}/${DATE_DIR}/${MONGO_DB}_${TIMESTAMP}"

# --- Functions ----------------------------------------------------------------
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

die() {
  log "ERROR: $*" >&2
  exit 1
}

# --- Pre-flight checks --------------------------------------------------------
command -v mongodump >/dev/null 2>&1 || die "mongodump not found. Install MongoDB Database Tools."

log "=== QuckApp MongoDB Backup ==="
log "Database : ${MONGO_DB}"
log "URI      : ${MONGO_URI}"
log "Output   : ${OUTPUT_DIR}"

# --- Create output directory --------------------------------------------------
mkdir -p "${OUTPUT_DIR}"

# --- Build mongodump command --------------------------------------------------
DUMP_ARGS=(
  --uri="${MONGO_URI}"
  --db="${MONGO_DB}"
  --out="${OUTPUT_DIR}"
  --gzip
  --numParallelCollections=4
)

# Add authentication if password is set
if [[ -n "${MONGO_PASS}" ]]; then
  DUMP_ARGS+=(
    --username="${MONGO_USER}"
    --password="${MONGO_PASS}"
    --authenticationDatabase="admin"
  )
fi

# Pass through any extra arguments
DUMP_ARGS+=("$@")

# --- Execute backup -----------------------------------------------------------
log "Starting mongodump..."

if mongodump "${DUMP_ARGS[@]}"; then
  # Calculate backup size
  BACKUP_SIZE=$(du -sh "${OUTPUT_DIR}" | cut -f1)
  FILE_COUNT=$(find "${OUTPUT_DIR}" -type f | wc -l)

  log "Backup completed successfully."
  log "  Size  : ${BACKUP_SIZE}"
  log "  Files : ${FILE_COUNT}"
  log "  Path  : ${OUTPUT_DIR}"

  # Write metadata file
  cat > "${OUTPUT_DIR}/backup_metadata.json" <<EOF
{
  "database": "${MONGO_DB}",
  "timestamp": "${TIMESTAMP}",
  "uri": "${MONGO_URI}",
  "size": "${BACKUP_SIZE}",
  "file_count": ${FILE_COUNT},
  "tool": "mongodump",
  "compression": "gzip",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
else
  die "mongodump failed. Check connection and credentials."
fi

# --- Cleanup old backups ------------------------------------------------------
if [[ "${RETENTION_DAYS}" -gt 0 ]]; then
  log "Cleaning up backups older than ${RETENTION_DAYS} days..."
  DELETED=$(find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -print -exec rm -rf {} \; | wc -l)
  log "  Removed ${DELETED} old backup directories."
fi

log "=== Backup complete ==="
