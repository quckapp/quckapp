#!/usr/bin/env bash
# ==============================================================================
# QuckApp MongoDB Migration Runner
# Executes migration JavaScript files in numerical order.
#
# Tracks applied migrations in a `_migrations` collection to avoid re-running.
#
# Usage:
#   ./scripts/migrate.sh               # Run all pending migrations
#   ./scripts/migrate.sh --force       # Re-run all migrations (ignore tracking)
#   ./scripts/migrate.sh --status      # Show migration status
#
# Environment variables:
#   MONGO_URI  - MongoDB connection string (default: mongodb://localhost:27017)
#   MONGO_DB   - Database name (default: quckapp)
# ==============================================================================

set -euo pipefail

# --- Configuration -----------------------------------------------------------
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
MONGO_DB="${MONGO_DB:-quckapp}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$(cd "${SCRIPT_DIR}/../migrations" && pwd)"

FORCE=false
STATUS_ONLY=false

# --- Parse arguments ----------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)  FORCE=true; shift ;;
    --status) STATUS_ONLY=true; shift ;;
    *)        echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# --- Functions ----------------------------------------------------------------
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

die() {
  log "ERROR: $*" >&2
  exit 1
}

# --- Pre-flight checks --------------------------------------------------------
command -v mongosh >/dev/null 2>&1 || die "mongosh not found. Install MongoDB Shell."

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  die "Migrations directory not found: ${MIGRATIONS_DIR}"
fi

# --- Status mode --------------------------------------------------------------
if [[ "${STATUS_ONLY}" == "true" ]]; then
  log "=== Migration Status ==="
  mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --eval "
    const applied = db._migrations.find({}).sort({ filename: 1 }).toArray();
    if (applied.length === 0) {
      print('  No migrations have been applied yet.');
    } else {
      applied.forEach(function(m) {
        print('  [APPLIED] ' + m.filename + ' — ' + m.applied_at.toISOString());
      });
    }
  "
  exit 0
fi

# --- Collect migration files --------------------------------------------------
mapfile -t MIGRATION_FILES < <(find "${MIGRATIONS_DIR}" -name "*.js" -type f | sort)

if [[ ${#MIGRATION_FILES[@]} -eq 0 ]]; then
  log "No migration files found in ${MIGRATIONS_DIR}"
  exit 0
fi

log "=== QuckApp MongoDB Migration Runner ==="
log "Database   : ${MONGO_DB}"
log "URI        : ${MONGO_URI}"
log "Migrations : ${MIGRATIONS_DIR}"
log "Files found: ${#MIGRATION_FILES[@]}"
echo ""

# --- Ensure _migrations tracking collection exists ----------------------------
mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --eval "
  if (!db.getCollectionNames().includes('_migrations')) {
    db.createCollection('_migrations');
    db._migrations.createIndex({ filename: 1 }, { unique: true });
  }
"

# --- Run migrations -----------------------------------------------------------
APPLIED=0
SKIPPED=0
FAILED=0

for migration_file in "${MIGRATION_FILES[@]}"; do
  filename=$(basename "${migration_file}")

  # Check if already applied (unless --force)
  if [[ "${FORCE}" == "false" ]]; then
    already_applied=$(mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --eval "
      const count = db._migrations.countDocuments({ filename: '${filename}' });
      print(count);
    ")

    if [[ "${already_applied}" -gt 0 ]]; then
      log "  [SKIP] ${filename} (already applied)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi
  fi

  # Run the migration
  log "  [RUN]  ${filename}..."

  if mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --file "${migration_file}"; then
    # Record successful migration
    mongosh "${MONGO_URI}/${MONGO_DB}" --quiet --eval "
      db._migrations.updateOne(
        { filename: '${filename}' },
        {
          \$set: {
            filename: '${filename}',
            applied_at: new Date(),
            checksum: '$(md5sum "${migration_file}" | cut -d' ' -f1)'
          }
        },
        { upsert: true }
      );
    "
    APPLIED=$((APPLIED + 1))
  else
    log "  [FAIL] ${filename} — migration failed!"
    FAILED=$((FAILED + 1))
    die "Migration ${filename} failed. Fix the issue and retry."
  fi
done

# --- Summary ------------------------------------------------------------------
echo ""
log "=== Migration Summary ==="
log "  Applied : ${APPLIED}"
log "  Skipped : ${SKIPPED}"
log "  Failed  : ${FAILED}"
log "  Total   : ${#MIGRATION_FILES[@]}"

if [[ ${FAILED} -gt 0 ]]; then
  exit 1
fi

log "=== Migrations complete ==="
