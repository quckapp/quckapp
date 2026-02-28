#!/usr/bin/env bash
# ============================================================================
# ScyllaDB Backup Script for QuckApp
# Creates a snapshot of the quckapp keyspace using nodetool.
# ============================================================================
set -euo pipefail

SCYLLA_HOST="${SCYLLA_HOST:-localhost}"
SNAPSHOT_TAG="quckapp_$(date +%Y%m%d_%H%M%S)"
KEYSPACE="quckapp"

echo "==> Creating snapshot '${SNAPSHOT_TAG}' for keyspace '${KEYSPACE}'"

nodetool -h "$SCYLLA_HOST" snapshot -t "$SNAPSHOT_TAG" "$KEYSPACE"

echo "==> Snapshot created: ${SNAPSHOT_TAG}"
echo ""
echo "==> Snapshot locations:"
nodetool -h "$SCYLLA_HOST" listsnapshots | grep "$SNAPSHOT_TAG"
echo ""
echo "==> To restore: copy snapshot SSTables into the table data directory and run 'nodetool refresh'."
