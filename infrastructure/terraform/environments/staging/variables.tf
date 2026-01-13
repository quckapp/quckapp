# =============================================================================
# Staging Environment Variables
# =============================================================================

variable "aws_region" { type = string; default = "us-east-1" }
variable "project_name" { type = string; default = "quikapp" }
variable "environment" { type = string; default = "staging" }
variable "cost_center" { type = string; default = "engineering" }

# Feature Flags
variable "enable_vpc" { type = bool; default = true }
variable "enable_rds" { type = bool; default = true }
variable "enable_elasticache" { type = bool; default = true }
variable "enable_cognito" { type = bool; default = true }
variable "enable_cloudfront" { type = bool; default = true }
variable "enable_api_gateway" { type = bool; default = true }

# VPC
variable "vpc_cidr" { type = string; default = "10.10.0.0/16" }
variable "availability_zones" { type = list(string); default = ["us-east-1a", "us-east-1b", "us-east-1c"] }
variable "existing_vpc_id" { type = string; default = "" }
variable "existing_subnet_ids" { type = list(string); default = [] }

# Application
variable "cors_allowed_origins" {
  type    = list(string)
  default = ["https://staging.quikapp.com", "https://staging-app.quikapp.com"]
}

variable "cognito_callback_urls" {
  type    = list(string)
  default = ["https://staging.quikapp.com/callback"]
}

variable "cognito_logout_urls" {
  type    = list(string)
  default = ["https://staging.quikapp.com/logout"]
}

# CloudFront
variable "acm_certificate_arn" { type = string; default = "" }
variable "cloudfront_aliases" { type = list(string); default = ["cdn-staging.quikapp.com"] }
