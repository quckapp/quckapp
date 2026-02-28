#!/usr/bin/env bash
# ============================================================================
# ClickHouse Backup Script for QuckApp
# Creates a named backup of all QuckApp tables.
# ============================================================================
set -euo pipefail

CH_HOST="${CH_HOST:-localhost}"
CH_PORT="${CH_PORT:-9000}"
CH_DATABASE="${CH_DATABASE:-default}"
BACKUP_NAME="quckapp_$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="/var/lib/clickhouse/backup"

echo "==> Starting ClickHouse backup: ${BACKUP_NAME}"

# List tables to back up
TABLES=$(clickhouse-client \
    --host "$CH_HOST" \
    --port "$CH_PORT" \
    --database "$CH_DATABASE" \
    --query "SELECT name FROM system.tables WHERE database = '${CH_DATABASE}' AND engine NOT LIKE '%View%' FORMAT TSVRaw")

if [ -z "$TABLES" ]; then
    echo "ERROR: No tables found in database '${CH_DATABASE}'."
    exit 1
fi

# Freeze each table (creates hard-link snapshot)
for TABLE in $TABLES; do
    echo "    Freezing table: ${TABLE}"
    clickhouse-client \
        --host "$CH_HOST" \
        --port "$CH_PORT" \
        --database "$CH_DATABASE" \
        --query "ALTER TABLE ${TABLE} FREEZE WITH NAME '${BACKUP_NAME}'"
done

echo "==> Backup snapshot created at: ${BACKUP_DIR}/${BACKUP_NAME}"
echo "==> Tables backed up:"
echo "$TABLES" | sed 's/^/    /'
echo ""
echo "==> To restore, copy the backup directory and use ATTACH/RESTORE commands."
