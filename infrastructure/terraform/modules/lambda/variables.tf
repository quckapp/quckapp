# =============================================================================
# Lambda Module Variables
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

variable "media_bucket_name" {
  description = "Name of the S3 media bucket"
  type        = string
}

variable "media_bucket_arn" {
  description = "ARN of the S3 media bucket"
  type        = string
}

# -----------------------------------------------------------------------------
# Optional Variables - S3 Configuration
# -----------------------------------------------------------------------------

variable "thumbnails_bucket_name" {
  description = "Name of the S3 thumbnails bucket (defaults to media bucket)"
  type        = string
  default     = null
}

variable "thumbnails_bucket_arn" {
  description = "ARN of the S3 thumbnails bucket"
  type        = string
  default     = null
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for S3 encryption"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - Function Creation Flags
# -----------------------------------------------------------------------------

variable "create_thumbnail_generator" {
  description = "Create the thumbnail generator Lambda function"
  type        = bool
  default     = true
}

variable "create_video_thumbnail" {
  description = "Create the video thumbnail Lambda function"
  type        = bool
  default     = false
}

variable "create_image_optimizer" {
  description = "Create the image optimizer Lambda function"
  type        = bool
  default     = false
}

variable "create_s3_triggers" {
  description = "Create S3 event triggers for Lambda functions"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Optional Variables - Lambda Runtime
# -----------------------------------------------------------------------------

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
}

# -----------------------------------------------------------------------------
# Optional Variables - Thumbnail Generator
# -----------------------------------------------------------------------------

variable "thumbnail_lambda_zip_path" {
  description = "Path to the thumbnail generator Lambda zip file"
  type        = string
  default     = null
}

variable "thumbnail_lambda_hash" {
  description = "Base64 SHA256 hash of the thumbnail Lambda zip"
  type        = string
  default     = null
}

variable "thumbnail_lambda_handler" {
  description = "Handler for the thumbnail generator Lambda"
  type        = string
  default     = "index.handler"
}

variable "thumbnail_memory_size" {
  description = "Memory size for thumbnail generator (MB)"
  type        = number
  default     = 1024
}

variable "thumbnail_timeout" {
  description = "Timeout for thumbnail generator (seconds)"
  type        = number
  default     = 30
}

variable "thumbnail_reserved_concurrency" {
  description = "Reserved concurrent executions for thumbnail generator"
  type        = number
  default     = 50
}

variable "thumbnail_layer_arns" {
  description = "List of Lambda layer ARNs for thumbnail generator"
  type        = list(string)
  default     = []
}

variable "thumbnail_extra_env_vars" {
  description = "Extra environment variables for thumbnail generator"
  type        = map(string)
  default     = {}
}

variable "thumbnail_sizes" {
  description = "Thumbnail sizes to generate"
  type = list(object({
    name   = string
    width  = number
    height = number
  }))
  default = [
    { name = "small", width = 150, height = 150 },
    { name = "medium", width = 300, height = 300 },
    { name = "large", width = 600, height = 600 }
  ]
}

variable "thumbnail_output_format" {
  description = "Output format for thumbnails (webp, jpeg, png)"
  type        = string
  default     = "webp"
}

variable "thumbnail_output_quality" {
  description = "Output quality for thumbnails (1-100)"
  type        = number
  default     = 85
}

# -----------------------------------------------------------------------------
# Optional Variables - Video Thumbnail
# -----------------------------------------------------------------------------

variable "video_thumbnail_lambda_zip_path" {
  description = "Path to the video thumbnail Lambda zip file"
  type        = string
  default     = null
}

variable "video_thumbnail_lambda_hash" {
  description = "Base64 SHA256 hash of the video thumbnail Lambda zip"
  type        = string
  default     = null
}

variable "video_thumbnail_lambda_handler" {
  description = "Handler for the video thumbnail Lambda"
  type        = string
  default     = "index.handler"
}

variable "video_thumbnail_memory_size" {
  description = "Memory size for video thumbnail (MB)"
  type        = number
  default     = 2048
}

variable "video_thumbnail_timeout" {
  description = "Timeout for video thumbnail (seconds)"
  type        = number
  default     = 60
}

variable "video_thumbnail_reserved_concurrency" {
  description = "Reserved concurrent executions for video thumbnail"
  type        = number
  default     = 20
}

variable "video_thumbnail_layer_arns" {
  description = "List of Lambda layer ARNs for video thumbnail (FFmpeg)"
  type        = list(string)
  default     = []
}

variable "video_thumbnail_extra_env_vars" {
  description = "Extra environment variables for video thumbnail"
  type        = map(string)
  default     = {}
}

variable "video_frame_positions" {
  description = "Frame positions to extract from videos (seconds)"
  type        = list(number)
  default     = [1, 5, 10]
}

variable "video_ephemeral_storage_size" {
  description = "Ephemeral storage size for video processing (MB)"
  type        = number
  default     = 2048
}

# -----------------------------------------------------------------------------
# Optional Variables - Image Optimizer
# -----------------------------------------------------------------------------

variable "optimizer_lambda_zip_path" {
  description = "Path to the image optimizer Lambda zip file"
  type        = string
  default     = null
}

variable "optimizer_lambda_hash" {
  description = "Base64 SHA256 hash of the image optimizer Lambda zip"
  type        = string
  default     = null
}

variable "optimizer_lambda_handler" {
  description = "Handler for the image optimizer Lambda"
  type        = string
  default     = "index.handler"
}

variable "optimizer_memory_size" {
  description = "Memory size for image optimizer (MB)"
  type        = number
  default     = 1536
}

variable "optimizer_timeout" {
  description = "Timeout for image optimizer (seconds)"
  type        = number
  default     = 30
}

variable "optimizer_reserved_concurrency" {
  description = "Reserved concurrent executions for image optimizer"
  type        = number
  default     = 30
}

variable "optimizer_layer_arns" {
  description = "List of Lambda layer ARNs for image optimizer"
  type        = list(string)
  default     = []
}

variable "optimizer_extra_env_vars" {
  description = "Extra environment variables for image optimizer"
  type        = map(string)
  default     = {}
}

variable "webp_quality" {
  description = "WebP output quality (1-100)"
  type        = number
  default     = 85
}

variable "avif_quality" {
  description = "AVIF output quality (1-100)"
  type        = number
  default     = 80
}

variable "optimizer_max_width" {
  description = "Maximum width for optimized images"
  type        = number
  default     = 2048
}

variable "optimizer_max_height" {
  description = "Maximum height for optimized images"
  type        = number
  default     = 2048
}

# -----------------------------------------------------------------------------
# Optional Variables - Common Lambda Configuration
# -----------------------------------------------------------------------------

variable "ephemeral_storage_size" {
  description = "Ephemeral storage size (MB)"
  type        = number
  default     = 512
}

variable "log_level" {
  description = "Log level for Lambda functions"
  type        = string
  default     = "INFO"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = false
}

variable "enable_function_url" {
  description = "Enable Lambda function URL for testing"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Optional Variables - VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_subnet_ids" {
  description = "List of VPC subnet IDs for Lambda functions"
  type        = list(string)
  default     = null
}

variable "vpc_security_group_ids" {
  description = "List of VPC security group IDs for Lambda functions"
  type        = list(string)
  default     = null
}

# -----------------------------------------------------------------------------
# Optional Variables - SQS Integration
# -----------------------------------------------------------------------------

variable "sqs_queue_arn" {
  description = "ARN of SQS queue for async processing"
  type        = string
  default     = null
}

variable "dead_letter_queue_arn" {
  description = "ARN of dead letter queue"
  type        = string
  default     = null
}

variable "sqs_batch_size" {
  description = "SQS batch size"
  type        = number
  default     = 10
}

variable "sqs_batch_window" {
  description = "SQS batch window in seconds"
  type        = number
  default     = 5
}

variable "sqs_max_concurrency" {
  description = "Maximum concurrency for SQS trigger"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# Optional Variables - CORS
# -----------------------------------------------------------------------------

variable "cors_allowed_origins" {
  description = "Allowed origins for Lambda function URL CORS"
  type        = list(string)
  default     = ["*"]
}

# -----------------------------------------------------------------------------
# Optional Variables - Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
