#!/usr/bin/env bash
# ============================================================================
# Create DynamoDB Tables for QuckApp
# Works with AWS DynamoDB or DynamoDB Local / LocalStack.
# ============================================================================
set -euo pipefail

ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TABLES_DIR="${SCRIPT_DIR}/../tables"

AWS_OPTS="--region ${REGION} --endpoint-url ${ENDPOINT}"

echo "==> Creating DynamoDB tables at ${ENDPOINT}"

# -- user_sessions table -------------------------------------------------------
TABLE_DEF=$(cat "${TABLES_DIR}/user_sessions.json")
TABLE_NAME=$(echo "$TABLE_DEF" | jq -r '.TableName')

echo "    Creating table: ${TABLE_NAME}"
aws dynamodb create-table $AWS_OPTS \
    --table-name "$TABLE_NAME" \
    --key-schema "$(echo "$TABLE_DEF" | jq -c '.KeySchema')" \
    --attribute-definitions "$(echo "$TABLE_DEF" | jq -c '.AttributeDefinitions')" \
    --global-secondary-indexes "$(echo "$TABLE_DEF" | jq -c '.GlobalSecondaryIndexes')" \
    --provisioned-throughput "$(echo "$TABLE_DEF" | jq -c '.ProvisionedThroughput')" \
    --tags "$(echo "$TABLE_DEF" | jq -c '.Tags')" \
    2>/dev/null || echo "    Table '${TABLE_NAME}' already exists."

# Enable TTL
TTL_SPEC=$(echo "$TABLE_DEF" | jq -c '.TimeToLiveSpecification')
TTL_ATTR=$(echo "$TTL_SPEC" | jq -r '.AttributeName')
echo "    Enabling TTL on ${TABLE_NAME}.${TTL_ATTR}"
aws dynamodb update-time-to-live $AWS_OPTS \
    --table-name "$TABLE_NAME" \
    --time-to-live-specification "$TTL_SPEC" \
    2>/dev/null || echo "    TTL already enabled."

# -- rate_limits table ---------------------------------------------------------
TABLE_DEF=$(cat "${TABLES_DIR}/rate_limits.json")
TABLE_NAME=$(echo "$TABLE_DEF" | jq -r '.TableName')

echo "    Creating table: ${TABLE_NAME}"
aws dynamodb create-table $AWS_OPTS \
    --table-name "$TABLE_NAME" \
    --key-schema "$(echo "$TABLE_DEF" | jq -c '.KeySchema')" \
    --attribute-definitions "$(echo "$TABLE_DEF" | jq -c '.AttributeDefinitions')" \
    --provisioned-throughput "$(echo "$TABLE_DEF" | jq -c '.ProvisionedThroughput')" \
    --tags "$(echo "$TABLE_DEF" | jq -c '.Tags')" \
    2>/dev/null || echo "    Table '${TABLE_NAME}' already exists."

# Enable TTL
TTL_SPEC=$(echo "$TABLE_DEF" | jq -c '.TimeToLiveSpecification')
TTL_ATTR=$(echo "$TTL_SPEC" | jq -r '.AttributeName')
echo "    Enabling TTL on ${TABLE_NAME}.${TTL_ATTR}"
aws dynamodb update-time-to-live $AWS_OPTS \
    --table-name "$TABLE_NAME" \
    --time-to-live-specification "$TTL_SPEC" \
    2>/dev/null || echo "    TTL already enabled."

# -- List tables ---------------------------------------------------------------
echo ""
echo "==> Tables created:"
aws dynamodb list-tables $AWS_OPTS --output table
