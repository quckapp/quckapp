# =============================================================================
# QuikApp DynamoDB Module
# =============================================================================
# Creates DynamoDB tables for:
# - Media metadata storage
# - User sessions
# - Notification history
# - Export job tracking
# - Rate limiting
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  common_tags = merge(var.tags, {
    Module      = "dynamodb"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  # Table names
  media_metadata_table_name  = "quikapp-media-metadata-${var.environment}"
  user_sessions_table_name   = "quikapp-user-sessions-${var.environment}"
  notifications_table_name   = "quikapp-notifications-${var.environment}"
  export_jobs_table_name     = "quikapp-export-jobs-${var.environment}"
  rate_limiting_table_name   = "quikapp-rate-limiting-${var.environment}"
  conversations_table_name   = "quikapp-conversations-${var.environment}"
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# Media Metadata Table
# =============================================================================
# Stores metadata for all uploaded media files

resource "aws_dynamodb_table" "media_metadata" {
  count = var.create_media_metadata_table ? 1 : 0

  name         = local.media_metadata_table_name
  billing_mode = var.billing_mode

  # Provisioned capacity (only used when billing_mode is PROVISIONED)
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.media_metadata_read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.media_metadata_write_capacity : null

  # Primary key
  hash_key  = "media_id"
  range_key = "upload_timestamp"

  # Attributes
  attribute {
    name = "media_id"
    type = "S"
  }

  attribute {
    name = "upload_timestamp"
    type = "N"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "conversation_id"
    type = "S"
  }

  attribute {
    name = "media_type"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI: Query by user
  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    range_key       = "upload_timestamp"
    projection_type = "ALL"

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # GSI: Query by conversation
  global_secondary_index {
    name            = "conversation-index"
    hash_key        = "conversation_id"
    range_key       = "upload_timestamp"
    projection_type = "ALL"

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # GSI: Query by media type
  global_secondary_index {
    name            = "media-type-index"
    hash_key        = "media_type"
    range_key       = "upload_timestamp"
    projection_type = "KEYS_ONLY"

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # GSI: Query by processing status
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "upload_timestamp"
    projection_type = "INCLUDE"
    non_key_attributes = ["media_id", "user_id", "media_type"]

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # TTL for automatic cleanup (optional)
  ttl {
    enabled        = var.enable_media_metadata_ttl
    attribute_name = "expires_at"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # DynamoDB Streams for CDC
  stream_enabled   = var.enable_streams
  stream_view_type = var.enable_streams ? var.stream_view_type : null

  # Deletion protection
  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name    = "QuikApp Media Metadata"
    Purpose = "media-metadata"
  })

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [
      read_capacity,
      write_capacity,
    ]
  }
}

# =============================================================================
# User Sessions Table
# =============================================================================
# Stores active user sessions for authentication

resource "aws_dynamodb_table" "user_sessions" {
  count = var.create_user_sessions_table ? 1 : 0

  name         = local.user_sessions_table_name
  billing_mode = var.billing_mode

  read_capacity  = var.billing_mode == "PROVISIONED" ? var.sessions_read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.sessions_write_capacity : null

  # Primary key
  hash_key = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "device_id"
    type = "S"
  }

  # GSI: Query sessions by user
  global_secondary_index {
    name            = "user-sessions-index"
    hash_key        = "user_id"
    projection_type = "ALL"

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # GSI: Query sessions by device
  global_secondary_index {
    name            = "device-sessions-index"
    hash_key        = "device_id"
    projection_type = "INCLUDE"
    non_key_attributes = ["session_id", "user_id", "created_at"]

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # TTL for session expiration
  ttl {
    enabled        = true
    attribute_name = "expires_at"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name    = "QuikApp User Sessions"
    Purpose = "user-sessions"
  })

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [
      read_capacity,
      write_capacity,
    ]
  }
}

# =============================================================================
# Notifications Table
# =============================================================================
# Stores notification history for users

resource "aws_dynamodb_table" "notifications" {
  count = var.create_notifications_table ? 1 : 0

  name         = local.notifications_table_name
  billing_mode = var.billing_mode

  read_capacity  = var.billing_mode == "PROVISIONED" ? var.notifications_read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.notifications_write_capacity : null

  # Primary key
  hash_key  = "user_id"
  range_key = "notification_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "notification_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  attribute {
    name = "is_read"
    type = "S"
  }

  # LSI: Query by creation time
  local_secondary_index {
    name            = "created-at-index"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI: Query unread notifications
  global_secondary_index {
    name            = "unread-index"
    hash_key        = "user_id"
    range_key       = "is_read"
    projection_type = "INCLUDE"
    non_key_attributes = ["notification_id", "type", "title", "created_at"]

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # TTL for notification cleanup
  ttl {
    enabled        = true
    attribute_name = "expires_at"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name    = "QuikApp Notifications"
    Purpose = "notifications"
  })

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [
      read_capacity,
      write_capacity,
    ]
  }
}

# =============================================================================
# Export Jobs Table
# =============================================================================
# Tracks data export job status and progress

resource "aws_dynamodb_table" "export_jobs" {
  count = var.create_export_jobs_table ? 1 : 0

  name         = local.export_jobs_table_name
  billing_mode = var.billing_mode

  read_capacity  = var.billing_mode == "PROVISIONED" ? var.export_jobs_read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.export_jobs_write_capacity : null

  # Primary key
  hash_key = "job_id"

  attribute {
    name = "job_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  # GSI: Query jobs by user
  global_secondary_index {
    name            = "user-jobs-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # GSI: Query jobs by status
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "created_at"
    projection_type = "INCLUDE"
    non_key_attributes = ["job_id", "user_id", "progress"]

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # TTL for job cleanup
  ttl {
    enabled        = true
    attribute_name = "expires_at"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name    = "QuikApp Export Jobs"
    Purpose = "export-jobs"
  })

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [
      read_capacity,
      write_capacity,
    ]
  }
}

# =============================================================================
# Rate Limiting Table
# =============================================================================
# Stores rate limiting counters for API throttling

resource "aws_dynamodb_table" "rate_limiting" {
  count = var.create_rate_limiting_table ? 1 : 0

  name         = local.rate_limiting_table_name
  billing_mode = "PAY_PER_REQUEST"  # Always on-demand for rate limiting

  # Primary key (composite of identifier type and value)
  hash_key  = "rate_key"
  range_key = "window_start"

  attribute {
    name = "rate_key"
    type = "S"
  }

  attribute {
    name = "window_start"
    type = "N"
  }

  # TTL for automatic cleanup of old rate limit windows
  ttl {
    enabled        = true
    attribute_name = "expires_at"
  }

  # No PITR needed for rate limiting (ephemeral data)
  point_in_time_recovery {
    enabled = false
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # No deletion protection for rate limiting table
  deletion_protection_enabled = false

  tags = merge(local.common_tags, {
    Name    = "QuikApp Rate Limiting"
    Purpose = "rate-limiting"
  })
}

# =============================================================================
# Conversations Table
# =============================================================================
# Stores conversation metadata and participant info

resource "aws_dynamodb_table" "conversations" {
  count = var.create_conversations_table ? 1 : 0

  name         = local.conversations_table_name
  billing_mode = var.billing_mode

  read_capacity  = var.billing_mode == "PROVISIONED" ? var.conversations_read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.conversations_write_capacity : null

  # Primary key
  hash_key = "conversation_id"

  attribute {
    name = "conversation_id"
    type = "S"
  }

  attribute {
    name = "participant_id"
    type = "S"
  }

  attribute {
    name = "last_message_at"
    type = "N"
  }

  # GSI: Query conversations by participant
  global_secondary_index {
    name            = "participant-index"
    hash_key        = "participant_id"
    range_key       = "last_message_at"
    projection_type = "ALL"

    read_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  stream_enabled   = var.enable_streams
  stream_view_type = var.enable_streams ? var.stream_view_type : null

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name    = "QuikApp Conversations"
    Purpose = "conversations"
  })

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [
      read_capacity,
      write_capacity,
    ]
  }
}

# =============================================================================
# Global Tables (Multi-Region Replication)
# =============================================================================

resource "aws_dynamodb_table_replica" "media_metadata_replica" {
  count = var.create_media_metadata_table && var.enable_global_tables ? 1 : 0

  global_table_arn = aws_dynamodb_table.media_metadata[0].arn
  region_name      = var.replica_region

  point_in_time_recovery = var.enable_point_in_time_recovery
  kms_key_arn           = var.replica_kms_key_arn

  tags = merge(local.common_tags, {
    Name   = "QuikApp Media Metadata Replica"
    Region = var.replica_region
  })
}

resource "aws_dynamodb_table_replica" "conversations_replica" {
  count = var.create_conversations_table && var.enable_global_tables ? 1 : 0

  global_table_arn = aws_dynamodb_table.conversations[0].arn
  region_name      = var.replica_region

  point_in_time_recovery = var.enable_point_in_time_recovery
  kms_key_arn           = var.replica_kms_key_arn

  tags = merge(local.common_tags, {
    Name   = "QuikApp Conversations Replica"
    Region = var.replica_region
  })
}
