# =============================================================================
# QuikApp SNS Module for Notifications
# =============================================================================
# Creates SNS topics for:
# - Media processing events (completion, failure)
# - System alerts and alarms
# - User notifications (email, SMS, push)
# - Dead letter notifications
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
    Module      = "sns"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  # Topic names
  media_events_topic_name   = "quikapp-media-events-${var.environment}"
  alerts_topic_name         = "quikapp-alerts-${var.environment}"
  user_notifications_name   = "quikapp-user-notifications-${var.environment}"
  dlq_alerts_topic_name     = "quikapp-dlq-alerts-${var.environment}"
  export_complete_topic_name = "quikapp-export-complete-${var.environment}"
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# Media Events Topic
# =============================================================================
# Publishes events when media processing completes or fails

resource "aws_sns_topic" "media_events" {
  count = var.create_media_events_topic ? 1 : 0

  name         = local.media_events_topic_name
  display_name = "QuikApp Media Events"

  # Encryption
  kms_master_key_id = var.kms_key_arn

  # Delivery policy
  delivery_policy = jsonencode({
    http = {
      defaultHealthyRetryPolicy = {
        minDelayTarget     = 20
        maxDelayTarget     = 20
        numRetries         = 3
        numMaxDelayRetries = 0
        numNoDelayRetries  = 0
        numMinDelayRetries = 0
        backoffFunction    = "linear"
      }
      disableSubscriptionOverrides = false
    }
  })

  tags = merge(local.common_tags, {
    Name    = "QuikApp Media Events Topic"
    Purpose = "media-processing-events"
  })
}

# FIFO variant for ordered media events
resource "aws_sns_topic" "media_events_fifo" {
  count = var.create_media_events_fifo_topic ? 1 : 0

  name                        = "${local.media_events_topic_name}.fifo"
  display_name                = "QuikApp Media Events FIFO"
  fifo_topic                  = true
  content_based_deduplication = var.fifo_content_deduplication

  kms_master_key_id = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Media Events FIFO Topic"
    Purpose = "media-processing-events"
    Type    = "FIFO"
  })
}

# =============================================================================
# System Alerts Topic
# =============================================================================
# For CloudWatch alarms, infrastructure alerts, and operational notifications

resource "aws_sns_topic" "alerts" {
  count = var.create_alerts_topic ? 1 : 0

  name         = local.alerts_topic_name
  display_name = "QuikApp Alerts"

  kms_master_key_id = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Alerts Topic"
    Purpose = "system-alerts"
  })
}

# Email subscriptions for alerts
resource "aws_sns_topic_subscription" "alerts_email" {
  for_each = var.create_alerts_topic ? toset(var.alert_email_endpoints) : toset([])

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

# SMS subscriptions for critical alerts
resource "aws_sns_topic_subscription" "alerts_sms" {
  for_each = var.create_alerts_topic ? toset(var.alert_sms_endpoints) : toset([])

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "sms"
  endpoint  = each.value
}

# =============================================================================
# User Notifications Topic
# =============================================================================
# For user-facing notifications (processed by notification service)

resource "aws_sns_topic" "user_notifications" {
  count = var.create_user_notifications_topic ? 1 : 0

  name         = local.user_notifications_name
  display_name = "QuikApp User Notifications"

  kms_master_key_id = var.kms_key_arn

  # Higher retry for user notifications
  delivery_policy = jsonencode({
    http = {
      defaultHealthyRetryPolicy = {
        minDelayTarget     = 5
        maxDelayTarget     = 60
        numRetries         = 5
        numMaxDelayRetries = 2
        numNoDelayRetries  = 1
        numMinDelayRetries = 2
        backoffFunction    = "exponential"
      }
      disableSubscriptionOverrides = false
    }
  })

  tags = merge(local.common_tags, {
    Name    = "QuikApp User Notifications Topic"
    Purpose = "user-notifications"
  })
}

# SQS subscription for user notifications (fan-out to notification queue)
resource "aws_sns_topic_subscription" "user_notifications_sqs" {
  count = var.create_user_notifications_topic && var.notification_queue_arn != null ? 1 : 0

  topic_arn = aws_sns_topic.user_notifications[0].arn
  protocol  = "sqs"
  endpoint  = var.notification_queue_arn

  # Enable raw message delivery for SQS
  raw_message_delivery = var.enable_raw_message_delivery
}

# =============================================================================
# Dead Letter Queue Alerts Topic
# =============================================================================
# Notifications when messages end up in DLQs

resource "aws_sns_topic" "dlq_alerts" {
  count = var.create_dlq_alerts_topic ? 1 : 0

  name         = local.dlq_alerts_topic_name
  display_name = "QuikApp DLQ Alerts"

  kms_master_key_id = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp DLQ Alerts Topic"
    Purpose = "dlq-alerts"
  })
}

# Email subscriptions for DLQ alerts
resource "aws_sns_topic_subscription" "dlq_alerts_email" {
  for_each = var.create_dlq_alerts_topic ? toset(var.dlq_alert_email_endpoints) : toset([])

  topic_arn = aws_sns_topic.dlq_alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

# =============================================================================
# Export Complete Topic
# =============================================================================
# Notifications when data exports complete

resource "aws_sns_topic" "export_complete" {
  count = var.create_export_complete_topic ? 1 : 0

  name         = local.export_complete_topic_name
  display_name = "QuikApp Export Complete"

  kms_master_key_id = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name    = "QuikApp Export Complete Topic"
    Purpose = "export-notifications"
  })
}

# =============================================================================
# Platform Applications (Mobile Push)
# =============================================================================

# Apple Push Notification Service (APNs)
resource "aws_sns_platform_application" "apns" {
  count = var.create_mobile_push_platforms && var.apns_credentials != null ? 1 : 0

  name                = "quikapp-apns-${var.environment}"
  platform            = var.apns_use_sandbox ? "APNS_SANDBOX" : "APNS"
  platform_credential = var.apns_credentials.private_key
  platform_principal  = var.apns_credentials.certificate

  # Event destinations
  success_feedback_sample_rate = var.push_success_sample_rate
  success_feedback_role_arn    = var.push_feedback_role_arn
  failure_feedback_role_arn    = var.push_feedback_role_arn
}

# Firebase Cloud Messaging (FCM) for Android
resource "aws_sns_platform_application" "fcm" {
  count = var.create_mobile_push_platforms && var.fcm_api_key != null ? 1 : 0

  name                = "quikapp-fcm-${var.environment}"
  platform            = "GCM"
  platform_credential = var.fcm_api_key

  success_feedback_sample_rate = var.push_success_sample_rate
  success_feedback_role_arn    = var.push_feedback_role_arn
  failure_feedback_role_arn    = var.push_feedback_role_arn
}

# =============================================================================
# SMS Configuration
# =============================================================================

resource "aws_sns_sms_preferences" "sms_prefs" {
  count = var.configure_sms_preferences ? 1 : 0

  monthly_spend_limit                   = var.sms_monthly_spend_limit
  default_sender_id                     = var.sms_sender_id
  default_sms_type                      = var.sms_default_type
  usage_report_s3_bucket                = var.sms_usage_report_bucket
  delivery_status_iam_role_arn          = var.sms_delivery_status_role_arn
  delivery_status_success_sampling_rate = var.sms_success_sampling_rate
}
