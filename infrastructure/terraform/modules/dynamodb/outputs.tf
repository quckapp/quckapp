# =============================================================================
# DynamoDB Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Media Metadata Table
# -----------------------------------------------------------------------------

output "media_metadata_table_name" {
  description = "Name of the media metadata table"
  value       = var.create_media_metadata_table ? aws_dynamodb_table.media_metadata[0].name : null
}

output "media_metadata_table_arn" {
  description = "ARN of the media metadata table"
  value       = var.create_media_metadata_table ? aws_dynamodb_table.media_metadata[0].arn : null
}

output "media_metadata_table_id" {
  description = "ID of the media metadata table"
  value       = var.create_media_metadata_table ? aws_dynamodb_table.media_metadata[0].id : null
}

output "media_metadata_stream_arn" {
  description = "Stream ARN of the media metadata table"
  value       = var.create_media_metadata_table && var.enable_streams ? aws_dynamodb_table.media_metadata[0].stream_arn : null
}

# -----------------------------------------------------------------------------
# User Sessions Table
# -----------------------------------------------------------------------------

output "user_sessions_table_name" {
  description = "Name of the user sessions table"
  value       = var.create_user_sessions_table ? aws_dynamodb_table.user_sessions[0].name : null
}

output "user_sessions_table_arn" {
  description = "ARN of the user sessions table"
  value       = var.create_user_sessions_table ? aws_dynamodb_table.user_sessions[0].arn : null
}

output "user_sessions_table_id" {
  description = "ID of the user sessions table"
  value       = var.create_user_sessions_table ? aws_dynamodb_table.user_sessions[0].id : null
}

# -----------------------------------------------------------------------------
# Notifications Table
# -----------------------------------------------------------------------------

output "notifications_table_name" {
  description = "Name of the notifications table"
  value       = var.create_notifications_table ? aws_dynamodb_table.notifications[0].name : null
}

output "notifications_table_arn" {
  description = "ARN of the notifications table"
  value       = var.create_notifications_table ? aws_dynamodb_table.notifications[0].arn : null
}

output "notifications_table_id" {
  description = "ID of the notifications table"
  value       = var.create_notifications_table ? aws_dynamodb_table.notifications[0].id : null
}

# -----------------------------------------------------------------------------
# Export Jobs Table
# -----------------------------------------------------------------------------

output "export_jobs_table_name" {
  description = "Name of the export jobs table"
  value       = var.create_export_jobs_table ? aws_dynamodb_table.export_jobs[0].name : null
}

output "export_jobs_table_arn" {
  description = "ARN of the export jobs table"
  value       = var.create_export_jobs_table ? aws_dynamodb_table.export_jobs[0].arn : null
}

output "export_jobs_table_id" {
  description = "ID of the export jobs table"
  value       = var.create_export_jobs_table ? aws_dynamodb_table.export_jobs[0].id : null
}

# -----------------------------------------------------------------------------
# Rate Limiting Table
# -----------------------------------------------------------------------------

output "rate_limiting_table_name" {
  description = "Name of the rate limiting table"
  value       = var.create_rate_limiting_table ? aws_dynamodb_table.rate_limiting[0].name : null
}

output "rate_limiting_table_arn" {
  description = "ARN of the rate limiting table"
  value       = var.create_rate_limiting_table ? aws_dynamodb_table.rate_limiting[0].arn : null
}

output "rate_limiting_table_id" {
  description = "ID of the rate limiting table"
  value       = var.create_rate_limiting_table ? aws_dynamodb_table.rate_limiting[0].id : null
}

# -----------------------------------------------------------------------------
# Conversations Table
# -----------------------------------------------------------------------------

output "conversations_table_name" {
  description = "Name of the conversations table"
  value       = var.create_conversations_table ? aws_dynamodb_table.conversations[0].name : null
}

output "conversations_table_arn" {
  description = "ARN of the conversations table"
  value       = var.create_conversations_table ? aws_dynamodb_table.conversations[0].arn : null
}

output "conversations_table_id" {
  description = "ID of the conversations table"
  value       = var.create_conversations_table ? aws_dynamodb_table.conversations[0].id : null
}

output "conversations_stream_arn" {
  description = "Stream ARN of the conversations table"
  value       = var.create_conversations_table && var.enable_streams ? aws_dynamodb_table.conversations[0].stream_arn : null
}

# -----------------------------------------------------------------------------
# Aggregate Outputs
# -----------------------------------------------------------------------------

output "all_table_names" {
  description = "Map of all table names"
  value = {
    media_metadata = var.create_media_metadata_table ? aws_dynamodb_table.media_metadata[0].name : null
    user_sessions  = var.create_user_sessions_table ? aws_dynamodb_table.user_sessions[0].name : null
    notifications  = var.create_notifications_table ? aws_dynamodb_table.notifications[0].name : null
    export_jobs    = var.create_export_jobs_table ? aws_dynamodb_table.export_jobs[0].name : null
    rate_limiting  = var.create_rate_limiting_table ? aws_dynamodb_table.rate_limiting[0].name : null
    conversations  = var.create_conversations_table ? aws_dynamodb_table.conversations[0].name : null
  }
}

output "all_table_arns" {
  description = "Map of all table ARNs"
  value = {
    media_metadata = var.create_media_metadata_table ? aws_dynamodb_table.media_metadata[0].arn : null
    user_sessions  = var.create_user_sessions_table ? aws_dynamodb_table.user_sessions[0].arn : null
    notifications  = var.create_notifications_table ? aws_dynamodb_table.notifications[0].arn : null
    export_jobs    = var.create_export_jobs_table ? aws_dynamodb_table.export_jobs[0].arn : null
    rate_limiting  = var.create_rate_limiting_table ? aws_dynamodb_table.rate_limiting[0].arn : null
    conversations  = var.create_conversations_table ? aws_dynamodb_table.conversations[0].arn : null
  }
}

output "stream_arns" {
  description = "Map of stream ARNs for tables with streams enabled"
  value = var.enable_streams ? {
    media_metadata = var.create_media_metadata_table ? aws_dynamodb_table.media_metadata[0].stream_arn : null
    conversations  = var.create_conversations_table ? aws_dynamodb_table.conversations[0].stream_arn : null
  } : {}
}

# -----------------------------------------------------------------------------
# IAM Policy ARNs
# -----------------------------------------------------------------------------

output "table_arns_for_iam" {
  description = "List of table ARNs for IAM policy resources"
  value = compact([
    var.create_media_metadata_table ? aws_dynamodb_table.media_metadata[0].arn : "",
    var.create_media_metadata_table ? "${aws_dynamodb_table.media_metadata[0].arn}/index/*" : "",
    var.create_user_sessions_table ? aws_dynamodb_table.user_sessions[0].arn : "",
    var.create_user_sessions_table ? "${aws_dynamodb_table.user_sessions[0].arn}/index/*" : "",
    var.create_notifications_table ? aws_dynamodb_table.notifications[0].arn : "",
    var.create_notifications_table ? "${aws_dynamodb_table.notifications[0].arn}/index/*" : "",
    var.create_export_jobs_table ? aws_dynamodb_table.export_jobs[0].arn : "",
    var.create_export_jobs_table ? "${aws_dynamodb_table.export_jobs[0].arn}/index/*" : "",
    var.create_rate_limiting_table ? aws_dynamodb_table.rate_limiting[0].arn : "",
    var.create_conversations_table ? aws_dynamodb_table.conversations[0].arn : "",
    var.create_conversations_table ? "${aws_dynamodb_table.conversations[0].arn}/index/*" : "",
  ])
}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------

output "dynamodb_config" {
  description = "DynamoDB configuration for application integration"
  value = {
    tables = {
      media_metadata = var.create_media_metadata_table ? {
        name       = aws_dynamodb_table.media_metadata[0].name
        arn        = aws_dynamodb_table.media_metadata[0].arn
        stream_arn = var.enable_streams ? aws_dynamodb_table.media_metadata[0].stream_arn : null
        indexes    = ["user-index", "conversation-index", "media-type-index", "status-index"]
      } : null
      user_sessions = var.create_user_sessions_table ? {
        name    = aws_dynamodb_table.user_sessions[0].name
        arn     = aws_dynamodb_table.user_sessions[0].arn
        indexes = ["user-sessions-index", "device-sessions-index"]
      } : null
      notifications = var.create_notifications_table ? {
        name    = aws_dynamodb_table.notifications[0].name
        arn     = aws_dynamodb_table.notifications[0].arn
        indexes = ["created-at-index", "unread-index"]
      } : null
      conversations = var.create_conversations_table ? {
        name       = aws_dynamodb_table.conversations[0].name
        arn        = aws_dynamodb_table.conversations[0].arn
        stream_arn = var.enable_streams ? aws_dynamodb_table.conversations[0].stream_arn : null
        indexes    = ["participant-index"]
      } : null
    }
    region       = data.aws_region.current.name
    billing_mode = var.billing_mode
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# Auto Scaling Role
# -----------------------------------------------------------------------------

output "autoscaling_role_arn" {
  description = "ARN of the DynamoDB auto scaling IAM role"
  value       = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? aws_iam_role.dynamodb_autoscaling[0].arn : null
}
