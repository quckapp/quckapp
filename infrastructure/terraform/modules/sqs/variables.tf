# =============================================================================
# SQS Module Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Queue Creation Flags
# -----------------------------------------------------------------------------

variable "create_media_processing_queue" {
  description = "Whether to create the media processing queue"
  type        = bool
  default     = true
}

variable "create_thumbnail_queue" {
  description = "Whether to create the thumbnail processing queue"
  type        = bool
  default     = true
}

variable "create_video_processing_queue" {
  description = "Whether to create the video processing queue"
  type        = bool
  default     = true
}

variable "create_notification_queue" {
  description = "Whether to create the notification queue"
  type        = bool
  default     = true
}

variable "create_export_queue" {
  description = "Whether to create the export queue"
  type        = bool
  default     = false
}

variable "create_fifo_queue" {
  description = "Whether to create the FIFO ordered processing queue"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Encryption
# -----------------------------------------------------------------------------

variable "kms_key_arn" {
  description = "ARN of KMS key for queue encryption. If null, uses SQS-managed encryption"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Dead Letter Queue Settings
# -----------------------------------------------------------------------------

variable "dlq_message_retention_seconds" {
  description = "Message retention period for DLQs (seconds)"
  type        = number
  default     = 1209600  # 14 days
}

variable "dlq_visibility_timeout" {
  description = "Visibility timeout for DLQs (seconds)"
  type        = number
  default     = 300  # 5 minutes
}

# -----------------------------------------------------------------------------
# Common Queue Settings
# -----------------------------------------------------------------------------

variable "max_message_size" {
  description = "Maximum message size in bytes (1024-262144)"
  type        = number
  default     = 262144  # 256 KB
}

variable "message_retention_seconds" {
  description = "Default message retention period (seconds)"
  type        = number
  default     = 345600  # 4 days
}

variable "receive_wait_time_seconds" {
  description = "Long polling wait time (seconds)"
  type        = number
  default     = 20  # Maximum for long polling
}

variable "max_receive_count" {
  description = "Number of receives before message goes to DLQ"
  type        = number
  default     = 3
}

# -----------------------------------------------------------------------------
# Media Processing Queue Settings
# -----------------------------------------------------------------------------

variable "media_queue_delay_seconds" {
  description = "Delay before messages become available in media queue"
  type        = number
  default     = 0
}

variable "media_queue_visibility_timeout" {
  description = "Visibility timeout for media processing queue (seconds)"
  type        = number
  default     = 300  # 5 minutes - should be >= 6x Lambda timeout
}

# -----------------------------------------------------------------------------
# Thumbnail Queue Settings
# -----------------------------------------------------------------------------

variable "thumbnail_queue_visibility_timeout" {
  description = "Visibility timeout for thumbnail queue (seconds)"
  type        = number
  default     = 60  # 1 minute - thumbnails are quick
}

# -----------------------------------------------------------------------------
# Video Processing Queue Settings
# -----------------------------------------------------------------------------

variable "video_queue_delay_seconds" {
  description = "Delay before messages become available in video queue"
  type        = number
  default     = 0
}

variable "video_queue_visibility_timeout" {
  description = "Visibility timeout for video processing queue (seconds)"
  type        = number
  default     = 900  # 15 minutes - videos take longer
}

# -----------------------------------------------------------------------------
# Notification Queue Settings
# -----------------------------------------------------------------------------

variable "notification_retention_seconds" {
  description = "Message retention for notification queue (seconds)"
  type        = number
  default     = 86400  # 1 day - notifications are time-sensitive
}

variable "notification_queue_visibility_timeout" {
  description = "Visibility timeout for notification queue (seconds)"
  type        = number
  default     = 30  # 30 seconds
}

variable "notification_max_receive_count" {
  description = "Max receives before notification goes to DLQ"
  type        = number
  default     = 5  # More retries for notifications
}

# -----------------------------------------------------------------------------
# Export Queue Settings
# -----------------------------------------------------------------------------

variable "export_queue_delay_seconds" {
  description = "Delay before messages become available in export queue"
  type        = number
  default     = 0
}

variable "export_retention_seconds" {
  description = "Message retention for export queue (seconds)"
  type        = number
  default     = 604800  # 7 days - exports may take time
}

variable "export_queue_visibility_timeout" {
  description = "Visibility timeout for export queue (seconds)"
  type        = number
  default     = 3600  # 1 hour - exports are long-running
}

# -----------------------------------------------------------------------------
# FIFO Queue Settings
# -----------------------------------------------------------------------------

variable "fifo_content_deduplication" {
  description = "Enable content-based deduplication for FIFO queue"
  type        = bool
  default     = true
}

variable "fifo_deduplication_scope" {
  description = "Deduplication scope (messageGroup or queue)"
  type        = string
  default     = "messageGroup"
}

variable "fifo_throughput_limit" {
  description = "FIFO throughput limit (perQueue or perMessageGroupId)"
  type        = string
  default     = "perMessageGroupId"
}

variable "fifo_visibility_timeout" {
  description = "Visibility timeout for FIFO queue (seconds)"
  type        = number
  default     = 300  # 5 minutes
}

# -----------------------------------------------------------------------------
# Access Control
# -----------------------------------------------------------------------------

variable "s3_bucket_arns" {
  description = "List of S3 bucket ARNs allowed to send messages"
  type        = list(string)
  default     = []
}

variable "lambda_role_arns" {
  description = "List of Lambda role ARNs allowed to process messages"
  type        = list(string)
  default     = null
}

variable "application_role_arns" {
  description = "List of application role ARNs allowed to send/receive messages"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms for queues"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify on alarm (SNS topics)"
  type        = list(string)
  default     = []
}

variable "dlq_message_threshold" {
  description = "Threshold for DLQ message count alarm"
  type        = number
  default     = 10
}

variable "queue_age_threshold_seconds" {
  description = "Threshold for oldest message age alarm (seconds)"
  type        = number
  default     = 3600  # 1 hour
}
