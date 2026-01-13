# =============================================================================
# QA Environment Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "quikapp"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "qa"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------

variable "enable_vpc" {
  description = "Enable VPC creation"
  type        = bool
  default     = true
}

variable "enable_rds" {
  description = "Enable RDS creation"
  type        = bool
  default     = true
}

variable "enable_elasticache" {
  description = "Enable ElastiCache creation"
  type        = bool
  default     = true
}

variable "enable_cognito" {
  description = "Enable Cognito creation"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.1.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "existing_vpc_id" {
  description = "Existing VPC ID (if not creating new)"
  type        = string
  default     = ""
}

variable "existing_subnet_ids" {
  description = "Existing subnet IDs (if not creating new)"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["https://qa.quikapp.com", "https://qa-app.quikapp.com"]
}

variable "cognito_callback_urls" {
  description = "Cognito callback URLs"
  type        = list(string)
  default     = ["https://qa.quikapp.com/callback"]
}

variable "cognito_logout_urls" {
  description = "Cognito logout URLs"
  type        = list(string)
  default     = ["https://qa.quikapp.com/logout"]
}
