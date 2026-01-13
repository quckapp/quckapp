#!/bin/bash
# =============================================================================
# LocalStack Initialization Script
# =============================================================================
# This script runs when LocalStack starts and creates AWS resources
# that mirror the production Terraform configuration.
# =============================================================================

set -e

echo "=========================================="
echo "Initializing LocalStack AWS Resources"
echo "=========================================="

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ENDPOINT="http://localhost:4566"

# Wait for LocalStack to be ready
echo "Waiting for LocalStack..."
while ! curl -s "$ENDPOINT/_localstack/health" | grep -q '"s3": "running"'; do
  sleep 1
done
echo "LocalStack is ready!"

# =============================================================================
# S3 Buckets
# =============================================================================
echo ""
echo "Creating S3 Buckets..."

# Media bucket
awslocal s3 mb s3://quikapp-media-dev --region $REGION 2>/dev/null || true
awslocal s3api put-bucket-cors --bucket quikapp-media-dev --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "http://localhost:5173"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-meta-custom-header"],
      "MaxAgeSeconds": 3600
    }
  ]
}'

# Thumbnails bucket
awslocal s3 mb s3://quikapp-thumbnails-dev --region $REGION 2>/dev/null || true

# Logs bucket
awslocal s3 mb s3://quikapp-logs-dev --region $REGION 2>/dev/null || true

echo "S3 Buckets created:"
awslocal s3 ls

# =============================================================================
# DynamoDB Tables
# =============================================================================
echo ""
echo "Creating DynamoDB Tables..."

# Media Metadata Table
awslocal dynamodb create-table \
  --table-name quikapp-dev-media-metadata \
  --attribute-definitions \
    AttributeName=mediaId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=mediaId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "userId-createdAt-index",
      "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }
  ]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || true

# User Sessions Table
awslocal dynamodb create-table \
  --table-name quikapp-dev-user-sessions \
  --attribute-definitions \
    AttributeName=sessionId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=sessionId,KeyType=HASH \
    AttributeName=userId,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || true

# Conversations Table
awslocal dynamodb create-table \
  --table-name quikapp-dev-conversations \
  --attribute-definitions \
    AttributeName=conversationId,AttributeType=S \
    AttributeName=messageId,AttributeType=S \
  --key-schema \
    AttributeName=conversationId,KeyType=HASH \
    AttributeName=messageId,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || true

# Rate Limiting Table
awslocal dynamodb create-table \
  --table-name quikapp-dev-rate-limits \
  --attribute-definitions \
    AttributeName=key,AttributeType=S \
  --key-schema \
    AttributeName=key,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || true

echo "DynamoDB Tables created:"
awslocal dynamodb list-tables --region $REGION

# =============================================================================
# SQS Queues
# =============================================================================
echo ""
echo "Creating SQS Queues..."

# Dead Letter Queue first
awslocal sqs create-queue \
  --queue-name quikapp-dev-media-processing-dlq \
  --region $REGION 2>/dev/null || true

DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/quikapp-dev-media-processing-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text --region $REGION)

# Media Processing Queue
awslocal sqs create-queue \
  --queue-name quikapp-dev-media-processing \
  --attributes '{
    "VisibilityTimeout": "360",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":3}"
  }' \
  --region $REGION 2>/dev/null || true

# Thumbnail Queue
awslocal sqs create-queue \
  --queue-name quikapp-dev-thumbnails \
  --attributes '{"VisibilityTimeout": "180"}' \
  --region $REGION 2>/dev/null || true

# Notification Queue
awslocal sqs create-queue \
  --queue-name quikapp-dev-notifications \
  --attributes '{"VisibilityTimeout": "60"}' \
  --region $REGION 2>/dev/null || true

echo "SQS Queues created:"
awslocal sqs list-queues --region $REGION

# =============================================================================
# SNS Topics
# =============================================================================
echo ""
echo "Creating SNS Topics..."

# Media Events Topic
awslocal sns create-topic \
  --name quikapp-media-events-dev \
  --region $REGION 2>/dev/null || true

# Alerts Topic
awslocal sns create-topic \
  --name quikapp-alerts-dev \
  --region $REGION 2>/dev/null || true

# User Notifications Topic
awslocal sns create-topic \
  --name quikapp-user-notifications-dev \
  --region $REGION 2>/dev/null || true

echo "SNS Topics created:"
awslocal sns list-topics --region $REGION

# =============================================================================
# Secrets Manager
# =============================================================================
echo ""
echo "Creating Secrets..."

# Database credentials
awslocal secretsmanager create-secret \
  --name quikapp/dev/database \
  --secret-string '{"username":"quikapp","password":"quikapp_dev","host":"postgres","port":5432,"dbname":"quikapp"}' \
  --region $REGION 2>/dev/null || true

# Redis credentials
awslocal secretsmanager create-secret \
  --name quikapp/dev/redis \
  --secret-string '{"host":"redis","port":6379}' \
  --region $REGION 2>/dev/null || true

# API keys
awslocal secretsmanager create-secret \
  --name quikapp/dev/api-keys \
  --secret-string '{"jwt_secret":"dev-jwt-secret-change-in-production","api_key":"dev-api-key"}' \
  --region $REGION 2>/dev/null || true

echo "Secrets created:"
awslocal secretsmanager list-secrets --region $REGION --query 'SecretList[].Name'

# =============================================================================
# KMS Keys
# =============================================================================
echo ""
echo "Creating KMS Keys..."

awslocal kms create-key \
  --description "QuikApp S3 media encryption key - dev" \
  --region $REGION 2>/dev/null || true

awslocal kms create-alias \
  --alias-name alias/quikapp-s3-media-dev \
  --target-key-id $(awslocal kms list-keys --region $REGION --query 'Keys[0].KeyId' --output text) \
  --region $REGION 2>/dev/null || true

echo "KMS Keys created:"
awslocal kms list-aliases --region $REGION --query 'Aliases[?starts_with(AliasName, `alias/quikapp`)].AliasName'

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=========================================="
echo "LocalStack Initialization Complete!"
echo "=========================================="
echo ""
echo "Endpoints:"
echo "  S3:              http://localhost:4566"
echo "  DynamoDB:        http://localhost:4566"
echo "  SQS:             http://localhost:4566"
echo "  SNS:             http://localhost:4566"
echo "  Secrets Manager: http://localhost:4566"
echo "  KMS:             http://localhost:4566"
echo ""
echo "AWS CLI Examples:"
echo "  aws --endpoint-url=http://localhost:4566 s3 ls"
echo "  aws --endpoint-url=http://localhost:4566 dynamodb list-tables"
echo ""
