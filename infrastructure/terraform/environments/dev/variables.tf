# =============================================================================
# Dev Environment Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "enable_vpc" {
  description = "Enable VPC networking (optional for dev)"
  type        = bool
  default     = false
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:5173", "https://dev.quikapp.com"]
}

variable "enable_cloudfront" {
  description = "Enable CloudFront CDN (optional for dev)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------

variable "enable_lambda_thumbnails" {
  description = "Enable Lambda thumbnail generation (optional for dev)"
  type        = bool
  default     = false
}

variable "enable_lambda_s3_triggers" {
  description = "Enable S3 event triggers for Lambda functions"
  type        = bool
  default     = true
}

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

# -----------------------------------------------------------------------------
# SQS Configuration
# -----------------------------------------------------------------------------

variable "enable_sqs_queues" {
  description = "Enable SQS message queues (optional for dev)"
  type        = bool
  default     = false
}

variable "enable_sns_topics" {
  description = "Enable SNS topics (optional for dev)"
  type        = bool
  default     = false
}

variable "enable_dynamodb" {
  description = "Enable DynamoDB tables (optional for dev)"
  type        = bool
  default     = false
}

variable "enable_api_gateway" {
  description = "Enable API Gateway (optional for dev)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Cognito Configuration
# -----------------------------------------------------------------------------

variable "enable_cognito" {
  description = "Enable Cognito authentication (optional for dev)"
  type        = bool
  default     = false
}

variable "cognito_web_callback_urls" {
  description = "Callback URLs for web client"
  type        = list(string)
  default     = ["http://localhost:3000/callback", "http://localhost:5173/callback"]
}

variable "cognito_web_logout_urls" {
  description = "Logout URLs for web client"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:5173"]
}

variable "cognito_mobile_callback_urls" {
  description = "Callback URLs for mobile client (deep links)"
  type        = list(string)
  default     = ["quikapp://callback", "exp://localhost:19000/--/callback"]
}

variable "cognito_mobile_logout_urls" {
  description = "Logout URLs for mobile client"
  type        = list(string)
  default     = ["quikapp://logout", "exp://localhost:19000/--/logout"]
}

# -----------------------------------------------------------------------------
# RDS Configuration
# -----------------------------------------------------------------------------

variable "enable_rds" {
  description = "Enable RDS database (requires VPC)"
  type        = bool
  default     = false
}

variable "rds_engine" {
  description = "RDS engine type"
  type        = string
  default     = "postgres"
}

variable "rds_engine_version" {
  description = "RDS engine version"
  type        = string
  default     = "16.3"
}

# -----------------------------------------------------------------------------
# ElastiCache Configuration
# -----------------------------------------------------------------------------

variable "enable_elasticache" {
  description = "Enable ElastiCache (requires VPC)"
  type        = bool
  default     = false
}

variable "redis_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
