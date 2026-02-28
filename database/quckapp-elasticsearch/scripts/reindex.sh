#!/usr/bin/env bash
# ============================================================================
# Zero-Downtime Reindex Script for QuckApp Elasticsearch
# Usage: ./reindex.sh <source_index> <target_index> [alias]
# Example: ./reindex.sh users users_v2 users
# ============================================================================
set -euo pipefail

ES_HOST="${ES_HOST:-http://localhost:9200}"

SOURCE_INDEX="${1:?Usage: $0 <source_index> <target_index> [alias]}"
TARGET_INDEX="${2:?Usage: $0 <source_index> <target_index> [alias]}"
ALIAS="${3:-}"

echo "==> Reindexing: ${SOURCE_INDEX} -> ${TARGET_INDEX}"

# -- Verify source index exists ------------------------------------------------
if ! curl -sf -o /dev/null "${ES_HOST}/${SOURCE_INDEX}"; then
    echo "ERROR: Source index '${SOURCE_INDEX}' does not exist."
    exit 1
fi

# -- Create target index if it does not exist ----------------------------------
if ! curl -sf -o /dev/null "${ES_HOST}/${TARGET_INDEX}"; then
    echo "==> Target index '${TARGET_INDEX}' does not exist. Creating from source settings..."
    SOURCE_SETTINGS=$(curl -sf "${ES_HOST}/${SOURCE_INDEX}" | jq ".[\"${SOURCE_INDEX}\"]")
    MAPPINGS=$(echo "$SOURCE_SETTINGS" | jq '{mappings: .mappings}')
    SETTINGS=$(echo "$SOURCE_SETTINGS" | jq '{settings: {index: {number_of_shards: .settings.index.number_of_shards, number_of_replicas: .settings.index.number_of_replicas, analysis: .settings.index.analysis}}}')
    BODY=$(echo "$SETTINGS $MAPPINGS" | jq -s 'add')

    curl -sf -X PUT "${ES_HOST}/${TARGET_INDEX}" \
        -H "Content-Type: application/json" \
        -d "$BODY"
    echo ""
fi

# -- Execute reindex -----------------------------------------------------------
echo "==> Starting reindex task..."
TASK_RESPONSE=$(curl -sf -X POST "${ES_HOST}/_reindex?wait_for_completion=false" \
    -H "Content-Type: application/json" \
    -d "{
  \"source\": { \"index\": \"${SOURCE_INDEX}\" },
  \"dest\":   { \"index\": \"${TARGET_INDEX}\" },
  \"conflicts\": \"proceed\"
}")

TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.task')
echo "==> Reindex task started: ${TASK_ID}"

# -- Poll until complete -------------------------------------------------------
while true; do
    TASK_STATUS=$(curl -sf "${ES_HOST}/_tasks/${TASK_ID}")
    COMPLETED=$(echo "$TASK_STATUS" | jq -r '.completed')
    if [ "$COMPLETED" = "true" ]; then
        TOTAL=$(echo "$TASK_STATUS" | jq '.task.status.total')
        CREATED=$(echo "$TASK_STATUS" | jq '.task.status.created')
        echo "==> Reindex complete. Total: ${TOTAL}, Created: ${CREATED}"
        break
    fi
    sleep 5
    echo "    ...still reindexing"
done

# -- Swap alias (zero-downtime cutover) ----------------------------------------
if [ -n "$ALIAS" ]; then
    echo "==> Swapping alias '${ALIAS}': ${SOURCE_INDEX} -> ${TARGET_INDEX}"
    curl -sf -X POST "${ES_HOST}/_aliases" \
        -H "Content-Type: application/json" \
        -d "{
  \"actions\": [
    { \"remove\": { \"index\": \"${SOURCE_INDEX}\", \"alias\": \"${ALIAS}\" } },
    { \"add\":    { \"index\": \"${TARGET_INDEX}\", \"alias\": \"${ALIAS}\" } }
  ]
}"
    echo ""
    echo "==> Alias swapped. Old index '${SOURCE_INDEX}' still exists; delete manually when ready."
else
    echo "==> No alias specified. Swap aliases manually before deleting the old index."
fi

echo "==> Done."
