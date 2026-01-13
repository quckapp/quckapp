# =============================================================================
# SNS Module Variables
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
# Topic Creation Flags
# -----------------------------------------------------------------------------

variable "create_media_events_topic" {
  description = "Whether to create the media events topic"
  type        = bool
  default     = true
}

variable "create_media_events_fifo_topic" {
  description = "Whether to create the media events FIFO topic"
  type        = bool
  default     = false
}

variable "create_alerts_topic" {
  description = "Whether to create the system alerts topic"
  type        = bool
  default     = true
}

variable "create_user_notifications_topic" {
  description = "Whether to create the user notifications topic"
  type        = bool
  default     = true
}

variable "create_dlq_alerts_topic" {
  description = "Whether to create the DLQ alerts topic"
  type        = bool
  default     = true
}

variable "create_export_complete_topic" {
  description = "Whether to create the export complete topic"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Encryption
# -----------------------------------------------------------------------------

variable "kms_key_arn" {
  description = "ARN of KMS key for topic encryption. If null, uses default AWS managed key"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# FIFO Configuration
# -----------------------------------------------------------------------------

variable "fifo_content_deduplication" {
  description = "Enable content-based deduplication for FIFO topics"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Access Control
# -----------------------------------------------------------------------------

variable "application_role_arns" {
  description = "List of application role ARNs allowed to publish to topics"
  type        = list(string)
  default     = null
}

variable "lambda_role_arns" {
  description = "List of Lambda role ARNs allowed to publish to topics"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# Alert Subscriptions
# -----------------------------------------------------------------------------

variable "alert_email_endpoints" {
  description = "Email addresses to subscribe to alerts topic"
  type        = list(string)
  default     = []
}

variable "alert_sms_endpoints" {
  description = "Phone numbers to subscribe to alerts topic (E.164 format)"
  type        = list(string)
  default     = []
}

variable "dlq_alert_email_endpoints" {
  description = "Email addresses to subscribe to DLQ alerts topic"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# SQS Integration
# -----------------------------------------------------------------------------

variable "notification_queue_arn" {
  description = "ARN of the SQS notification queue for fan-out"
  type        = string
  default     = null
}

variable "enable_raw_message_delivery" {
  description = "Enable raw message delivery for SQS subscriptions"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Mobile Push Configuration
# -----------------------------------------------------------------------------

variable "create_mobile_push_platforms" {
  description = "Whether to create mobile push platform applications"
  type        = bool
  default     = false
}

variable "apns_credentials" {
  description = "APNs credentials (certificate and private key)"
  type = object({
    certificate = string
    private_key = string
  })
  default   = null
  sensitive = true
}

variable "apns_use_sandbox" {
  description = "Use APNs sandbox environment (for development)"
  type        = bool
  default     = true
}

variable "fcm_api_key" {
  description = "Firebase Cloud Messaging API key"
  type        = string
  default     = null
  sensitive   = true
}

variable "push_success_sample_rate" {
  description = "Percentage of successful push deliveries to log (0-100)"
  type        = number
  default     = 10
}

variable "push_feedback_role_arn" {
  description = "IAM role ARN for push notification feedback logging"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# SMS Configuration
# -----------------------------------------------------------------------------

variable "configure_sms_preferences" {
  description = "Whether to configure SNS SMS preferences"
  type        = bool
  default     = false
}

variable "sms_monthly_spend_limit" {
  description = "Monthly SMS spending limit in USD"
  type        = number
  default     = 100
}

variable "sms_sender_id" {
  description = "Default SMS sender ID (11 alphanumeric characters)"
  type        = string
  default     = "QuikApp"
}

variable "sms_default_type" {
  description = "Default SMS type (Promotional or Transactional)"
  type        = string
  default     = "Transactional"

  validation {
    condition     = contains(["Promotional", "Transactional"], var.sms_default_type)
    error_message = "SMS type must be either 'Promotional' or 'Transactional'."
  }
}

variable "sms_usage_report_bucket" {
  description = "S3 bucket for SMS usage reports"
  type        = string
  default     = null
}

variable "sms_delivery_status_role_arn" {
  description = "IAM role ARN for SMS delivery status logging"
  type        = string
  default     = null
}

variable "sms_success_sampling_rate" {
  description = "Percentage of successful SMS deliveries to log (0-100)"
  type        = number
  default     = 10
}
