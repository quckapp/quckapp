#!/usr/bin/env bash
# ============================================================================
# Seed DynamoDB Tables with Sample Data for QuckApp
# ============================================================================
set -euo pipefail

ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
REGION="${AWS_REGION:-us-east-1}"
AWS_OPTS="--region ${REGION} --endpoint-url ${ENDPOINT}"

FUTURE_EPOCH=$(date -d "+30 days" +%s 2>/dev/null || date -v+30d +%s)

echo "==> Seeding user_sessions table"

aws dynamodb put-item $AWS_OPTS \
    --table-name user_sessions \
    --item "{
        \"user_id\":    {\"S\": \"550e8400-e29b-41d4-a716-446655440001\"},
        \"session_id\": {\"S\": \"sess_abc123def456\"},
        \"token\":      {\"S\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample_token_1\"},
        \"device\":     {\"S\": \"web\"},
        \"ip_address\": {\"S\": \"192.168.1.10\"},
        \"user_agent\": {\"S\": \"Mozilla/5.0 Chrome/120.0\"},
        \"created_at\": {\"N\": \"$(date +%s)\"},
        \"expires_at\": {\"N\": \"${FUTURE_EPOCH}\"}
    }"

aws dynamodb put-item $AWS_OPTS \
    --table-name user_sessions \
    --item "{
        \"user_id\":    {\"S\": \"550e8400-e29b-41d4-a716-446655440001\"},
        \"session_id\": {\"S\": \"sess_ghi789jkl012\"},
        \"token\":      {\"S\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample_token_2\"},
        \"device\":     {\"S\": \"mobile\"},
        \"ip_address\": {\"S\": \"10.0.0.5\"},
        \"user_agent\": {\"S\": \"QuckApp-iOS/2.1.0\"},
        \"created_at\": {\"N\": \"$(date +%s)\"},
        \"expires_at\": {\"N\": \"${FUTURE_EPOCH}\"}
    }"

aws dynamodb put-item $AWS_OPTS \
    --table-name user_sessions \
    --item "{
        \"user_id\":    {\"S\": \"550e8400-e29b-41d4-a716-446655440002\"},
        \"session_id\": {\"S\": \"sess_mno345pqr678\"},
        \"token\":      {\"S\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample_token_3\"},
        \"device\":     {\"S\": \"desktop\"},
        \"ip_address\": {\"S\": \"172.16.0.20\"},
        \"user_agent\": {\"S\": \"QuckApp-Desktop/1.5.0\"},
        \"created_at\": {\"N\": \"$(date +%s)\"},
        \"expires_at\": {\"N\": \"${FUTURE_EPOCH}\"}
    }"

echo "==> Seeding rate_limits table"

NEAR_EPOCH=$(date -d "+1 minute" +%s 2>/dev/null || date -v+1M +%s)

aws dynamodb put-item $AWS_OPTS \
    --table-name rate_limits \
    --item "{
        \"resource_key\": {\"S\": \"api:550e8400-e29b-41d4-a716-446655440001:/api/messages\"},
        \"request_count\":{\"N\": \"42\"},
        \"window_start\": {\"N\": \"$(date +%s)\"},
        \"limit\":        {\"N\": \"100\"},
        \"expires_at\":   {\"N\": \"${NEAR_EPOCH}\"}
    }"

aws dynamodb put-item $AWS_OPTS \
    --table-name rate_limits \
    --item "{
        \"resource_key\": {\"S\": \"login:192.168.1.10\"},
        \"request_count\":{\"N\": \"3\"},
        \"window_start\": {\"N\": \"$(date +%s)\"},
        \"limit\":        {\"N\": \"5\"},
        \"expires_at\":   {\"N\": \"${NEAR_EPOCH}\"}
    }"

echo "==> Seed data inserted."
echo ""
echo "==> Verify:"
echo "    aws dynamodb scan $AWS_OPTS --table-name user_sessions"
echo "    aws dynamodb scan $AWS_OPTS --table-name rate_limits"
