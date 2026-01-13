# =============================================================================
# DynamoDB Module Variables
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
# Table Creation Flags
# -----------------------------------------------------------------------------

variable "create_media_metadata_table" {
  description = "Whether to create the media metadata table"
  type        = bool
  default     = true
}

variable "create_user_sessions_table" {
  description = "Whether to create the user sessions table"
  type        = bool
  default     = true
}

variable "create_notifications_table" {
  description = "Whether to create the notifications table"
  type        = bool
  default     = true
}

variable "create_export_jobs_table" {
  description = "Whether to create the export jobs table"
  type        = bool
  default     = false
}

variable "create_rate_limiting_table" {
  description = "Whether to create the rate limiting table"
  type        = bool
  default     = true
}

variable "create_conversations_table" {
  description = "Whether to create the conversations table"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Billing Mode
# -----------------------------------------------------------------------------

variable "billing_mode" {
  description = "DynamoDB billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PROVISIONED", "PAY_PER_REQUEST"], var.billing_mode)
    error_message = "Billing mode must be either 'PROVISIONED' or 'PAY_PER_REQUEST'."
  }
}

# -----------------------------------------------------------------------------
# Encryption
# -----------------------------------------------------------------------------

variable "kms_key_arn" {
  description = "ARN of KMS key for table encryption. If null, uses AWS managed key"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Provisioned Capacity - Media Metadata Table
# -----------------------------------------------------------------------------

variable "media_metadata_read_capacity" {
  description = "Read capacity units for media metadata table"
  type        = number
  default     = 10
}

variable "media_metadata_write_capacity" {
  description = "Write capacity units for media metadata table"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# Provisioned Capacity - User Sessions Table
# -----------------------------------------------------------------------------

variable "sessions_read_capacity" {
  description = "Read capacity units for user sessions table"
  type        = number
  default     = 20
}

variable "sessions_write_capacity" {
  description = "Write capacity units for user sessions table"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# Provisioned Capacity - Notifications Table
# -----------------------------------------------------------------------------

variable "notifications_read_capacity" {
  description = "Read capacity units for notifications table"
  type        = number
  default     = 10
}

variable "notifications_write_capacity" {
  description = "Write capacity units for notifications table"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# Provisioned Capacity - Export Jobs Table
# -----------------------------------------------------------------------------

variable "export_jobs_read_capacity" {
  description = "Read capacity units for export jobs table"
  type        = number
  default     = 5
}

variable "export_jobs_write_capacity" {
  description = "Write capacity units for export jobs table"
  type        = number
  default     = 5
}

# -----------------------------------------------------------------------------
# Provisioned Capacity - Conversations Table
# -----------------------------------------------------------------------------

variable "conversations_read_capacity" {
  description = "Read capacity units for conversations table"
  type        = number
  default     = 20
}

variable "conversations_write_capacity" {
  description = "Write capacity units for conversations table"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# GSI Capacity
# -----------------------------------------------------------------------------

variable "gsi_read_capacity" {
  description = "Default read capacity for global secondary indexes"
  type        = number
  default     = 10
}

variable "gsi_write_capacity" {
  description = "Default write capacity for global secondary indexes"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# Auto Scaling Configuration
# -----------------------------------------------------------------------------

variable "enable_autoscaling" {
  description = "Enable auto scaling for provisioned tables"
  type        = bool
  default     = true
}

variable "autoscaling_max_read_capacity" {
  description = "Maximum read capacity for auto scaling"
  type        = number
  default     = 1000
}

variable "autoscaling_max_write_capacity" {
  description = "Maximum write capacity for auto scaling"
  type        = number
  default     = 1000
}

variable "autoscaling_target_utilization" {
  description = "Target utilization percentage for auto scaling"
  type        = number
  default     = 70
}

variable "autoscaling_scale_in_cooldown" {
  description = "Scale in cooldown period in seconds"
  type        = number
  default     = 60
}

variable "autoscaling_scale_out_cooldown" {
  description = "Scale out cooldown period in seconds"
  type        = number
  default     = 60
}

# -----------------------------------------------------------------------------
# TTL Configuration
# -----------------------------------------------------------------------------

variable "enable_media_metadata_ttl" {
  description = "Enable TTL for media metadata table"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Backup & Recovery
# -----------------------------------------------------------------------------

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for tables"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for tables"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Streams Configuration
# -----------------------------------------------------------------------------

variable "enable_streams" {
  description = "Enable DynamoDB Streams"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "Stream view type (KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES)"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"

  validation {
    condition     = contains(["KEYS_ONLY", "NEW_IMAGE", "OLD_IMAGE", "NEW_AND_OLD_IMAGES"], var.stream_view_type)
    error_message = "Stream view type must be one of: KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES."
  }
}

# -----------------------------------------------------------------------------
# Global Tables (Multi-Region)
# -----------------------------------------------------------------------------

variable "enable_global_tables" {
  description = "Enable global tables for multi-region replication"
  type        = bool
  default     = false
}

variable "replica_region" {
  description = "Region for global table replica"
  type        = string
  default     = null
}

variable "replica_kms_key_arn" {
  description = "KMS key ARN for replica region encryption"
  type        = string
  default     = null
}
