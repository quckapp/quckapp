#!/usr/bin/env bash
# ============================================================================
# DynamoDB Local / LocalStack Init Script for QuckApp
# Automatically creates tables and seeds data on container startup.
# ============================================================================
set -euo pipefail

export DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-local}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-local}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/../scripts"

echo "==> DynamoDB Local init for QuckApp"
echo "    Endpoint: ${DYNAMODB_ENDPOINT}"

# Wait for DynamoDB Local to be available
echo "==> Waiting for DynamoDB Local..."
until aws dynamodb list-tables \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --region "$AWS_REGION" > /dev/null 2>&1; do
    sleep 1
done
echo "==> DynamoDB Local is ready."

# Create tables
echo "==> Creating tables..."
bash "${SCRIPTS_DIR}/create-tables.sh"

# Seed sample data
echo "==> Seeding sample data..."
bash "${SCRIPTS_DIR}/seed.sh"

echo "==> Init complete."
