#!/usr/bin/env bash
# ==============================================================================
# QuckApp MongoDB Restore Script
# Restores from a mongodump backup (gzip compressed).
#
# Usage:
#   ./scripts/restore.sh <backup_path>
#   ./scripts/restore.sh backups/2026-02-28/quckapp_20260228_120000
#
# Environment variables:
#   MONGO_URI     - MongoDB connection string (default: mongodb://localhost:27017)
#   MONGO_DB      - Target database name (default: quckapp)
#   MONGO_USER    - Username for authentication (default: quckapp_backup)
#   MONGO_PASS    - Password for authentication
# ==============================================================================

set -euo pipefail

# --- Configuration -----------------------------------------------------------
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
MONGO_DB="${MONGO_DB:-quckapp}"
MONGO_USER="${MONGO_USER:-quckapp_backup}"
MONGO_PASS="${MONGO_PASS:-}"

# --- Functions ----------------------------------------------------------------
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

die() {
  log "ERROR: $*" >&2
  exit 1
}

# --- Argument validation ------------------------------------------------------
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup_path>"
  echo ""
  echo "  backup_path  Path to the backup directory created by backup.sh"
  echo ""
  echo "Available backups:"
  SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  if [[ -d "${SCRIPT_DIR}/backups" ]]; then
    find "${SCRIPT_DIR}/backups" -mindepth 2 -maxdepth 2 -type d | sort -r | head -10
  else
    echo "  No backups found in ${SCRIPT_DIR}/backups/"
  fi
  exit 1
fi

BACKUP_PATH="$1"

# --- Pre-flight checks --------------------------------------------------------
command -v mongorestore >/dev/null 2>&1 || die "mongorestore not found. Install MongoDB Database Tools."

[[ -d "${BACKUP_PATH}" ]] || die "Backup path does not exist: ${BACKUP_PATH}"

# Check for the database subdirectory within the backup
RESTORE_DIR="${BACKUP_PATH}"
if [[ -d "${BACKUP_PATH}/${MONGO_DB}" ]]; then
  RESTORE_DIR="${BACKUP_PATH}/${MONGO_DB}"
fi

log "=== QuckApp MongoDB Restore ==="
log "Source DB : ${MONGO_DB}"
log "Backup   : ${RESTORE_DIR}"
log "Target   : ${MONGO_URI}/${MONGO_DB}"

# --- Safety confirmation ------------------------------------------------------
echo ""
echo "WARNING: This will restore data into '${MONGO_DB}' at ${MONGO_URI}."
echo "         Existing documents with matching _id values will be overwritten."
echo ""
read -r -p "Continue? [y/N] " confirm
case "${confirm}" in
  [yY][eE][sS]|[yY]) ;;
  *) log "Restore cancelled."; exit 0 ;;
esac

# --- Build mongorestore command -----------------------------------------------
RESTORE_ARGS=(
  --uri="${MONGO_URI}"
  --db="${MONGO_DB}"
  --dir="${RESTORE_DIR}"
  --gzip
  --numParallelCollections=4
  --numInsertionWorkersPerCollection=2
  --drop
)

# Add authentication if password is set
if [[ -n "${MONGO_PASS}" ]]; then
  RESTORE_ARGS+=(
    --username="${MONGO_USER}"
    --password="${MONGO_PASS}"
    --authenticationDatabase="admin"
  )
fi

# --- Execute restore ----------------------------------------------------------
log "Starting mongorestore..."

if mongorestore "${RESTORE_ARGS[@]}"; then
  log "Restore completed successfully."

  # Show collection counts
  log "Verifying restored collections:"
  mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --eval "
    db.getCollectionNames().forEach(function(coll) {
      var count = db.getCollection(coll).countDocuments({});
      print('  ' + coll + ': ' + count + ' documents');
    });
  "
else
  die "mongorestore failed. Check backup integrity and connection."
fi

log "=== Restore complete ==="
