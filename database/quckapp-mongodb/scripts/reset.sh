#!/usr/bin/env bash
# ==============================================================================
# QuckApp MongoDB Reset Script
# Drops the quckapp database and optionally re-runs migrations and seeds.
#
# SAFETY: Refuses to run if NODE_ENV, MIX_ENV, or APP_ENV is set to "production".
#
# Usage:
#   ./scripts/reset.sh              # Drop and re-migrate
#   ./scripts/reset.sh --seed       # Drop, migrate, and seed
#   ./scripts/reset.sh --drop-only  # Just drop, no migrations
#
# Environment variables:
#   MONGO_URI  - MongoDB connection string (default: mongodb://localhost:27017)
#   MONGO_DB   - Database name (default: quckapp)
#   NODE_ENV   - Must NOT be "production"
#   MIX_ENV    - Must NOT be "prod"
#   APP_ENV    - Must NOT be "production"
# ==============================================================================

set -euo pipefail

# --- Configuration -----------------------------------------------------------
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
MONGO_DB="${MONGO_DB:-quckapp}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SEED=false
DROP_ONLY=false

# --- Parse arguments ----------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed)     SEED=true; shift ;;
    --drop-only) DROP_ONLY=true; shift ;;
    *)          echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# --- Functions ----------------------------------------------------------------
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

die() {
  log "ERROR: $*" >&2
  exit 1
}

# --- Production guard ---------------------------------------------------------
if [[ "${NODE_ENV:-}" == "production" ]] || \
   [[ "${MIX_ENV:-}" == "prod" ]] || \
   [[ "${APP_ENV:-}" == "production" ]]; then
  die "REFUSING to reset database in production environment!"
fi

log "=== QuckApp MongoDB Reset ==="
log "Database : ${MONGO_DB}"
log "URI      : ${MONGO_URI}"

# --- Safety confirmation ------------------------------------------------------
echo ""
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "  WARNING: This will PERMANENTLY DELETE the '${MONGO_DB}' database!"
echo "  ALL data will be lost. This action cannot be undone."
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo ""
read -r -p "Type the database name to confirm: " confirm

if [[ "${confirm}" != "${MONGO_DB}" ]]; then
  log "Confirmation failed. Reset cancelled."
  exit 1
fi

# --- Drop database ------------------------------------------------------------
log "Dropping database '${MONGO_DB}'..."

mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --eval "
  const result = db.dropDatabase();
  if (result.ok === 1) {
    print('Database dropped successfully.');
  } else {
    print('Failed to drop database: ' + tojson(result));
    quit(1);
  }
"

log "Database '${MONGO_DB}' dropped."

# --- Re-run migrations --------------------------------------------------------
if [[ "${DROP_ONLY}" == "false" ]]; then
  log "Re-running migrations..."
  "${SCRIPT_DIR}/migrate.sh"

  log "Applying schema validators..."
  mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --file "${BASE_DIR}/schema/validators/apply_validators.js"
fi

# --- Seed data ----------------------------------------------------------------
if [[ "${SEED}" == "true" ]]; then
  log "Seeding development data..."

  for seed_file in "${BASE_DIR}"/seeds/dev/*.js; do
    if [[ -f "${seed_file}" ]]; then
      log "  Running: $(basename "${seed_file}")"
      mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --file "${seed_file}"
    fi
  done

  log "Seeding complete."
fi

# --- Summary ------------------------------------------------------------------
log "Verifying reset:"
mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --eval "
  const colls = db.getCollectionNames();
  print('  Collections: ' + colls.length);
  colls.forEach(function(coll) {
    var count = db.getCollection(coll).countDocuments({});
    print('    ' + coll + ': ' + count + ' documents');
  });
"

log "=== Reset complete ==="
