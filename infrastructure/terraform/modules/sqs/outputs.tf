# =============================================================================
# SQS Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Media Processing Queue
# -----------------------------------------------------------------------------

output "media_processing_queue_id" {
  description = "ID (URL) of the media processing queue"
  value       = var.create_media_processing_queue ? aws_sqs_queue.media_processing[0].id : null
}

output "media_processing_queue_arn" {
  description = "ARN of the media processing queue"
  value       = var.create_media_processing_queue ? aws_sqs_queue.media_processing[0].arn : null
}

output "media_processing_queue_name" {
  description = "Name of the media processing queue"
  value       = var.create_media_processing_queue ? aws_sqs_queue.media_processing[0].name : null
}

output "media_processing_dlq_arn" {
  description = "ARN of the media processing dead letter queue"
  value       = var.create_media_processing_queue ? aws_sqs_queue.media_processing_dlq[0].arn : null
}

# -----------------------------------------------------------------------------
# Thumbnail Queue
# -----------------------------------------------------------------------------

output "thumbnail_queue_id" {
  description = "ID (URL) of the thumbnail queue"
  value       = var.create_thumbnail_queue ? aws_sqs_queue.thumbnail[0].id : null
}

output "thumbnail_queue_arn" {
  description = "ARN of the thumbnail queue"
  value       = var.create_thumbnail_queue ? aws_sqs_queue.thumbnail[0].arn : null
}

output "thumbnail_queue_name" {
  description = "Name of the thumbnail queue"
  value       = var.create_thumbnail_queue ? aws_sqs_queue.thumbnail[0].name : null
}

output "thumbnail_dlq_arn" {
  description = "ARN of the thumbnail dead letter queue"
  value       = var.create_thumbnail_queue ? aws_sqs_queue.thumbnail_dlq[0].arn : null
}

# -----------------------------------------------------------------------------
# Video Processing Queue
# -----------------------------------------------------------------------------

output "video_processing_queue_id" {
  description = "ID (URL) of the video processing queue"
  value       = var.create_video_processing_queue ? aws_sqs_queue.video_processing[0].id : null
}

output "video_processing_queue_arn" {
  description = "ARN of the video processing queue"
  value       = var.create_video_processing_queue ? aws_sqs_queue.video_processing[0].arn : null
}

output "video_processing_queue_name" {
  description = "Name of the video processing queue"
  value       = var.create_video_processing_queue ? aws_sqs_queue.video_processing[0].name : null
}

output "video_processing_dlq_arn" {
  description = "ARN of the video processing dead letter queue"
  value       = var.create_video_processing_queue ? aws_sqs_queue.video_processing_dlq[0].arn : null
}

# -----------------------------------------------------------------------------
# Notification Queue
# -----------------------------------------------------------------------------

output "notification_queue_id" {
  description = "ID (URL) of the notification queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notification[0].id : null
}

output "notification_queue_arn" {
  description = "ARN of the notification queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notification[0].arn : null
}

output "notification_queue_name" {
  description = "Name of the notification queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notification[0].name : null
}

output "notification_dlq_arn" {
  description = "ARN of the notification dead letter queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notification_dlq[0].arn : null
}

# -----------------------------------------------------------------------------
# Export Queue
# -----------------------------------------------------------------------------

output "export_queue_id" {
  description = "ID (URL) of the export queue"
  value       = var.create_export_queue ? aws_sqs_queue.export[0].id : null
}

output "export_queue_arn" {
  description = "ARN of the export queue"
  value       = var.create_export_queue ? aws_sqs_queue.export[0].arn : null
}

output "export_queue_name" {
  description = "Name of the export queue"
  value       = var.create_export_queue ? aws_sqs_queue.export[0].name : null
}

output "export_dlq_arn" {
  description = "ARN of the export dead letter queue"
  value       = var.create_export_queue ? aws_sqs_queue.export_dlq[0].arn : null
}

# -----------------------------------------------------------------------------
# FIFO Queue
# -----------------------------------------------------------------------------

output "fifo_queue_id" {
  description = "ID (URL) of the FIFO ordered processing queue"
  value       = var.create_fifo_queue ? aws_sqs_queue.ordered_processing[0].id : null
}

output "fifo_queue_arn" {
  description = "ARN of the FIFO ordered processing queue"
  value       = var.create_fifo_queue ? aws_sqs_queue.ordered_processing[0].arn : null
}

output "fifo_queue_name" {
  description = "Name of the FIFO ordered processing queue"
  value       = var.create_fifo_queue ? aws_sqs_queue.ordered_processing[0].name : null
}

output "fifo_dlq_arn" {
  description = "ARN of the FIFO dead letter queue"
  value       = var.create_fifo_queue ? aws_sqs_queue.ordered_processing_dlq[0].arn : null
}

# -----------------------------------------------------------------------------
# Aggregate Outputs
# -----------------------------------------------------------------------------

output "all_queue_arns" {
  description = "Map of all queue ARNs"
  value = {
    media_processing  = var.create_media_processing_queue ? aws_sqs_queue.media_processing[0].arn : null
    thumbnail         = var.create_thumbnail_queue ? aws_sqs_queue.thumbnail[0].arn : null
    video_processing  = var.create_video_processing_queue ? aws_sqs_queue.video_processing[0].arn : null
    notification      = var.create_notification_queue ? aws_sqs_queue.notification[0].arn : null
    export            = var.create_export_queue ? aws_sqs_queue.export[0].arn : null
    fifo              = var.create_fifo_queue ? aws_sqs_queue.ordered_processing[0].arn : null
  }
}

output "all_queue_urls" {
  description = "Map of all queue URLs"
  value = {
    media_processing  = var.create_media_processing_queue ? aws_sqs_queue.media_processing[0].id : null
    thumbnail         = var.create_thumbnail_queue ? aws_sqs_queue.thumbnail[0].id : null
    video_processing  = var.create_video_processing_queue ? aws_sqs_queue.video_processing[0].id : null
    notification      = var.create_notification_queue ? aws_sqs_queue.notification[0].id : null
    export            = var.create_export_queue ? aws_sqs_queue.export[0].id : null
    fifo              = var.create_fifo_queue ? aws_sqs_queue.ordered_processing[0].id : null
  }
}

output "all_dlq_arns" {
  description = "Map of all dead letter queue ARNs"
  value = {
    media_processing  = var.create_media_processing_queue ? aws_sqs_queue.media_processing_dlq[0].arn : null
    thumbnail         = var.create_thumbnail_queue ? aws_sqs_queue.thumbnail_dlq[0].arn : null
    video_processing  = var.create_video_processing_queue ? aws_sqs_queue.video_processing_dlq[0].arn : null
    notification      = var.create_notification_queue ? aws_sqs_queue.notification_dlq[0].arn : null
    export            = var.create_export_queue ? aws_sqs_queue.export_dlq[0].arn : null
    fifo              = var.create_fifo_queue ? aws_sqs_queue.ordered_processing_dlq[0].arn : null
  }
}

# -----------------------------------------------------------------------------
# Queue Configuration for Application Integration
# -----------------------------------------------------------------------------

output "queue_config" {
  description = "Queue configuration for application integration"
  value = {
    media_processing = var.create_media_processing_queue ? {
      queue_url         = aws_sqs_queue.media_processing[0].id
      queue_arn         = aws_sqs_queue.media_processing[0].arn
      dlq_arn           = aws_sqs_queue.media_processing_dlq[0].arn
      visibility_timeout = var.media_queue_visibility_timeout
    } : null
    thumbnail = var.create_thumbnail_queue ? {
      queue_url         = aws_sqs_queue.thumbnail[0].id
      queue_arn         = aws_sqs_queue.thumbnail[0].arn
      dlq_arn           = aws_sqs_queue.thumbnail_dlq[0].arn
      visibility_timeout = var.thumbnail_queue_visibility_timeout
    } : null
    video_processing = var.create_video_processing_queue ? {
      queue_url         = aws_sqs_queue.video_processing[0].id
      queue_arn         = aws_sqs_queue.video_processing[0].arn
      dlq_arn           = aws_sqs_queue.video_processing_dlq[0].arn
      visibility_timeout = var.video_queue_visibility_timeout
    } : null
    notification = var.create_notification_queue ? {
      queue_url         = aws_sqs_queue.notification[0].id
      queue_arn         = aws_sqs_queue.notification[0].arn
      dlq_arn           = aws_sqs_queue.notification_dlq[0].arn
      visibility_timeout = var.notification_queue_visibility_timeout
    } : null
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# Lambda Integration
# -----------------------------------------------------------------------------

output "lambda_event_source_arns" {
  description = "Queue ARNs for Lambda event source mappings"
  value = compact([
    var.create_media_processing_queue ? aws_sqs_queue.media_processing[0].arn : "",
    var.create_thumbnail_queue ? aws_sqs_queue.thumbnail[0].arn : "",
    var.create_video_processing_queue ? aws_sqs_queue.video_processing[0].arn : "",
  ])
}
