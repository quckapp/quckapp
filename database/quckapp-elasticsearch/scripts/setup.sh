#!/usr/bin/env bash
# ============================================================================
# Elasticsearch Setup Script for QuckApp
# Creates ILM policies, index templates, and initial indices.
# ============================================================================
set -euo pipefail

ES_HOST="${ES_HOST:-http://localhost:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Waiting for Elasticsearch at ${ES_HOST}..."
until curl -sf "${ES_HOST}/_cluster/health" > /dev/null 2>&1; do
    sleep 2
done
echo "==> Elasticsearch is ready."

# -- ILM Policy ---------------------------------------------------------------
echo "==> Creating ILM policy: message_lifecycle"
curl -sf -X PUT "${ES_HOST}/_ilm/policy/message_lifecycle" \
    -H "Content-Type: application/json" \
    -d @"${ROOT_DIR}/ilm/message_lifecycle.json"
echo ""

# -- Index Templates -----------------------------------------------------------
echo "==> Creating index template: message_template"
curl -sf -X PUT "${ES_HOST}/_index_template/message_template" \
    -H "Content-Type: application/json" \
    -d @"${ROOT_DIR}/templates/message_template.json"
echo ""

# -- Analyzer Settings (used as base for standalone indices) -------------------
SETTINGS=$(cat "${ROOT_DIR}/settings/analyzer_settings.json")

# -- Users Index ---------------------------------------------------------------
echo "==> Creating index: users"
USERS_MAPPING=$(cat "${ROOT_DIR}/mappings/users.json")
USERS_BODY=$(jq -s '.[0] * .[1]' \
    <(echo "$SETTINGS") \
    <(echo "$USERS_MAPPING"))

curl -sf -X PUT "${ES_HOST}/users" \
    -H "Content-Type: application/json" \
    -d "$USERS_BODY"
echo ""

# -- Channels Index ------------------------------------------------------------
echo "==> Creating index: channels"
CHANNELS_MAPPING=$(cat "${ROOT_DIR}/mappings/channels.json")
CHANNELS_BODY=$(jq -s '.[0] * .[1]' \
    <(echo "$SETTINGS") \
    <(echo "$CHANNELS_MAPPING"))

curl -sf -X PUT "${ES_HOST}/channels" \
    -H "Content-Type: application/json" \
    -d "$CHANNELS_BODY"
echo ""

# -- Bootstrap message rollover alias ------------------------------------------
echo "==> Creating initial message index with rollover alias"
curl -sf -X PUT "${ES_HOST}/message-000001" \
    -H "Content-Type: application/json" \
    -d '{
  "aliases": {
    "messages": {
      "is_write_index": true
    }
  }
}'
echo ""

echo "==> Setup complete."
