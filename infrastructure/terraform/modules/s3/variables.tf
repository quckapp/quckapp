# =============================================================================
# S3 Module Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Required Variables
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, qa, uat, staging, prod, live)"
  type        = string

  validation {
    condition     = contains(["dev", "qa", "uat", "staging", "prod", "live"], var.environment)
    error_message = "Environment must be one of: dev, qa, uat, staging, prod, live."
  }
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
}

# -----------------------------------------------------------------------------
# Optional Variables - Encryption
# -----------------------------------------------------------------------------

variable "kms_key_arn" {
  description = "ARN of the KMS key for server-side encryption. If null, AES-256 is used."
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - Versioning & Logging
# -----------------------------------------------------------------------------

variable "enable_versioning" {
  description = "Enable versioning on the media bucket"
  type        = bool
  default     = true
}

variable "create_logs_bucket" {
  description = "Create a separate bucket for access logs"
  type        = bool
  default     = true
}

variable "create_thumbnails_bucket" {
  description = "Create a separate bucket for thumbnails"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Optional Variables - CloudFront Integration
# -----------------------------------------------------------------------------

variable "cloudfront_oac_id" {
  description = "CloudFront Origin Access Control ID for bucket policy"
  type        = string
  default     = null
}

variable "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN for bucket policy condition"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - Lifecycle Rules
# -----------------------------------------------------------------------------

variable "lifecycle_rules" {
  description = "Lifecycle rules for different media types"
  type = object({
    photos = object({
      transition_to_ia_days      = number
      transition_to_glacier_days = optional(number)
      expiration_days            = optional(number)
    })
    videos = object({
      transition_to_ia_days      = number
      transition_to_glacier_days = optional(number)
      expiration_days            = optional(number)
    })
    voice = object({
      transition_to_ia_days = number
      expiration_days       = optional(number)
    })
    files = object({
      transition_to_ia_days      = number
      transition_to_glacier_days = optional(number)
      expiration_days            = optional(number)
    })
  })

  default = {
    photos = {
      transition_to_ia_days      = 30
      transition_to_glacier_days = 90
      expiration_days            = 365
    }
    videos = {
      transition_to_ia_days      = 7
      transition_to_glacier_days = 30
      expiration_days            = 180
    }
    voice = {
      transition_to_ia_days = 7
      expiration_days       = 30
    }
    files = {
      transition_to_ia_days      = 30
      transition_to_glacier_days = 90
      expiration_days            = null
    }
  }
}

variable "noncurrent_version_expiration_days" {
  description = "Days after which noncurrent object versions expire"
  type        = number
  default     = 30
}

variable "abort_incomplete_multipart_days" {
  description = "Days after which incomplete multipart uploads are aborted"
  type        = number
  default     = 7
}

variable "thumbnails_expiration_days" {
  description = "Days after which thumbnails expire"
  type        = number
  default     = 7
}

variable "logs_expiration_days" {
  description = "Days after which access logs expire"
  type        = number
  default     = 90
}

# -----------------------------------------------------------------------------
# Optional Variables - Intelligent Tiering
# -----------------------------------------------------------------------------

variable "enable_intelligent_tiering" {
  description = "Enable S3 Intelligent-Tiering for automatic cost optimization"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Optional Variables - Replication
# -----------------------------------------------------------------------------

variable "enable_replication" {
  description = "Enable cross-region replication"
  type        = bool
  default     = false
}

variable "replication_destination_bucket_arn" {
  description = "ARN of the destination bucket for replication"
  type        = string
  default     = null
}

variable "replication_destination_kms_key_arn" {
  description = "ARN of the KMS key in the destination region"
  type        = string
  default     = null
}

variable "replication_role_arn" {
  description = "ARN of the IAM role for replication"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - Event Notifications
# -----------------------------------------------------------------------------

variable "enable_event_notifications" {
  description = "Enable S3 event notifications"
  type        = bool
  default     = false
}

variable "lambda_thumbnail_arn" {
  description = "ARN of the Lambda function for thumbnail generation"
  type        = string
  default     = null
}

variable "sqs_queue_arn" {
  description = "ARN of the SQS queue for media processing notifications"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
