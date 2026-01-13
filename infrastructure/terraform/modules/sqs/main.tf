# =============================================================================
# QuikApp SQS Module for Media Processing
# =============================================================================
# Creates SQS queues for:
# - Media processing (thumbnails, optimization)
# - Notification delivery
# - Export jobs
# - Dead letter queues for failed messages
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
    Module      = "sqs"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  # Queue names
  media_processing_queue_name = "quikapp-media-processing-${var.environment}"
  thumbnail_queue_name        = "quikapp-thumbnail-${var.environment}"
  video_processing_queue_name = "quikapp-video-processing-${var.environment}"
  notification_queue_name     = "quikapp-notifications-${var.environment}"
  export_queue_name           = "quikapp-export-${var.environment}"
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# Media Processing Queue
# =============================================================================

# Dead Letter Queue for Media Processing
resource "aws_sqs_queue" "media_processing_dlq" {
  count = var.create_media_processing_queue ? 1 : 0

  name = "${local.media_processing_queue_name}-dlq"

  message_retention_seconds  = var.dlq_message_retention_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout

  # Encryption
  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Media Processing DLQ"
    Purpose = "dead-letter-queue"
  })
}

# Main Media Processing Queue
resource "aws_sqs_queue" "media_processing" {
  count = var.create_media_processing_queue ? 1 : 0

  name = local.media_processing_queue_name

  # Message settings
  delay_seconds              = var.media_queue_delay_seconds
  max_message_size           = var.max_message_size
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.media_queue_visibility_timeout

  # Dead letter queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.media_processing_dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  })

  # Encryption
  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Media Processing Queue"
    Purpose = "media-processing"
  })
}

# Redrive allow policy for DLQ
resource "aws_sqs_queue_redrive_allow_policy" "media_processing_dlq" {
  count = var.create_media_processing_queue ? 1 : 0

  queue_url = aws_sqs_queue.media_processing_dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.media_processing[0].arn]
  })
}

# =============================================================================
# Thumbnail Processing Queue (High Priority)
# =============================================================================

resource "aws_sqs_queue" "thumbnail_dlq" {
  count = var.create_thumbnail_queue ? 1 : 0

  name = "${local.thumbnail_queue_name}-dlq"

  message_retention_seconds  = var.dlq_message_retention_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Thumbnail DLQ"
    Purpose = "dead-letter-queue"
  })
}

resource "aws_sqs_queue" "thumbnail" {
  count = var.create_thumbnail_queue ? 1 : 0

  name = local.thumbnail_queue_name

  # Thumbnails should be processed quickly
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KB
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.thumbnail_queue_visibility_timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.thumbnail_dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  })

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name     = "QuikApp Thumbnail Queue"
    Purpose  = "thumbnail-processing"
    Priority = "high"
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "thumbnail_dlq" {
  count = var.create_thumbnail_queue ? 1 : 0

  queue_url = aws_sqs_queue.thumbnail_dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.thumbnail[0].arn]
  })
}

# =============================================================================
# Video Processing Queue (Lower Priority, Longer Processing)
# =============================================================================

resource "aws_sqs_queue" "video_processing_dlq" {
  count = var.create_video_processing_queue ? 1 : 0

  name = "${local.video_processing_queue_name}-dlq"

  message_retention_seconds  = var.dlq_message_retention_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Video Processing DLQ"
    Purpose = "dead-letter-queue"
  })
}

resource "aws_sqs_queue" "video_processing" {
  count = var.create_video_processing_queue ? 1 : 0

  name = local.video_processing_queue_name

  # Videos take longer to process
  delay_seconds              = var.video_queue_delay_seconds
  max_message_size           = 262144
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.video_queue_visibility_timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.video_processing_dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  })

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name     = "QuikApp Video Processing Queue"
    Purpose  = "video-processing"
    Priority = "normal"
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "video_processing_dlq" {
  count = var.create_video_processing_queue ? 1 : 0

  queue_url = aws_sqs_queue.video_processing_dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.video_processing[0].arn]
  })
}

# =============================================================================
# Notification Queue
# =============================================================================

resource "aws_sqs_queue" "notification_dlq" {
  count = var.create_notification_queue ? 1 : 0

  name = "${local.notification_queue_name}-dlq"

  message_retention_seconds  = var.dlq_message_retention_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Notification DLQ"
    Purpose = "dead-letter-queue"
  })
}

resource "aws_sqs_queue" "notification" {
  count = var.create_notification_queue ? 1 : 0

  name = local.notification_queue_name

  # Notifications should be delivered quickly
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = var.notification_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.notification_queue_visibility_timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq[0].arn
    maxReceiveCount     = var.notification_max_receive_count
  })

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name     = "QuikApp Notification Queue"
    Purpose  = "notifications"
    Priority = "high"
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "notification_dlq" {
  count = var.create_notification_queue ? 1 : 0

  queue_url = aws_sqs_queue.notification_dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.notification[0].arn]
  })
}

# =============================================================================
# Export Queue (Large Data Exports)
# =============================================================================

resource "aws_sqs_queue" "export_dlq" {
  count = var.create_export_queue ? 1 : 0

  name = "${local.export_queue_name}-dlq"

  message_retention_seconds  = var.dlq_message_retention_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Export DLQ"
    Purpose = "dead-letter-queue"
  })
}

resource "aws_sqs_queue" "export" {
  count = var.create_export_queue ? 1 : 0

  name = local.export_queue_name

  # Exports can take a long time
  delay_seconds              = var.export_queue_delay_seconds
  max_message_size           = 262144
  message_retention_seconds  = var.export_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.export_queue_visibility_timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.export_dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  })

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name     = "QuikApp Export Queue"
    Purpose  = "data-export"
    Priority = "low"
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "export_dlq" {
  count = var.create_export_queue ? 1 : 0

  queue_url = aws_sqs_queue.export_dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.export[0].arn]
  })
}

# =============================================================================
# FIFO Queue for Ordered Processing (Optional)
# =============================================================================

resource "aws_sqs_queue" "ordered_processing_dlq" {
  count = var.create_fifo_queue ? 1 : 0

  name                       = "quikapp-ordered-processing-${var.environment}-dlq.fifo"
  fifo_queue                 = true
  content_based_deduplication = true

  message_retention_seconds  = var.dlq_message_retention_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Ordered Processing DLQ"
    Purpose = "dead-letter-queue"
    Type    = "FIFO"
  })
}

resource "aws_sqs_queue" "ordered_processing" {
  count = var.create_fifo_queue ? 1 : 0

  name                        = "quikapp-ordered-processing-${var.environment}.fifo"
  fifo_queue                  = true
  content_based_deduplication = var.fifo_content_deduplication
  deduplication_scope         = var.fifo_deduplication_scope
  fifo_throughput_limit       = var.fifo_throughput_limit

  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.fifo_visibility_timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ordered_processing_dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  })

  sqs_managed_sse_enabled = var.kms_key_arn == null
  kms_master_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Ordered Processing Queue"
    Purpose = "ordered-processing"
    Type    = "FIFO"
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "ordered_processing_dlq" {
  count = var.create_fifo_queue ? 1 : 0

  queue_url = aws_sqs_queue.ordered_processing_dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.ordered_processing[0].arn]
  })
}
