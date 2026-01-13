# =============================================================================
# SNS Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Media Events Topic
# -----------------------------------------------------------------------------

output "media_events_topic_arn" {
  description = "ARN of the media events topic"
  value       = var.create_media_events_topic ? aws_sns_topic.media_events[0].arn : null
}

output "media_events_topic_name" {
  description = "Name of the media events topic"
  value       = var.create_media_events_topic ? aws_sns_topic.media_events[0].name : null
}

output "media_events_fifo_topic_arn" {
  description = "ARN of the media events FIFO topic"
  value       = var.create_media_events_fifo_topic ? aws_sns_topic.media_events_fifo[0].arn : null
}

# -----------------------------------------------------------------------------
# Alerts Topic
# -----------------------------------------------------------------------------

output "alerts_topic_arn" {
  description = "ARN of the system alerts topic"
  value       = var.create_alerts_topic ? aws_sns_topic.alerts[0].arn : null
}

output "alerts_topic_name" {
  description = "Name of the system alerts topic"
  value       = var.create_alerts_topic ? aws_sns_topic.alerts[0].name : null
}

# -----------------------------------------------------------------------------
# User Notifications Topic
# -----------------------------------------------------------------------------

output "user_notifications_topic_arn" {
  description = "ARN of the user notifications topic"
  value       = var.create_user_notifications_topic ? aws_sns_topic.user_notifications[0].arn : null
}

output "user_notifications_topic_name" {
  description = "Name of the user notifications topic"
  value       = var.create_user_notifications_topic ? aws_sns_topic.user_notifications[0].name : null
}

# -----------------------------------------------------------------------------
# DLQ Alerts Topic
# -----------------------------------------------------------------------------

output "dlq_alerts_topic_arn" {
  description = "ARN of the DLQ alerts topic"
  value       = var.create_dlq_alerts_topic ? aws_sns_topic.dlq_alerts[0].arn : null
}

output "dlq_alerts_topic_name" {
  description = "Name of the DLQ alerts topic"
  value       = var.create_dlq_alerts_topic ? aws_sns_topic.dlq_alerts[0].name : null
}

# -----------------------------------------------------------------------------
# Export Complete Topic
# -----------------------------------------------------------------------------

output "export_complete_topic_arn" {
  description = "ARN of the export complete topic"
  value       = var.create_export_complete_topic ? aws_sns_topic.export_complete[0].arn : null
}

output "export_complete_topic_name" {
  description = "Name of the export complete topic"
  value       = var.create_export_complete_topic ? aws_sns_topic.export_complete[0].name : null
}

# -----------------------------------------------------------------------------
# Mobile Push Platform Applications
# -----------------------------------------------------------------------------

output "apns_platform_application_arn" {
  description = "ARN of the APNs platform application"
  value       = var.create_mobile_push_platforms && var.apns_credentials != null ? aws_sns_platform_application.apns[0].arn : null
}

output "fcm_platform_application_arn" {
  description = "ARN of the FCM platform application"
  value       = var.create_mobile_push_platforms && var.fcm_api_key != null ? aws_sns_platform_application.fcm[0].arn : null
}

# -----------------------------------------------------------------------------
# Aggregate Outputs
# -----------------------------------------------------------------------------

output "all_topic_arns" {
  description = "Map of all topic ARNs"
  value = {
    media_events       = var.create_media_events_topic ? aws_sns_topic.media_events[0].arn : null
    media_events_fifo  = var.create_media_events_fifo_topic ? aws_sns_topic.media_events_fifo[0].arn : null
    alerts             = var.create_alerts_topic ? aws_sns_topic.alerts[0].arn : null
    user_notifications = var.create_user_notifications_topic ? aws_sns_topic.user_notifications[0].arn : null
    dlq_alerts         = var.create_dlq_alerts_topic ? aws_sns_topic.dlq_alerts[0].arn : null
    export_complete    = var.create_export_complete_topic ? aws_sns_topic.export_complete[0].arn : null
  }
}

output "all_topic_names" {
  description = "Map of all topic names"
  value = {
    media_events       = var.create_media_events_topic ? aws_sns_topic.media_events[0].name : null
    media_events_fifo  = var.create_media_events_fifo_topic ? aws_sns_topic.media_events_fifo[0].name : null
    alerts             = var.create_alerts_topic ? aws_sns_topic.alerts[0].name : null
    user_notifications = var.create_user_notifications_topic ? aws_sns_topic.user_notifications[0].name : null
    dlq_alerts         = var.create_dlq_alerts_topic ? aws_sns_topic.dlq_alerts[0].name : null
    export_complete    = var.create_export_complete_topic ? aws_sns_topic.export_complete[0].name : null
  }
}

# -----------------------------------------------------------------------------
# Integration Configuration
# -----------------------------------------------------------------------------

output "notification_config" {
  description = "Notification configuration for application integration"
  value = {
    media_events = var.create_media_events_topic ? {
      topic_arn  = aws_sns_topic.media_events[0].arn
      topic_name = aws_sns_topic.media_events[0].name
    } : null
    user_notifications = var.create_user_notifications_topic ? {
      topic_arn  = aws_sns_topic.user_notifications[0].arn
      topic_name = aws_sns_topic.user_notifications[0].name
    } : null
    alerts = var.create_alerts_topic ? {
      topic_arn  = aws_sns_topic.alerts[0].arn
      topic_name = aws_sns_topic.alerts[0].name
    } : null
  }
  sensitive = true
}

output "mobile_push_config" {
  description = "Mobile push configuration for application integration"
  value = {
    apns_arn = var.create_mobile_push_platforms && var.apns_credentials != null ? aws_sns_platform_application.apns[0].arn : null
    fcm_arn  = var.create_mobile_push_platforms && var.fcm_api_key != null ? aws_sns_platform_application.fcm[0].arn : null
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# CloudWatch/Alarm Integration
# -----------------------------------------------------------------------------

output "alarm_topic_arns" {
  description = "Topic ARNs for CloudWatch alarm actions"
  value = compact([
    var.create_alerts_topic ? aws_sns_topic.alerts[0].arn : "",
    var.create_dlq_alerts_topic ? aws_sns_topic.dlq_alerts[0].arn : "",
  ])
}
